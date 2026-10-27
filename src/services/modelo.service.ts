import { Genero, ModeloStatus, Prisma } from '@prisma/client';
import { ModeloRepository, ModeloListFilters } from '../repositories/modelo.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { cloudinaryService } from './cloudinary.service';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { toNumber } from './authorization.service';
import logger from '../utils/logger';

const GENEROS = Object.values(Genero) as string[];
const STATUS = Object.values(ModeloStatus) as string[];

const TEXTO_CAMPOS: Record<string, number> = {
  nome_completo: 100,
  nome_artistico: 100,
  cabelo: 50,
  olhos: 50,
  nacionalidade: 50,
  book_url: 255,
  experiencia: 5000,
  habilidades: 5000
};
// Só a idade e o número do sapato são inteiros; as restantes medidas aceitam decimais.
const INT_CAMPOS = ['sapato', 'idade'];
const DECIMAL_CAMPOS: Record<string, number> = {
  altura: 9.99,
  peso: 999.99,
  busto: 999.9,
  cintura: 999.9,
  quadril: 999.9,
  roupa: 999.9
};

/**
 * Allowlist dos campos editáveis de um modelo. Nunca aceita id_agencia, id_modelo,
 * foto_url/foto_public_id ou data_cadastro vindos do cliente.
 */
export const sanitizarModeloInput = (data: any, parcial: boolean): Record<string, any> => {
  const out: Record<string, any> = {};
  if (!data || typeof data !== 'object') data = {};

  for (const [campo, max] of Object.entries(TEXTO_CAMPOS)) {
    if (data[campo] === undefined) continue;
    if (data[campo] === null || data[campo] === '') {
      if (campo === 'nome_completo') throw new ValidationError('Nome completo é obrigatório');
      out[campo] = null;
      continue;
    }
    const valor = String(data[campo]).trim();
    if (valor.length > max) throw new ValidationError(`${campo} deve ter no máximo ${max} caracteres`);
    out[campo] = valor;
  }

  for (const campo of INT_CAMPOS) {
    if (data[campo] === undefined) continue;
    if (data[campo] === null || data[campo] === '') { out[campo] = null; continue; }
    const n = parseInt(String(data[campo]), 10);
    if (!Number.isFinite(n) || n < 0 || n > 1000) throw new ValidationError(`${campo} inválido`);
    out[campo] = n;
  }

  for (const [campo, max] of Object.entries(DECIMAL_CAMPOS)) {
    if (data[campo] === undefined) continue;
    if (data[campo] === null || data[campo] === '') { out[campo] = null; continue; }
    const n = Number(String(data[campo]).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > max) throw new ValidationError(`${campo} inválido`);
    out[campo] = n;
  }

  if (data.genero !== undefined) {
    if (!GENEROS.includes(data.genero)) throw new ValidationError('Género inválido');
    out.genero = data.genero;
  }

  if (data.status !== undefined) {
    if (!STATUS.includes(data.status)) throw new ValidationError(`Status inválido (use: ${STATUS.join(', ')})`);
    out.status = data.status;
  }

  if (data.redes_sociais !== undefined) {
    let redes = data.redes_sociais;
    if (typeof redes === 'string') {
      try { redes = JSON.parse(redes); } catch { throw new ValidationError('redes_sociais deve ser um objecto JSON'); }
    }
    if (redes !== null && (typeof redes !== 'object' || Array.isArray(redes))) {
      throw new ValidationError('redes_sociais deve ser um objecto JSON');
    }
    out.redes_sociais = redes === null ? Prisma.JsonNull : redes;
  }

  if (!parcial && !out.nome_completo) {
    throw new ValidationError('Nome completo é obrigatório');
  }

  return out;
};

/** Decimais -> number para o contrato. */
export const formatModelo = (m: any) => {
  if (!m) return m;
  return { ...m, altura: toNumber(m.altura), peso: toNumber(m.peso) };
};

export class ModeloService {
  constructor(
    private modeloRepository: ModeloRepository,
    private fazedorRepository: FazedorRepository
  ) { }

  /** Resolve a agência do utilizador autenticado (403 se não for agência). */
  private async getAgenciaDoUsuario(agenciaUserId: string, exigirAprovada = false) {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(agenciaUserId);
    if (!fazedor || fazedor.tipo_fazedor !== 'agencia') {
      throw new ForbiddenError('Apenas agências podem gerir modelos');
    }
    if (exigirAprovada && fazedor.status_aprovacao === 'rejeitado') {
      throw new ForbiddenError('A sua agência não está aprovada para cadastrar modelos');
    }
    const agencia = await this.fazedorRepository.findAgenciaByFazedorId(fazedor.id_fazedor);
    if (!agencia) {
      throw new NotFoundError('Perfil de agência não encontrado');
    }
    return agencia;
  }

  private async getModeloDaAgencia(id_modelo: string, agenciaUserId: string) {
    const modelo = await this.modeloRepository.findById(id_modelo);
    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }
    if (modelo.agencia.fazedor.id_usuario !== agenciaUserId) {
      throw new ForbiddenError('Você não tem permissão para alterar este modelo');
    }
    return modelo;
  }

  async criarModelo(agenciaUserId: string, data: any): Promise<any> {
    const agencia = await this.getAgenciaDoUsuario(agenciaUserId, true);
    const campos = sanitizarModeloInput(data, false);

    const modelo = await this.modeloRepository.create({
      ...(campos as any),
      id_agencia: agencia.id_agencia
    });

    logger.info(`Modelo ${modelo.nome_completo} cadastrado pela agência ${agencia.id_agencia}`);
    return formatModelo(modelo);
  }

  async criarModeloComFoto(agenciaUserId: string, data: any, imagemBuffer: Buffer): Promise<any> {
    const agencia = await this.getAgenciaDoUsuario(agenciaUserId, true);
    const campos = sanitizarModeloInput(data, false);

    const uploadResult = await cloudinaryService.uploadBuffer(imagemBuffer, {
      folder: `modelos/${agencia.id_agencia}`,
      width: 1000,
      height: 1000,
      quality: 85
    });

    const modelo = await this.modeloRepository.create({
      ...(campos as any),
      id_agencia: agencia.id_agencia,
      foto_url: uploadResult.secure_url,
      foto_public_id: uploadResult.public_id
    });

    logger.info(`Modelo ${modelo.nome_completo} cadastrado com foto pela agência ${agencia.id_agencia}`);
    return formatModelo(modelo);
  }

  /** Modelos da minha agência (todas as situações), paginado. */
  async listarMeusModelos(agenciaUserId: string, filters: ModeloListFilters, page = 1, limit = 20) {
    const agencia = await this.getAgenciaDoUsuario(agenciaUserId);
    const { items, total } = await this.modeloRepository.findMany(
      { ...filters, id_agencia: agencia.id_agencia },
      (page - 1) * limit,
      limit
    );
    return { data: items.map(formatModelo), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Compatibilidade: lista simples dos modelos da agência. */
  async listarModelosDaAgencia(agenciaUserId: string, filters?: any): Promise<any[]> {
    const agencia = await this.getAgenciaDoUsuario(agenciaUserId);
    const modelos = await this.modeloRepository.findByAgencia(agencia.id_agencia, filters);
    return modelos.map(formatModelo);
  }

  /** Listagem pública: apenas modelos activos. */
  async listarModelosPublicos(filters: ModeloListFilters, page = 1, limit = 20) {
    const { items, total } = await this.modeloRepository.findMany(
      { ...filters, status: 'ativo' },
      (page - 1) * limit,
      limit
    );
    return { data: items.map(formatModelo), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Detalhe público (sem requisições). Modelos não activos só são visíveis para a própria agência. */
  async buscarModeloPorId(id_modelo: string, viewerId?: string): Promise<any> {
    const modelo = await this.modeloRepository.findById(id_modelo);

    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }

    const souAgencia = !!viewerId && modelo.agencia.fazedor.id_usuario === viewerId;
    if (modelo.status !== 'ativo' && !souAgencia) {
      throw new NotFoundError('Modelo não encontrado');
    }

    return { ...formatModelo(modelo), sou_agencia: souAgencia };
  }

  async atualizarModelo(id_modelo: string, agenciaUserId: string, data: any): Promise<any> {
    await this.getModeloDaAgencia(id_modelo, agenciaUserId);
    const campos = sanitizarModeloInput(data, true);
    if (Object.keys(campos).length === 0) {
      throw new ValidationError('Nenhum campo válido para atualizar');
    }
    const atualizado = await this.modeloRepository.update(id_modelo, campos as any);
    return formatModelo(atualizado);
  }

  async atualizarStatus(id_modelo: string, agenciaUserId: string, status: string): Promise<any> {
    if (!STATUS.includes(status)) {
      throw new ValidationError(`Status inválido (use: ${STATUS.join(', ')})`);
    }
    await this.getModeloDaAgencia(id_modelo, agenciaUserId);
    const atualizado = await this.modeloRepository.update(id_modelo, { status: status as ModeloStatus });
    return formatModelo(atualizado);
  }

  async removerModelo(id_modelo: string, agenciaUserId: string): Promise<void> {
    const modelo = await this.getModeloDaAgencia(id_modelo, agenciaUserId);

    await this.modeloRepository.delete(id_modelo);

    // Limpeza de media em segundo plano (falhas não afectam a resposta)
    const publicIds = [
      modelo.foto_public_id,
      ...modelo.portfolio.map(p => p.imagem_public_id)
    ].filter((id): id is string => !!id);
    if (publicIds.length > 0) {
      cloudinaryService.deleteMultipleFiles(publicIds)
        .catch(err => logger.warn(`Falha ao apagar media do modelo ${id_modelo}:`, err?.message ?? err));
    }
  }

  async adicionarFotoPortfolio(
    id_modelo: string,
    agenciaUserId: string,
    imagemBuffer: Buffer,
    titulo?: string,
    descricao?: string,
    categoria?: string
  ): Promise<any> {
    const resultado = await this.adicionarFotosPortfolio(id_modelo, agenciaUserId, [imagemBuffer], { titulo, descricao, categoria });
    return resultado[0];
  }

  async adicionarFotosPortfolio(
    id_modelo: string,
    agenciaUserId: string,
    buffers: Buffer[],
    meta: { titulo?: string; descricao?: string; categoria?: string } = {}
  ): Promise<any[]> {
    await this.getModeloDaAgencia(id_modelo, agenciaUserId);

    if (buffers.length === 0) {
      throw new ValidationError('Nenhuma imagem enviada');
    }

    const existentes = await this.modeloRepository.countFotosPortfolio(id_modelo);
    if (existentes + buffers.length > 50) {
      throw new ValidationError('Máximo de 50 fotos por modelo');
    }

    const uploads = await Promise.all(
      buffers.map(buffer => cloudinaryService.uploadBuffer(buffer, {
        folder: `modelos/${id_modelo}`,
        width: 1000,
        height: 1000,
        quality: 85
      }))
    );

    const fotos = [];
    for (let i = 0; i < uploads.length; i++) {
      fotos.push(await this.modeloRepository.addFotoPortfolio({
        id_modelo,
        imagem_url: uploads[i].secure_url,
        imagem_public_id: uploads[i].public_id,
        titulo: meta.titulo?.slice(0, 100),
        descricao: meta.descricao,
        categoria: meta.categoria?.slice(0, 50),
        ordem: existentes + i
      }));
    }
    return fotos;
  }

  async removerFotoPortfolio(id_modelo: string, id_foto: string, agenciaUserId: string): Promise<void> {
    await this.getModeloDaAgencia(id_modelo, agenciaUserId);
    const foto = await this.modeloRepository.findFotoPortfolio(id_foto);
    if (!foto || foto.id_modelo !== id_modelo) {
      throw new NotFoundError('Foto não encontrada');
    }
    await this.modeloRepository.deleteFotoPortfolio(id_foto);
    cloudinaryService.deleteFile(foto.imagem_public_id)
      .catch(err => logger.warn(`Falha ao apagar foto ${id_foto} do Cloudinary:`, err?.message ?? err));
  }
}
