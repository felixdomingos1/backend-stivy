import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';
import { EmailService } from '../services/email.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { revokeAllUserTokens } from '../utils/jwt';
import { usuarioPrivadoSelect } from '../utils/prisma-selects';
import { DENUNCIA_STATUS } from '../services/servico-denuncia.service';

const emailService = EmailService.getInstance();

const MAX_LIMIT = 100;

/** Normaliza paginação: page >= 1, 1 <= limit <= 100. */
const paginacao = (query: any) => {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(query.limit)) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const escapeHtml = (v: any): string =>
  String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/**
 * Valida que o admin pode agir sobre o utilizador alvo: nunca sobre si próprio nem sobre outro admin.
 * Responde e devolve null se não puder.
 */
const validarAlvo = async (req: AuthRequest, res: Response, id: string, acao: string) => {
  if (!id) {
    res.status(400).json({ success: false, error: 'ID do usuário é obrigatório' });
    return null;
  }
  if (id === req.usuarioId) {
    res.status(403).json({ success: false, error: `Não pode ${acao} a sua própria conta` });
    return null;
  }
  const alvo = await prisma.usuario.findUnique({
    where: { id_usuario: id },
    select: { id_usuario: true, email: true, tipo: true }
  });
  if (!alvo) {
    res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    return null;
  }
  if (alvo.tipo === 'sistem_admin') {
    res.status(403).json({ success: false, error: `Não é permitido ${acao} outro administrador` });
    return null;
  }
  return alvo;
};
export class AdminController {

  static async listarFazedoresPendentes(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = paginacao(req.query);

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
          take: limit,
          orderBy: { data_aprovacao: 'asc' }
        }),
        prisma.fazedor.count({ where: { status_aprovacao: 'pendente' } })
      ]);

      res.json({
        success: true,
        data: fazedores,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro ao listar fazedores pendentes' });
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
        res.status(404).json({ success: false, error: 'Fazedor não encontrado' });
        return;
      }

      if (fazedor.status_aprovacao !== 'pendente') {
        res.status(400).json({ success: false, error: 'Este fazedor já foi processado' });
        return;
      }

      const updated = await prisma.fazedor.update({
        where: { id_fazedor: id },
        data: {
          status_aprovacao: 'aprovado',
          data_aprovacao: new Date()
        },
        include: { usuario: { select: usuarioPrivadoSelect } }
      });


      await emailService.sendEmail({
        to: fazedor.usuario.email,
        subject: 'Perfil Aprovado - Stivy',
        html: `
          <h2>Olá ${escapeHtml(fazedor.usuario.nome)}</h2>
          <p>Seu perfil foi aprovado com sucesso!</p>
          <p>Tipo: ${escapeHtml(fazedor.tipo_fazedor)}</p>
          <p>${escapeHtml(observacoes || '')}</p>
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
      res.status(500).json({ success: false, error: 'Erro ao aprovar fazedor' });
    }
  }

  static async rejeitarFazedor(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { motivo } = req.body;

      if (!motivo) {
        res.status(400).json({ success: false, error: 'Motivo da rejeição é obrigatório' });
        return;
      }

      const fazedor = await prisma.fazedor.findUnique({
        where: { id_fazedor: id },
        include: { usuario: true }
      });

      if (!fazedor) {
        res.status(404).json({ success: false, error: 'Fazedor não encontrado' });
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
          <h2>Olá ${escapeHtml(fazedor.usuario.nome)}</h2>
          <p>Seu perfil foi rejeitado.</p>
          <p><strong>Motivo:</strong> ${escapeHtml(motivo)}</p>
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
      res.status(500).json({ success: false, error: 'Erro ao rejeitar fazedor' });
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
        res.status(404).json({ success: false, error: 'Fazedor não encontrado' });
        return;
      }

      res.json({ success: true, data: fazedor });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro ao buscar detalhes do fazedor' });
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
      res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
    }
  }

  static async listarUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = paginacao(req.query);
      const { status, tipo } = req.query;

      const where: any = {};
      if (typeof status === 'string' && ['ativo', 'inativo', 'bloqueado'].includes(status)) where.status = status;
      if (typeof tipo === 'string' && ['fazedor', 'apreciador', 'sistem_admin'].includes(tipo)) where.tipo = tipo;

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
          take: limit,
          orderBy: { data_cadastro: 'desc' }
        }),
        prisma.usuario.count({ where })
      ]);

      res.json({
        success: true,
        data: usuarios,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro ao listar usuários' });
    }
  }

  static async bloquearUsuario(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      const alvo = await validarAlvo(req, res, id, 'bloquear');
      if (!alvo) return;

      await prisma.usuario.update({
        where: { id_usuario: id },
        data: { status: 'bloqueado' }
      });
      await revokeAllUserTokens(id);

      logger.info(`Usuário ${id} bloqueado pelo admin ${req.usuarioId}`);

      res.json({
        success: true,
        message: 'Usuário bloqueado com sucesso'
      });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ success: false, error: 'Erro ao bloquear usuário' });
    }
  }

  static async deletarUsuario(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      const alvo = await validarAlvo(req, res, id, 'eliminar');
      if (!alvo) return;

      await prisma.usuario.delete({
        where: { id_usuario: id },
      });

      logger.info(`Usuário ${id} eliminado pelo admin ${req.usuarioId}`);

      res.json({
        success: true,
        message: 'Usuário eliminado com sucesso'
      });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ success: false, error: 'Erro ao eliminar usuário' });
    }
  }

  static async desbloquearUsuario(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      const alvo = await validarAlvo(req, res, id, 'desbloquear');
      if (!alvo) return;

      await prisma.usuario.update({
        where: { id_usuario: id },
        data: { status: 'ativo' }
      });

      logger.info(`Usuário ${id} desbloqueado pelo admin ${req.usuarioId}`);

      res.json({
        success: true,
        message: 'Usuário desbloqueado com sucesso'
      });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ success: false, error: 'Erro ao desbloquear usuário' });
    }
  }

  static async listarDenuncias(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = paginacao(req.query);
      const status = req.query.status as any;
      if (status && !DENUNCIA_STATUS.includes(status)) {
        res.status(400).json({ success: false, error: `Status deve ser um de: ${DENUNCIA_STATUS.join(', ')}` });
        return;
      }
      const where = status ? { status } : {};

      const [denuncias, total] = await Promise.all([
        prisma.servicoDenuncia.findMany({
          where,
          include: {
            usuario: { select: { id_usuario: true, nome: true, email: true } },
            servico: { select: { id_servico: true, titulo: true, imagem_url: true, status: true, id_fazedor: true } }
          },
          skip,
          take: limit,
          orderBy: { data_criacao: 'desc' }
        }),
        prisma.servicoDenuncia.count({ where })
      ]);

      res.json({
        success: true,
        data: denuncias,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ success: false, error: 'Erro ao listar denúncias' });
    }
  }

  static async atualizarDenuncia(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      const { status } = req.body;
      if (!DENUNCIA_STATUS.includes(status)) {
        res.status(400).json({ success: false, error: `Status deve ser um de: ${DENUNCIA_STATUS.join(', ')}` });
        return;
      }

      const denuncia = await prisma.servicoDenuncia.update({
        where: { id_denuncia: id },
        data: { status, data_revisao: status === 'pendente' ? null : new Date() }
      });

      logger.info(`Denúncia ${id} marcada como ${status} pelo admin ${req.usuarioId}`);

      res.json({ success: true, data: denuncia });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        res.status(404).json({ success: false, error: 'Denúncia não encontrada' });
        return;
      }
      logger.error(error);
      res.status(500).json({ success: false, error: 'Erro ao actualizar denúncia' });
    }
  }
}
