// src/services/modelo.service.ts (corrigido)

import { ModeloRepository } from '../repositories/modelo.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { cloudinaryService } from './cloudinary.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class ModeloService {
  constructor(
    private modeloRepository: ModeloRepository,
    private fazedorRepository: FazedorRepository
  ) { }

  async criarModelo(agenciaUserId: string, data: any): Promise<any> {
    // Verificar se o usuário é uma agência
    const fazedor = await this.fazedorRepository.findFazedorByUserId(agenciaUserId);

    if (!fazedor) {
      throw new ValidationError('Perfil de fazedor não encontrado');
    }

    if (fazedor.tipo_fazedor !== 'agencia') {
      throw new ValidationError('Apenas agências podem cadastrar modelos');
    }

    if (fazedor.status_aprovacao !== 'aprovado') {
      throw new ValidationError('Sua agência precisa ser aprovada para cadastrar modelos');
    }

    console.log(fazedor);
    
    const agencia = await this.fazedorRepository.findAgenciaByFazedorId(fazedor.id_fazedor);

    if (!agencia) {
      throw new ValidationError('Perfil de agência não encontrado');
    }

    const modelo = await this.modeloRepository.create({
      id_agencia: agencia.id_agencia,
      ...data
    });

    logger.info(`Modelo ${modelo.nome_completo} cadastrado pela agência ${agencia.id_agencia}`);

    return modelo;
  }

  async listarModelosDaAgencia(agenciaUserId: string, filters?: any): Promise<any[]> {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(agenciaUserId);

    if (!fazedor) {
      throw new ValidationError('Perfil de fazedor não encontrado');
    }

    if (fazedor.tipo_fazedor !== 'agencia') {
      throw new ValidationError('Apenas agências podem listar modelos');
    }

    const agencia = await this.fazedorRepository.findAgenciaByFazedorId(fazedor.id_fazedor);

    if (!agencia) {
      throw new ValidationError('Perfil de agência não encontrado');
    }

    return await this.modeloRepository.findByAgencia(agencia.id_agencia, filters);
  }

  async buscarModeloPorId(id_modelo: string): Promise<any> {
    const modelo = await this.modeloRepository.findById(id_modelo);

    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }

    return modelo;
  }

  async atualizarModelo(id_modelo: string, agenciaUserId: string, data: any): Promise<any> {
    const modelo = await this.modeloRepository.findById(id_modelo);

    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }

    // Verificar permissão
    const fazedor = await this.fazedorRepository.findFazedorByUserId(agenciaUserId);

    if (!fazedor) {
      throw new ValidationError('Perfil de fazedor não encontrado');
    }

    const agencia = await this.fazedorRepository.findAgenciaByFazedorId(fazedor.id_fazedor);

    if (!agencia) {
      throw new ValidationError('Perfil de agência não encontrado');
    }

    if (modelo.id_agencia !== agencia.id_agencia) {
      throw new ValidationError('Você não tem permissão para atualizar este modelo');
    }

    return await this.modeloRepository.update(id_modelo, data);
  }

  async removerModelo(id_modelo: string, agenciaUserId: string): Promise<void> {
    const modelo = await this.modeloRepository.findById(id_modelo);

    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorByUserId(agenciaUserId);

    if (!fazedor) {
      throw new ValidationError('Perfil de fazedor não encontrado');
    }

    const agencia = await this.fazedorRepository.findAgenciaByFazedorId(fazedor.id_fazedor);

    if (!agencia) {
      throw new ValidationError('Perfil de agência não encontrado');
    }

    if (modelo.id_agencia !== agencia.id_agencia) {
      throw new ValidationError('Você não tem permissão para remover este modelo');
    }

    await this.modeloRepository.delete(id_modelo);
  }

  async adicionarFotoPortfolio(
    id_modelo: string,
    agenciaUserId: string,
    imagemBuffer: Buffer,
    titulo?: string,
    descricao?: string,
    categoria?: string
  ): Promise<any> {
    const modelo = await this.modeloRepository.findById(id_modelo);

    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorByUserId(agenciaUserId);

    if (!fazedor) {
      throw new ValidationError('Perfil de fazedor não encontrado');
    }

    const agencia = await this.fazedorRepository.findAgenciaByFazedorId(fazedor.id_fazedor);

    if (!agencia) {
      throw new ValidationError('Perfil de agência não encontrado');
    }

    if (modelo.id_agencia !== agencia.id_agencia) {
      throw new ValidationError('Você não tem permissão para adicionar fotos a este modelo');
    }

    const uploadResult = await cloudinaryService.uploadBuffer(imagemBuffer, {
      folder: `modelos/${id_modelo}`,
      width: 1000,
      height: 1000,
      quality: 85
    });

    const fotosExistentes = await this.modeloRepository.getFotosPortfolio(id_modelo);

    const portfolio = await this.modeloRepository.addFotoPortfolio({
      id_modelo,
      imagem_url: uploadResult.secure_url,
      imagem_public_id: uploadResult.public_id,
      titulo,
      descricao,
      categoria,
      ordem: fotosExistentes.length
    });

    return portfolio;
  }
}
