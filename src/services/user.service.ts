// backend/src/services/user.service.ts
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { UpdateUserDto, UpdatePasswordDto } from '../dtos/user.dto';
import { compararSenha, hashSenha } from '../utils/bcrypt';
import { revokeAllUserTokens } from '../utils/jwt';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import prisma from '../config/database'; // ✅ Importar diretamente

const toNumberOrNull = (v: any): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Campos do Fazedor editáveis pelo próprio via PUT /users/perfil (allowlist). */
const CAMPOS_FAZEDOR_TEXTO = [
  'biografia', 'endereco', 'cidade', 'provincia', 'whatsapp', 'telefone_publico',
  'email_publico', 'instagram', 'facebook', 'website'
] as const;

const LIMITES_TEXTO: Record<string, number> = {
  biografia: 5000, endereco: 255, cidade: 100, provincia: 100, whatsapp: 20,
  telefone_publico: 20, email_publico: 100, instagram: 100, facebook: 100, website: 100
};

export interface UpdatePerfilInput extends UpdateUserDto {
  biografia?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  provincia?: string | null;
  whatsapp?: string | null;
  telefone_publico?: string | null;
  email_publico?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/**
 * Formata o Fazedor do PRÓPRIO utilizador (sem `usuario` aninhado, que pode trazer campos sensíveis).
 * Decimais (latitude, longitude, avaliacao_media) devolvidos como number.
 */
export const formatarFazedorPrivado = (fazedor: any): any => {
  if (!fazedor) return null;
  return {
    id: fazedor.id_fazedor,
    id_fazedor: fazedor.id_fazedor,
    tipo_fazedor: fazedor.tipo_fazedor,
    status_aprovacao: fazedor.status_aprovacao,
    data_aprovacao: fazedor.data_aprovacao ?? null,
    avaliacao_media: toNumberOrNull(fazedor.avaliacao_media),
    total_avaliacoes: fazedor.total_avaliacoes ?? 0,
    biografia: fazedor.biografia ?? null,
    endereco: fazedor.endereco ?? null,
    cidade: fazedor.cidade ?? null,
    provincia: fazedor.provincia ?? null,
    whatsapp: fazedor.whatsapp ?? null,
    telefone_publico: fazedor.telefone_publico ?? null,
    email_publico: fazedor.email_publico ?? null,
    instagram: fazedor.instagram ?? null,
    facebook: fazedor.facebook ?? null,
    website: fazedor.website ?? null,
    latitude: toNumberOrNull(fazedor.latitude),
    longitude: toNumberOrNull(fazedor.longitude),
    capa_url: fazedor.capa_url ?? null,
    ...(fazedor.agencia && { agencia: fazedor.agencia }),
    ...(fazedor.modeloFreelancer && { modelo: fazedor.modeloFreelancer }),
    ...(fazedor.estilista && { estilista: fazedor.estilista }),
    ...(fazedor.maquiador && { maquiador: fazedor.maquiador }),
    ...(fazedor.fotografo && { fotografo: fazedor.fotografo })
  };
};

export class UserService {
  private notificacaoRepository: NotificacaoRepository;

  constructor(
    private userRepository: UserRepository,
    private fazedorRepository: FazedorRepository
  ) {
    this.notificacaoRepository = new NotificacaoRepository();
  }

  /** Apenas admin (ver user.routes). Paginado, campos privados (sem dados sensíveis). */
  async pegarTodos(page: number = 1, limit: number = 20): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const pagina = Math.max(1, Math.floor(Number(page)) || 1);
    const limite = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
    const { items, total } = await this.userRepository.findAllPaginated(pagina, limite);
    return {
      items,
      total,
      page: pagina,
      limit: limite,
      totalPages: Math.ceil(total / limite)
    };
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorWithDetails(userId);

    return {
      usuario: {
        id: user.id_usuario,
        ...user,
        bio: fazedor?.biografia ?? null
      },
      fazedor: formatarFazedorPrivado(fazedor)
    };
  }

  async getFazedorByUserId(userId: string): Promise<any> {
    return await this.fazedorRepository.findFazedorByUserId(userId);
  }

  // ✅ CORRIGIDO - Usar prisma importado diretamente
  async getMeusServicos(fazedorId: string): Promise<any[]> {
    try {
      const servicos = await prisma.servico.findMany({
        where: { id_fazedor: fazedorId },
        include: {
          fazedor: {
            include: {
              usuario: {
                select: {
                  nome: true,
                  foto_perfil: true,
                  email: true
                }
              }
            }
          },
          imagens: {
            orderBy: { ordem: 'asc' }
          }
        },
        orderBy: { data_criacao: 'desc' }
      });
      return servicos;
    } catch (error) {
      logger.error('Erro ao buscar serviços:', error);
      return [];
    }
  }

  /**
   * PUT /users/perfil — allowlist de campos.
   * Usuario: nome, telefone. Fazedor: biografia (ou `bio`), endereco, cidade, provincia, whatsapp,
   * telefone_publico, email_publico, instagram, facebook, website, latitude, longitude.
   * Modelo freelancer: campos de medidas (como antes). Tudo o resto é ignorado.
   */
  async updateProfile(userId: string, dto: UpdatePerfilInput): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const dadosUsuario: { nome?: string; telefone?: string | null } = {};
    if (typeof dto.nome === 'string' && dto.nome.trim()) dadosUsuario.nome = dto.nome.trim().slice(0, 100);
    if (dto.telefone !== undefined) {
      dadosUsuario.telefone = dto.telefone ? String(dto.telefone).trim().slice(0, 20) : null;
    }

    const updatedUser = Object.keys(dadosUsuario).length > 0
      ? await this.userRepository.updateUser(userId, dadosUsuario)
      : user;

    const fazedor = await this.fazedorRepository.findFazedorByUserId(userId);

    if (fazedor) {
      const dadosFazedor = this.extrairDadosFazedor(dto);
      if (Object.keys(dadosFazedor).length > 0) {
        await prisma.fazedor.update({
          where: { id_fazedor: fazedor.id_fazedor },
          data: dadosFazedor
        });
      }
    }

    // Modelo freelancer: cria o sub-perfil se ainda não existir (contas antigas), senão as medidas perdiam-se.
    if (fazedor && fazedor.tipo_fazedor === 'modelo_freelancer') {
      const modeloData: any = {};
      if (dto.nome_artistico !== undefined) modeloData.nome_artistico = dto.nome_artistico;
      if (dto.altura !== undefined) modeloData.altura = dto.altura ? parseFloat(String(dto.altura).replace(',', '.')) : null;
      if (dto.peso !== undefined) modeloData.peso = dto.peso ? parseFloat(String(dto.peso).replace(',', '.')) : null;
      if (dto.busto !== undefined) modeloData.busto = dto.busto ? parseFloat(String(dto.busto).replace(',', '.')) : null;
      if (dto.cintura !== undefined) modeloData.cintura = dto.cintura ? parseFloat(String(dto.cintura).replace(',', '.')) : null;
      if (dto.quadril !== undefined) modeloData.quadril = dto.quadril ? parseFloat(String(dto.quadril).replace(',', '.')) : null;
      if (dto.sapato !== undefined) modeloData.sapato = dto.sapato ? parseInt(dto.sapato) : null;
      if (dto.roupa !== undefined) modeloData.roupa = dto.roupa ? parseFloat(String(dto.roupa).replace(',', '.')) : null;
      if (dto.cabelo !== undefined) modeloData.cabelo = dto.cabelo;
      if (dto.olhos !== undefined) modeloData.olhos = dto.olhos;
      if (dto.idade !== undefined) modeloData.idade = dto.idade ? parseInt(dto.idade) : null;
      if (dto.nacionalidade !== undefined) modeloData.nacionalidade = dto.nacionalidade;
      if (dto.experiencia !== undefined) modeloData.experiencia = dto.experiencia;
      if (dto.habilidades !== undefined) modeloData.habilidades = dto.habilidades;
      if (dto.status_modelo !== undefined) modeloData.status = dto.status_modelo;

      if (Object.keys(modeloData).length > 0) {
        await prisma.modeloFreelancer.upsert({
          where: { id_fazedor: fazedor.id_fazedor },
          update: modeloData,
          create: {
            ...modeloData,
            id_fazedor: fazedor.id_fazedor,
            nome_artistico: modeloData.nome_artistico || updatedUser.nome
          }
        });
      }
    }

    logger.info(`Perfil atualizado para usuário: ${userId}`);

    const fazedorAtualizado = fazedor
      ? await this.fazedorRepository.findFazedorByUserId(userId)
      : null;

    return {
      id: updatedUser.id_usuario,
      id_usuario: updatedUser.id_usuario,
      nome: updatedUser.nome,
      email: updatedUser.email,
      telefone: updatedUser.telefone,
      tipo: updatedUser.tipo,
      foto_perfil: updatedUser.foto_perfil,
      banner_url: updatedUser.banner_url,
      bio: fazedorAtualizado?.biografia ?? null,
      data_cadastro: updatedUser.data_cadastro,
      fazedor: formatarFazedorPrivado(fazedorAtualizado)
    };
  }

  /** Extrai e valida os campos do Fazedor permitidos. Lança ValidationError se lat/lng inválidos. */
  private extrairDadosFazedor(dto: UpdatePerfilInput): Record<string, any> {
    const dados: Record<string, any> = {};
    const entrada: Record<string, any> = { ...dto };

    // Compatibilidade: o app antigo envia `bio`
    if (entrada.biografia === undefined && entrada.bio !== undefined) {
      entrada.biografia = entrada.bio;
    }

    for (const campo of CAMPOS_FAZEDOR_TEXTO) {
      if (entrada[campo] === undefined) continue;
      const valor = entrada[campo];
      if (valor === null || (typeof valor === 'string' && valor.trim() === '')) {
        dados[campo] = null;
        continue;
      }
      if (typeof valor !== 'string' && typeof valor !== 'number') {
        throw new ValidationError(`Campo ${campo} inválido`);
      }
      const texto = String(valor).trim();
      if (texto.length > LIMITES_TEXTO[campo]) {
        throw new ValidationError(`Campo ${campo} deve ter no máximo ${LIMITES_TEXTO[campo]} caracteres`);
      }
      if (campo === 'email_publico' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
        throw new ValidationError('Email público inválido');
      }
      dados[campo] = texto;
    }

    const lat = this.parseCoordenada(entrada.latitude, -90, 90, 'Latitude');
    const lng = this.parseCoordenada(entrada.longitude, -180, 180, 'Longitude');
    if (lat !== undefined) dados.latitude = lat;
    if (lng !== undefined) dados.longitude = lng;

    if ((dados.latitude === null) !== (dados.longitude === null) &&
        dados.latitude !== undefined && dados.longitude !== undefined) {
      throw new ValidationError('Latitude e longitude devem ser enviadas juntas');
    }

    return dados;
  }

  private parseCoordenada(valor: any, min: number, max: number, nome: string): number | null | undefined {
    if (valor === undefined) return undefined;
    if (valor === null || valor === '') return null;
    const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new ValidationError(`${nome} inválida (deve estar entre ${min} e ${max})`);
    }
    return n;
  }

  /**
   * Elimina a própria conta depois de confirmar a senha. Tudo o que pertence ao
   * utilizador (perfil de fazedor, publicações, eventos, stories, mensagens…)
   * é apagado em cascata pela base de dados. Administradores não se podem eliminar.
   */
  async eliminarConta(userId: string, senha: string): Promise<void> {
    const user = await this.userRepository.findByIdComplete(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    if (user.tipo === 'sistem_admin') {
      throw new ValidationError('Contas de administrador não podem ser eliminadas pela app');
    }
    const isPasswordValid = await compararSenha(senha ?? '', user.senha_hash);
    if (!isPasswordValid) {
      // 400 e não 401: um 401 faz a app pensar que a sessão expirou e termina-a.
      throw new ValidationError('Senha incorrecta');
    }
    await revokeAllUserTokens(userId);
    await prisma.usuario.delete({ where: { id_usuario: userId } });
    logger.info(`Conta eliminada pelo próprio utilizador: ${userId}`);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.userRepository.findByIdComplete(userId);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const isPasswordValid = await compararSenha(dto.senha_atual, user.senha_hash);
    if (!isPasswordValid) {
      // 400 e não 401: um 401 faz a app pensar que a sessão expirou e termina-a.
      throw new ValidationError('Senha atual incorrecta');
    }

    const hashedPassword = await hashSenha(dto.nova_senha);
    await this.userRepository.updatePassword(userId, hashedPassword);
    // Terminar todas as sessões (refresh tokens) após mudança de senha
    await revokeAllUserTokens(userId);
    logger.info(`Senha atualizada para usuário: ${userId}`);
  }

  async getFotoPerfilPublicId(userId: string): Promise<string | null> {
    return this.userRepository.findFotoPerfilPublicId(userId);
  }

  async updateFotoPerfil(userId: string, fotoUrl: string, publicId: string): Promise<any> {
    try {
      const updatedUser = await this.userRepository.update(userId, {
        foto_perfil: fotoUrl,
        foto_perfil_public_id: publicId
      });

      return {
        foto_perfil_url: updatedUser.foto_perfil,
        foto_perfil_public_id: updatedUser.foto_perfil_public_id
      };
    } catch (error: any) {
      throw new Error(`Erro ao atualizar foto de perfil: ${error.message}`);
    }
  }

  async listFavoritos(userId: string): Promise<any[]> {
    const favoritos = await this.userRepository.listFavoritos(userId);

    return favoritos.map(fav => ({
      id: fav.id_favorito,
      fazedor: {
        id: fav.fazedor.id_fazedor,
        nome: fav.fazedor.usuario.nome,
        tipo_fazedor: fav.fazedor.tipo_fazedor,
        avaliacao_media: toNumberOrNull(fav.fazedor.avaliacao_media),
        foto_perfil: fav.fazedor.usuario.foto_perfil,
        status_aprovacao: fav.fazedor.status_aprovacao
      },
      data_adicao: fav.data_adicao
    }));
  }

  async addFavorito(userId: string, fazedorId: string): Promise<void> {
    const fazedor = await this.fazedorRepository.findFazedorById(fazedorId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const isFav = await this.userRepository.isFavorito(userId, fazedorId);
    if (isFav) {
      throw new ValidationError('Fazedor já está nos favoritos');
    }

    await this.userRepository.addFavorito(userId, fazedorId);

    logger.info(`Favorito adicionado: usuário ${userId} -> fazedor ${fazedorId}`);
  }

  async removeFavorito(userId: string, fazedorId: string): Promise<void> {
    const isFav = await this.userRepository.isFavorito(userId, fazedorId);
    if (!isFav) {
      throw new ValidationError('Fazedor não está nos favoritos');
    }

    await this.userRepository.removeFavorito(userId, fazedorId);

    logger.info(`Favorito removido: usuário ${userId} -> fazedor ${fazedorId}`);
  }

  async getEstatisticas(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const favoritos = await this.userRepository.listFavoritos(userId);
    const fazedor = await this.fazedorRepository.findFazedorByUserId(userId);

    const [totalSeguidores, totalSeguindo] = await Promise.all([
      this.userRepository.countSeguidores(userId),
      this.userRepository.countSeguindo(userId),
    ]);

    let estatisticas = {
      total_favoritos: favoritos.length,
      total_servicos: 0,
      total_seguidores: totalSeguidores,
      total_seguindo: totalSeguindo,
      total_avaliacoes: 0,
      avaliacao_media: 0,
      data_cadastro: user.data_cadastro,
    };

    if (fazedor) {
      const [servicos, totalAvaliacoes, aggregate] = await Promise.all([
        prisma.servico.count({ where: { id_fazedor: fazedor.id_fazedor } }),
        prisma.avaliacao.count({ where: { id_avaliado: fazedor.id_fazedor } }),
        prisma.avaliacao.aggregate({
          where: { id_avaliado: fazedor.id_fazedor },
          _avg: { nota: true },
        }),
      ]);
      estatisticas.total_servicos = servicos;
      estatisticas.total_avaliacoes = totalAvaliacoes;
      estatisticas.avaliacao_media = aggregate._avg.nota ?? 0;
    }

    return estatisticas;
  }

  async followUser(seguidorId: string, seguidoId: string): Promise<void> {
    if (seguidorId === seguidoId) {
      throw new ValidationError('Não podes seguir a ti mesmo');
    }

    const seguido = await this.userRepository.findById(seguidoId);
    if (!seguido) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const isFollowing = await this.userRepository.isFollowing(seguidorId, seguidoId);
    if (isFollowing) {
      throw new ValidationError('Já segues este usuário');
    }

    await this.userRepository.followUser(seguidorId, seguidoId);

    const seguidor = await this.userRepository.findById(seguidorId);
    if (seguidor) {
      await this.notificacaoRepository.create({
        id_usuario: seguidoId,
        titulo: 'Novo seguidor',
        mensagem: `${seguidor.nome} começou a seguir-te`,
        tipo: 'sistema',
        link: `/perfil/${seguidorId}`,
      });
    }

    logger.info(`Usuário ${seguidorId} seguiu ${seguidoId}`);
  }

  async unfollowUser(seguidorId: string, seguidoId: string): Promise<void> {
    const isFollowing = await this.userRepository.isFollowing(seguidorId, seguidoId);
    if (!isFollowing) {
      throw new ValidationError('Não segues este usuário');
    }

    await this.userRepository.unfollowUser(seguidorId, seguidoId);
    logger.info(`Usuário ${seguidorId} deixou de seguir ${seguidoId}`);
  }

  async getMySeguidores(userId: string): Promise<any[]> {
    return this.userRepository.getSeguidores(userId);
  }

  async getMySeguindo(userId: string): Promise<any[]> {
    return this.userRepository.getSeguindo(userId);
  }

  async getUserSeguidores(userId: string): Promise<any[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return this.userRepository.getSeguidores(userId);
  }

  async verificarSeguindo(seguidorId: string, seguidoId: string): Promise<boolean> {
    return this.userRepository.isFollowing(seguidorId, seguidoId);
  }

  async contarSeguidores(userId: string): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return this.userRepository.countSeguidores(userId);
  }

  async contarSeguindo(userId: string): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return this.userRepository.countSeguindo(userId);
  }
}
