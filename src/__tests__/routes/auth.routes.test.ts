// src/__tests__/routes/auth.routes.test.ts
import request from 'supertest';
import express from 'express';
import { FazedorStatusAprovacao, FazedorTipo, PrismaClient, UsuarioStatus, UsuarioTipo } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import authRoutes from '../../routes/auth.routes';
import { hashSenha, compararSenha } from '../../utils/bcrypt';
import { gerarToken } from '../../utils/jwt';
import { Decimal } from '@prisma/client/runtime/library';

// Mock das dependências
jest.mock('../../utils/bcrypt');
jest.mock('../../utils/jwt');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Rotas de Autenticação', () => {
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    jest.clearAllMocks();
  });

  describe('POST /auth/registrar', () => {
    const validUserData = {
      nome: 'João Silva',
      email: 'joao@email.com',
      senha: 'senha123',
      telefone: '11999999999',
      tipo: 'apreciador'
    };

    const validFazedorData = {
      nome: 'Maria Santos',
      email: 'maria@email.com',
      senha: 'senha123',
      telefone: '11988888888',
      tipo: 'fazedor',
      tipo_fazedor: 'estilista'
    };

    it('deve registrar um novo usuário com sucesso', async () => {
      const hashedPassword = 'hashed_password_123';
      (hashSenha as jest.Mock).mockResolvedValue(hashedPassword);
      (gerarToken as jest.Mock).mockReturnValue('fake_jwt_token');

      prismaMock.usuario.findUnique.mockResolvedValue(null);
      prismaMock.usuario.create.mockResolvedValue({
        id_usuario: 1,
        nome: validUserData.nome,
        email: validUserData.email,
        senha_hash: hashedPassword,
        telefone: validUserData.telefone,
        tipo: 'apreciador',
        status: 'ativo',
        foto_perfil: null,
        data_cadastro: new Date(),
        ultimo_acesso: null,
        reset_token: null,
        reset_token_expira: null
      });

      const response = await request(app)
        .post('/auth/registrar')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Usuário cadastrado com sucesso');
      expect(response.body).toHaveProperty('token');
      expect(response.body.usuario).toHaveProperty('id', 1);
      expect(response.body.usuario).toHaveProperty('nome', validUserData.nome);
      expect(response.body.usuario).toHaveProperty('email', validUserData.email);
    });

    it('deve registrar um fazedor com sucesso', async () => {
      const hashedPassword = 'hashed_password_123';
      (hashSenha as jest.Mock).mockResolvedValue(hashedPassword);
      (gerarToken as jest.Mock).mockReturnValue('fake_jwt_token');

      prismaMock.usuario.findUnique.mockResolvedValue(null);
      prismaMock.usuario.create.mockResolvedValue({
        id_usuario: 2,
        nome: validFazedorData.nome,
        email: validFazedorData.email,
        senha_hash: hashedPassword,
        telefone: validFazedorData.telefone,
        tipo: 'fazedor',
        status: 'ativo',
        foto_perfil: null,
        data_cadastro: new Date(),
        ultimo_acesso: null,
        reset_token: null,
        reset_token_expira: null
      });

      prismaMock.fazedor.create.mockResolvedValue({
        id_fazedor: 1,
        id_usuario: 2,
        tipo_fazedor: 'estilista',
        status_aprovacao: 'pendente',
        biografia: null,
        endereco: null,
        website: null,
        instagram: null,
        facebook: null,
        data_aprovacao: null,
        avaliacao_media: null,
        total_avaliacoes: 0
      });

      const response = await request(app)
        .post('/auth/registrar')
        .send(validFazedorData);

      expect(response.status).toBe(201);
      expect(response.body.usuario).toHaveProperty('tipo', 'fazedor');
      expect(response.body.usuario).toHaveProperty('tipo_fazedor', 'estilista');
      expect(response.body.usuario).toHaveProperty('status_aprovacao', 'pendente');
    });

    it('deve retornar erro 400 quando email já existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id_usuario: 1,
        email: validUserData.email,
        nome: 'Existente',
        senha_hash: 'hash',
        telefone: null,
        tipo: 'apreciador',
        status: 'ativo',
        foto_perfil: null,
        data_cadastro: new Date(),
        ultimo_acesso: null,
        reset_token: null,
        reset_token_expira: null
      });

      const response = await request(app)
        .post('/auth/registrar')
        .send(validUserData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email já cadastrado');
    });

    it('deve retornar erro 400 quando dados são inválidos', async () => {
      const invalidData = {
        nome: '',
        email: 'email_invalido',
        senha: '123',
        tipo: 'invalido'
      };

      const response = await request(app)
        .post('/auth/registrar')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('deve retornar erro 400 quando tipo_fazedor não é fornecido para fazedor', async () => {
      const invalidFazedorData = {
        nome: 'Teste',
        email: 'teste@email.com',
        senha: 'senha123',
        tipo: 'fazedor'
      };

      const response = await request(app)
        .post('/auth/registrar')
        .send(invalidFazedorData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    const validCredentials = {
      email: 'joao@email.com',
      senha: 'senha123'
    };

    const mockUser = {
      id_usuario: 1,
      nome: 'João Silva',
      email: 'joao@email.com',
      senha_hash: 'hashed_password',
      telefone: '11999999999',
      tipo: 'apreciador' as UsuarioTipo,
      status: 'ativo' as UsuarioStatus,
      foto_perfil: null,
      data_cadastro: new Date(),
      ultimo_acesso: null,
      reset_token: null,
      reset_token_expira: null
    };

    it('deve fazer login com sucesso', async () => {
      (compararSenha as jest.Mock).mockResolvedValue(true);
      (gerarToken as jest.Mock).mockReturnValue('fake_jwt_token');

      prismaMock.usuario.findUnique.mockResolvedValue(mockUser);
      prismaMock.usuario.update.mockResolvedValue({
        ...mockUser,
        ultimo_acesso: new Date()
      });
      prismaMock.fazedor.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login realizado com sucesso');
      expect(response.body).toHaveProperty('token', 'fake_jwt_token');
      expect(response.body.usuario).toHaveProperty('id', 1);
      expect(response.body.usuario).toHaveProperty('email', validCredentials.email);
    });

    it('deve fazer login de fazedor com dados completos', async () => {
      const mockFazedorUser = {
        ...mockUser,
        tipo: 'fazedor' as UsuarioTipo
      };

      const mockFazedor = {
        id_fazedor: 1,
        id_usuario: 1,
        tipo_fazedor: 'estilista' as FazedorTipo,
        status_aprovacao: 'aprovado' as FazedorStatusAprovacao,
        biografia: null,
        endereco: null,
        website: null,
        instagram: null,
        facebook: null,
        data_aprovacao: new Date(),
        avaliacao_media: new Decimal(4.0),
        total_avaliacoes: 10
      };

      (compararSenha as jest.Mock).mockResolvedValue(true);
      (gerarToken as jest.Mock).mockReturnValue('fake_jwt_token');

      prismaMock.usuario.findUnique.mockResolvedValue(mockFazedorUser);
      prismaMock.usuario.update.mockResolvedValue(mockFazedorUser);
      prismaMock.fazedor.findUnique.mockResolvedValue(mockFazedor);

      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials);

      expect(response.status).toBe(200);
      expect(response.body.usuario).toHaveProperty('tipo', 'fazedor');
      expect(response.body.usuario).toHaveProperty('status_aprovacao', 'aprovado');
      expect(response.body.usuario).toHaveProperty('tipo_fazedor', 'estilista');
    });

    it('deve retornar erro 401 quando email não existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Email ou senha inválidos');
    });

    it('deve retornar erro 401 quando senha está incorreta', async () => {
      (compararSenha as jest.Mock).mockResolvedValue(false);
      prismaMock.usuario.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Email ou senha inválidos');
    });

    it('deve retornar erro 401 quando usuário está bloqueado', async () => {
      const blockedUser = { ...mockUser, status: 'bloqueado' as UsuarioStatus };
      prismaMock.usuario.findUnique.mockResolvedValue(blockedUser);

      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Usuário bloqueado ou inativo');
    });

    it('deve retornar erro 400 quando credenciais são inválidas', async () => {
      const invalidCredentials = {
        email: 'email_invalido',
        senha: ''
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidCredentials);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /auth/me', () => {
    let authToken: string;

    beforeEach(() => {
      authToken = 'valid_jwt_token';
      (gerarToken as jest.Mock).mockReturnValue(authToken);
    });

    it('deve retornar dados do usuário autenticado', async () => {
      const mockUserProfile = {
        id_usuario: 1,
        nome: 'João Silva',
        email: 'joao@email.com',
        telefone: '11999999999',
        tipo: 'apreciador' as UsuarioTipo,
        status: 'ativo' as UsuarioStatus,
        senha_hash: 'hashed_password',
        foto_perfil: null,
        data_cadastro: new Date(),
        ultimo_acesso: null,
        reset_token: null,
        reset_token_expira: null
      };

      prismaMock.usuario.findUnique.mockResolvedValue(mockUserProfile);
      prismaMock.fazedor.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario).toHaveProperty('id', 1);
      expect(response.body.usuario).toHaveProperty('nome', 'João Silva');
    });

    it('deve retornar 404 quando usuário não encontrado', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Usuário não encontrado');
    });

    it('deve retornar 401 quando token não é fornecido', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/recuperar-senha', () => {
    it('deve gerar token de recuperação com sucesso', async () => {
      const mockUser = {
        id_usuario: 1,
        email: 'joao@email.com',
        nome: 'João Silva'
      };

      prismaMock.usuario.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.usuario.update.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/auth/recuperar-senha')
        .send({ email: 'joao@email.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('resetToken');
      expect(typeof response.body.resetToken).toBe('string');
      expect(response.body.resetToken.length).toBeGreaterThan(0);
    });

    it('deve retornar 404 quando email não existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/recuperar-senha')
        .send({ email: 'naoexiste@email.com' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Email não encontrado');
    });

    it('deve retornar 400 quando email é inválido', async () => {
      const response = await request(app)
        .post('/auth/recuperar-senha')
        .send({ email: 'email_invalido' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /auth/redefinir-senha', () => {
    const resetData = {
      token: 'valid_reset_token_123',
      nova_senha: 'novaSenha456'
    };

    it('deve redefinir senha com sucesso', async () => {
      const mockUser = {
        id_usuario: 1,
        email: 'joao@email.com',
        reset_token: resetData.token,
        reset_token_expira: new Date(Date.now() + 3600000)
      };

      (hashSenha as jest.Mock).mockResolvedValue('new_hashed_password');

      prismaMock.usuario.findFirst.mockResolvedValue(mockUser as any);
      prismaMock.usuario.update.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/auth/redefinir-senha')
        .send(resetData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Senha redefinida com sucesso');
    });

    it('deve retornar 400 quando token é inválido ou expirado', async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/redefinir-senha')
        .send(resetData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token inválido ou expirado');
    });

    it('deve retornar 400 quando nova senha é muito curta', async () => {
      const invalidData = {
        token: 'valid_token',
        nova_senha: '123'
      };

      const response = await request(app)
        .post('/auth/redefinir-senha')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
});
