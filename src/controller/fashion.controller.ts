import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import logger from '../utils/logger';

export class FashionController {
  // Criar serviço
  async criarServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { titulo, descricao, categoria, valor, tempo_estimado } = req.body;
      const fazedor = await prisma.fazedor.findUnique({
        where: { id_usuario: req.usuarioId }
      });

      if (!fazedor) {
        res.status(403).json({ error: 'Apenas fazedores podem criar serviços' });
        return;
      }

      const servico = await prisma.servico.create({
        data: {
          id_fazedor: fazedor.id_fazedor,
          titulo,
          descricao,
          categoria,
          valor: valor ? parseFloat(valor) : null,
          tempo_estimado,
          status: 'ativo'
        }
      });

      res.status(201).json({ success: true, data: servico });
    } catch (error) {
      logger.error('Erro ao criar serviço:', error);
      res.status(500).json({ error: 'Erro ao criar serviço' });
    }
  }

  // Listar serviços com filtros
  async listarServicos(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { categoria, tipo_fazedor, page = 1, limit = 10 } = req.query;

      const where: any = { status: 'ativo' };

      if (categoria) where.categoria = categoria;
      if (tipo_fazedor) {
        where.fazedor = { tipo_fazedor: tipo_fazedor as string };
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [servicos, total] = await Promise.all([
        prisma.servico.findMany({
          where,
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: { nome: true, email: true, foto_perfil: true }
                }
              }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { data_criacao: 'desc' }
        }),
        prisma.servico.count({ where })
      ]);

      res.json({
        data: servicos,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      logger.error('Erro ao listar serviços:', error);
      res.status(500).json({ error: 'Erro ao listar serviços' });
    }
  }

  // Criar modelo (apenas agências)
  async criarModelo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        nome_completo, nome_artistico, genero, altura, peso,
        busto, cintura, quadril, sapato, roupa, cabelo, olhos, experiencia
      } = req.body;

      const fazedor = await prisma.fazedor.findUnique({
        where: { id_usuario: req.usuarioId },
        include: { agencia: true }
      });

      if (!fazedor?.agencia) {
        res.status(403).json({ error: 'Apenas agências podem cadastrar modelos' });
        return;
      }

      const modelo = await prisma.modelo.create({
        data: {
          id_agencia: fazedor.agencia.id_agencia,
          nome_completo,
          nome_artistico,
          genero,
          altura: altura ? parseFloat(altura) : null,
          peso: peso ? parseFloat(peso) : null,
          busto: busto ? parseInt(busto) : null,
          cintura: cintura ? parseInt(cintura) : null,
          quadril: quadril ? parseInt(quadril) : null,
          sapato: sapato ? parseInt(sapato) : null,
          roupa: roupa ? parseInt(roupa) : null,
          cabelo,
          olhos,
          experiencia,
          status: 'ativo'
        }
      });

      res.status(201).json({ success: true, data: modelo });
    } catch (error) {
      logger.error('Erro ao criar modelo:', error);
      res.status(500).json({ error: 'Erro ao criar modelo' });
    }
  }

  // Listar modelos disponíveis
  async listarModelos(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { genero, page = 1, limit = 10 } = req.query;

      const where: any = { status: 'ativo' };
      if (genero) where.genero = genero;

      const skip = (Number(page) - 1) * Number(limit);

      const modelos = await prisma.modelo.findMany({
        where,
        include: {
          agencia: {
            include: {
              fazedor: {
                include: {
                  usuario: { select: { nome: true } }
                }
              }
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { data_cadastro: 'desc' }
      });

      res.json({ data: modelos });
    } catch (error) {
      logger.error('Erro ao listar modelos:', error);
      res.status(500).json({ error: 'Erro ao listar modelos' });
    }
  }
}
