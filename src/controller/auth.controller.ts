import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { hashSenha, compararSenha } from '../utils/bcrypt';
import { gerarToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import crypto from 'crypto';

export class AuthController {
  async registrar(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { nome, email, senha, telefone, tipo, tipo_fazedor } = req.body;

      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email }
      });

      if (usuarioExistente) {
        res.status(400).json({ error: 'Email já cadastrado' });
        return;
      }

      const senhaHash = await hashSenha(senha);

      const usuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha_hash: senhaHash,
          telefone,
          tipo,
          status: 'ativo'
        }
      });

      let fazedor = null;
      if (tipo === 'fazedor' && tipo_fazedor) {
        fazedor = await prisma.fazedor.create({
          data: {
            id_usuario: usuario.id_usuario,
            tipo_fazedor: tipo_fazedor,
            status_aprovacao: 'pendente'
          }
        });
      }

      const token = gerarToken({
        id: usuario.id_usuario,
        email: usuario.email,
        tipo: usuario.tipo
      });

      res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso',
        token,
        usuario: {
          id: usuario.id_usuario,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          tipo: usuario.tipo,
          tipo_fazedor: fazedor?.tipo_fazedor || null
        }
      });
    } catch (error) {
      logger.error('Erro ao registrar usuário:', error);
      res.status(500).json({ error: 'Erro ao cadastrar usuário' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, senha } = req.body;

      const usuario = await prisma.usuario.findUnique({
        where: { email }
      });

      if (!usuario) {
        res.status(401).json({ error: 'Email ou senha inválidos' });
        return;
      }

      const senhaValida = await compararSenha(senha, usuario.senha_hash);
      if (!senhaValida) {
        res.status(401).json({ error: 'Email ou senha inválidos' });
        return;
      }

      if (usuario.status !== 'ativo') {
        res.status(401).json({ error: 'Usuário bloqueado ou inativo' });
        return;
      }

      await prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: { ultimo_acesso: new Date() }
      });

      const token = gerarToken({
        id: usuario.id_usuario,
        email: usuario.email,
        tipo: usuario.tipo
      });

      const fazedor = await prisma.fazedor.findUnique({
        where: { id_usuario: usuario.id_usuario },
        include: {
          agencia: true,
          modeloFreelancer: true,
          estilista: true,
          maquiador: true,
          fotografo: true
        }
      });

      res.json({
        success: true,
        token,
        usuario: {
          id: usuario.id_usuario,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          tipo: usuario.tipo,
          foto_perfil: usuario.foto_perfil,
          status_aprovacao: fazedor?.status_aprovacao || null,
          tipo_fazedor: fazedor?.tipo_fazedor || null
        }
      });
    } catch (error) {
      logger.error('Erro ao fazer login:', error);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: req.usuarioId },
        select: {
          id_usuario: true,
          nome: true,
          email: true,
          telefone: true,
          tipo: true,
          foto_perfil: true,
          data_cadastro: true,
          status: true
        }
      });

      if (!usuario) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const fazedor = await prisma.fazedor.findUnique({
        where: { id_usuario: req.usuarioId },
        include: {
          agencia: true,
          modeloFreelancer: true,
          estilista: true,
          maquiador: true,
          fotografo: true
        }
      });

      res.json({ usuario, fazedor });
    } catch (error) {
      logger.error('Erro ao buscar dados do usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
  }

  async recuperarSenha(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const usuario = await prisma.usuario.findUnique({
        where: { email }
      });

      if (!usuario) {
        res.status(404).json({ error: 'Email não encontrado' });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpira = new Date(Date.now() + 3600000); // 1 hora

      await prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: {
          reset_token: resetToken,
          reset_token_expira: resetTokenExpira
        }
      });

      // Aqui enviaria email com o link de recuperação
      // Por enquanto só retorna o token (em produção NÃO faça isso)
      res.json({
        success: true,
        message: 'Token de recuperação gerado',
        resetToken // Apenas para teste, remover em produção
      });
    } catch (error) {
      logger.error('Erro ao recuperar senha:', error);
      res.status(500).json({ error: 'Erro ao recuperar senha' });
    }
  }

  async redefinirSenha(req: Request, res: Response): Promise<void> {
    try {
      const { token, nova_senha } = req.body;

      const usuario = await prisma.usuario.findFirst({
        where: {
          reset_token: token,
          reset_token_expira: { gt: new Date() }
        }
      });

      if (!usuario) {
        res.status(400).json({ error: 'Token inválido ou expirado' });
        return;
      }

      const novaSenhaHash = await hashSenha(nova_senha);

      await prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: {
          senha_hash: novaSenhaHash,
          reset_token: null,
          reset_token_expira: null
        }
      });

      res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
      logger.error('Erro ao redefinir senha:', error);
      res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }
}
