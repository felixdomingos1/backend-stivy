import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';
import { cloudinaryService } from './cloudinary.service';
import { ValidationError, NotFoundError } from '../utils/errors';

export class ServicoImagemService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async getImagemById(id_servico_imagem: string): Promise<any> {
    const imagem = await this.prisma.servicoImagem.findUnique({
      where: { id_servico_imagem }
    });

    if (!imagem) {
      throw new NotFoundError('Imagem não encontrada');
    }

    return imagem;
  }

  async adicionarImagens(
    id_servico: string,
    imagens: Buffer[],
    principalIndex: number = 0
  ): Promise<any[]> {
    if (imagens.length > 5) {
      throw new ValidationError('Máximo de 5 imagens por serviço');
    }

    const imagensExistentes = await this.prisma.servicoImagem.count({
      where: { id_servico }
    });

    if (imagensExistentes + imagens.length > 5) {
      throw new ValidationError(`Máximo de 5 imagens por serviço. Já existem ${imagensExistentes} imagens.`);
    }

    const results = [];

    for (let i = 0; i < imagens.length; i++) {
      const uploadResult = await cloudinaryService.uploadBuffer(imagens[i], {
        folder: `servicos/${id_servico}`,
        width: 800,
        height: 600,
        quality: 85
      });

      const imagem = await this.prisma.servicoImagem.create({
        data: {
          id_servico,
          imagem_url: uploadResult.secure_url,
          imagem_public_id: uploadResult.public_id,
          ordem: imagensExistentes + i,
          is_principal: (imagensExistentes === 0 && i === principalIndex) ||
            (imagensExistentes > 0 && false)
        }
      });

      results.push(imagem);
    }

    return results;
  }

  async listarImagens(id_servico: string): Promise<any[]> {
    return await this.prisma.servicoImagem.findMany({
      where: { id_servico },
      orderBy: { ordem: 'asc' }
    });
  }

  async removerImagem(id_servico_imagem: string): Promise<void> {
    const imagem = await this.prisma.servicoImagem.findUnique({
      where: { id_servico_imagem }
    });

    if (!imagem) {
      throw new NotFoundError('Imagem não encontrada');
    }

    await cloudinaryService.deleteFile(imagem.imagem_public_id);

    await this.prisma.servicoImagem.delete({
      where: { id_servico_imagem }
    });

    const imagensRestantes = await this.prisma.servicoImagem.findMany({
      where: { id_servico: imagem.id_servico },
      orderBy: { ordem: 'asc' }
    });

    for (let i = 0; i < imagensRestantes.length; i++) {
      await this.prisma.servicoImagem.update({
        where: { id_servico_imagem: imagensRestantes[i].id_servico_imagem },
        data: { ordem: i }
      });
    }
  }

  async definirPrincipal(id_servico: string, id_servico_imagem: string): Promise<void> {
    const imagem = await this.prisma.servicoImagem.findFirst({
      where: {
        id_servico_imagem,
        id_servico
      }
    });

    if (!imagem) {
      throw new NotFoundError('Imagem não encontrada para este serviço');
    }

    await this.prisma.servicoImagem.updateMany({
      where: { id_servico },
      data: { is_principal: false }
    });

    await this.prisma.servicoImagem.update({
      where: { id_servico_imagem },
      data: { is_principal: true }
    });
  }

  async reordenarImagens(id_servico: string, ids: string[]): Promise<void> {
    const imagens = await this.prisma.servicoImagem.findMany({
      where: {
        id_servico,
        id_servico_imagem: { in: ids }
      }
    });

    if (imagens.length !== ids.length) {
      throw new ValidationError('Algumas imagens não pertencem a este serviço');
    }

    for (let i = 0; i < ids.length; i++) {
      await this.prisma.servicoImagem.update({
        where: { id_servico_imagem: ids[i] },
        data: { ordem: i }
      });
    }
  }
}
