import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';
import { EmailService } from '../services/email.service';
const emailService = EmailService.getInstance();
export class AdminController {

  static async listarFazedoresPendentes(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [fazedores, total] = await Promise.all([
        prisma.fazedor.findMany({
          where: { status_aprovacao: 'pendente' },
          include: {
            usuario: {
              select: {
                nome: true,
                email: true,
                telefone: true,
                data_cadastro: true
              }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { data_aprovacao: 'asc' }
        }),
        prisma.fazedor.count({ where: { status_aprovacao: 'pendente' } })
      ]);

      res.json({
        success: true,
        data: fazedores,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar fazedores pendentes' });
    }
  }

  static async aprovarFazedor(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { observacoes } = req.body;

      const fazedor = await prisma.fazedor.findUnique({
        where: { id_fazedor: id },
        include: { usuario: true }
      });

      if (!fazedor) {
        res.status(404).json({ error: 'Fazedor não encontrado' });
        return;
      }

      if (fazedor.status_aprovacao !== 'pendente') {
        res.status(400).json({ error: 'Este fazedor já foi processado' });
        return;
      }

      const updated = await prisma.fazedor.update({
        where: { id_fazedor: id },
        data: {
          status_aprovacao: 'aprovado',
          data_aprovacao: new Date()
        },
        include: { usuario: true }
      });


      await emailService.sendEmail({
        to: fazedor.usuario.email,
        subject: 'Perfil Aprovado - Stivy',
        html: `
          <h2>Olá ${fazedor.usuario.nome}</h2>
          <p>Seu perfil foi aprovado com sucesso!</p>
          <p>Tipo: ${fazedor.tipo_fazedor}</p>
          <p>${observacoes || ''}</p>
        `
      });

      logger.info(`Fazedor ${fazedor.usuario.email} aprovado por admin`);

      res.json({
        success: true,
        message: 'Fazedor aprovado com sucesso',
        data: updated
      });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ error: 'Erro ao aprovar fazedor' });
    }
  }

  static async rejeitarFazedor(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { motivo } = req.body;

      if (!motivo) {
        res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
        return;
      }

      const fazedor = await prisma.fazedor.findUnique({
        where: { id_fazedor: id },
        include: { usuario: true }
      });

      if (!fazedor) {
        res.status(404).json({ error: 'Fazedor não encontrado' });
        return;
      }

      const updated = await prisma.fazedor.update({
        where: { id_fazedor: id },
        data: {
          status_aprovacao: 'rejeitado'
        }
      });

      await emailService.sendEmail({
        to: fazedor.usuario.email,
        subject: 'Perfil Rejeitado - Stivy',
        html: `
          <h2>Olá ${fazedor.usuario.nome}</h2>
          <p>Seu perfil foi rejeitado.</p>
          <p><strong>Motivo:</strong> ${motivo}</p>
        `
      });

      logger.info(`Fazedor ${fazedor.usuario.email} rejeitado. Motivo: ${motivo}`);

      res.json({
        success: true,
        message: 'Fazedor rejeitado',
        data: updated
      });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ error: 'Erro ao rejeitar fazedor' });
    }
  }

  static async detalhesFazedor(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const fazedor = await prisma.fazedor.findUnique({
        where: { id_fazedor: id },
        include: {
          usuario: {
            select: {
              nome: true,
              email: true,
              telefone: true,
              data_cadastro: true,
              status: true
            }
          },
          servicos: {
            where: { status: 'ativo' }
          },
          avaliacoesRecebidas: {
            select: {
              nota: true,
              comentario: true,
              data_avaliacao: true,
              avaliador: {
                select: { nome: true }
              }
            },
            take: 5,
            orderBy: { data_avaliacao: 'desc' }
          },
          portfolio: {
            orderBy: { ordem: 'asc' }
          }
        }
      });

      if (!fazedor) {
        res.status(404).json({ error: 'Fazedor não encontrado' });
        return;
      }

      res.json({ success: true, data: fazedor });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar detalhes do fazedor' });
    }
  }

  static async getEstatisticasSistema(_: Request, res: Response): Promise<void> {
    try {
      const [
        totalUsuarios,
        totalFazedores,
        pendentes,
        aprovados,
        rejeitados,
        totalServicos,
        totalEventos,
        totalRequisicoes
      ] = await Promise.all([
        prisma.usuario.count(),
        prisma.fazedor.count(),
        prisma.fazedor.count({ where: { status_aprovacao: 'pendente' } }),
        prisma.fazedor.count({ where: { status_aprovacao: 'aprovado' } }),
        prisma.fazedor.count({ where: { status_aprovacao: 'rejeitado' } }),
        prisma.servico.count({ where: { status: 'ativo' } }),
        prisma.evento.count({ where: { status: 'ativo' } }),
        prisma.requisicao.count()
      ]);

      res.json({
        success: true,
        data: {
          usuarios: {
            total: totalUsuarios,
            fazedores: totalFazedores,
            apreciadores: totalUsuarios - totalFazedores
          },
          aprovacoes: {
            pendentes,
            aprovados,
            rejeitados
          },
          conteudo: {
            servicos_ativos: totalServicos,
            eventos_ativos: totalEventos,
            requisicoes_total: totalRequisicoes
          }
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }

  static async listarUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, status, tipo } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (tipo) where.tipo = tipo;

      const [usuarios, total] = await Promise.all([
        prisma.usuario.findMany({
          where,
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            tipo: true,
            status: true,
            data_cadastro: true,
            fazedor: {
              select: {
                status_aprovacao: true,
                tipo_fazedor: true
              }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { data_cadastro: 'desc' }
        }),
        prisma.usuario.count({ where })
      ]);

      res.json({
        success: true,
        data: usuarios,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  static async bloquearUsuario(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const usuario = await prisma.usuario.update({
        where: { id_usuario: id },
        data: { status: 'bloqueado' }
      });

      logger.info(`Usuário ${usuario.email} bloqueado por admin`);

      res.json({
        success: true,
        message: 'Usuário bloqueado com sucesso'
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao bloquear usuário' });
    }
  }

  static async deletarUsuario(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const usuario = await prisma.usuario.delete({
        where: { id_usuario: id },
      });

      logger.info(`Usuário ${usuario.email} Deletado por admin`);

      res.json({
        success: true,
        message: 'Usuário Deletado com sucesso'
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao bloquear usuário' });
    }
  }

  static async desbloquearUsuario(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const usuario = await prisma.usuario.update({
        where: { id_usuario: id },
        data: { status: 'ativo' }
      });

      logger.info(`Usuário ${usuario.email} desbloqueado por admin`);

      res.json({
        success: true,
        message: 'Usuário desbloqueado com sucesso'
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao desbloquear usuário' });
    }
  }
}
