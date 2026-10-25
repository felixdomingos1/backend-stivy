import { PortfolioRepository } from '../repositories/portfolio.repository';
import { cloudinaryService } from './cloudinary.service';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export class PortfolioService {
  constructor(
    private portfolioRepository: PortfolioRepository
  ) { }

  async adicionarImagem(
    id_fazedor: string,
    imagemBuffer: Buffer,
    titulo?: string,
    descricao?: string
  ): Promise<any> {
    const uploadResult = await cloudinaryService.uploadBuffer(imagemBuffer, {
      folder: `portfolio/${id_fazedor}`,
      width: 1200,
      height: 1200,
      quality: 85
    });

    const existing = await this.portfolioRepository.findByFazedor(id_fazedor);
    const ordem = existing.length;

    const portfolio = await this.portfolioRepository.create({
      id_fazedor,
      titulo,
      descricao,
      imagem_url: uploadResult.secure_url,
      imagem_public_id: uploadResult.public_id,
      ordem
    });

    logger.info(`Imagem adicionada ao portfolio do fazedor ${id_fazedor}`);
    return portfolio;
  }

  async adicionarMultiplasImagens(
    id_fazedor: string,
    imagens: Buffer[],
    titulos?: string[]
  ): Promise<any[]> {
    const results = [];

    for (let i = 0; i < imagens.length; i++) {
      const result = await this.adicionarImagem(
        id_fazedor,
        imagens[i],
        titulos?.[i]
      );
      results.push(result);
    }

    return results;
  }

  async listarPortfolio(id_fazedor: string): Promise<any[]> {
    return await this.portfolioRepository.findByFazedor(id_fazedor);
  }

  async removerImagem(id_portfolio: string, id_fazedor: string): Promise<void> {
    const imagem = await this.portfolioRepository.findOneByFazedor(id_portfolio, id_fazedor);

    if (!imagem) {
      throw new NotFoundError('Imagem não encontrada');
    }

    await this.portfolioRepository.delete(id_portfolio);
    cloudinaryService.deleteFile(imagem.imagem_public_id)
      .catch(err => logger.warn(`Falha ao apagar imagem ${id_portfolio} do Cloudinary:`, err?.message ?? err));
    logger.info(`Imagem removida do portfolio: ${id_portfolio}`);
  }

  async reordenarImagens(id_fazedor: string, ids: string[]): Promise<void> {
    if (ids.some(id => typeof id !== 'string')) {
      throw new ValidationError('Lista de IDs inválida');
    }
    const count = await this.portfolioRepository.reorder(id_fazedor, ids.slice(0, 200));
    if (count !== ids.length) {
      throw new ValidationError('Algumas imagens não pertencem ao seu portfolio');
    }
  }

  async atualizarImagem(
    id_portfolio: string,
    id_fazedor: string,
    titulo?: string,
    descricao?: string
  ): Promise<any> {
    const imagem = await this.portfolioRepository.findOneByFazedor(id_portfolio, id_fazedor);
    if (!imagem) {
      throw new NotFoundError('Imagem não encontrada');
    }
    return await this.portfolioRepository.update(id_portfolio, {
      titulo,
      descricao
    });
  }
}
