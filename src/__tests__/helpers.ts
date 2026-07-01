import { JwtPayload } from '../types';

const prismaModelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
  upsert: jest.fn(),
});

export const mockPrisma = () => ({
  usuario: prismaModelMock(),
  fazedor: prismaModelMock(),
  refreshToken: prismaModelMock(),
  conversa: prismaModelMock(),
  mensagem: prismaModelMock(),
  conversaParticipante: prismaModelMock(),
  notificacao: prismaModelMock(),
  seguidor: prismaModelMock(),
  favorito: prismaModelMock(),
  servico: prismaModelMock(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $on: jest.fn(),
  $use: jest.fn(),
  $transaction: jest.fn(),
});

export type MockPrismaClient = ReturnType<typeof mockPrisma>;

export const mockRequest = (overrides: Partial<any> = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: undefined,
  ip: '127.0.0.1',
  ...overrides,
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  return res;
};

export const buildTestUser = (overrides: Partial<any> = {}) => ({
  id_usuario: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Test User',
  email: 'test@stivy.com',
  senha_hash: '$2a$10$dummyhash',
  telefone: '+244900000000',
  tipo: 'apreciador',
  foto_perfil: null,
  data_cadastro: new Date('2026-01-01'),
  status: 'ativo',
  ultimo_acesso: null,
  reset_token: null,
  reset_token_expira: null,
  email_verificado: false,
  email_verification_code: null,
  email_verification_expira: null,
  verification_attempts: 0,
  foto_perfil_public_id: null,
  banner_url: null,
  banner_public_id: null,
  reset_password_code: null,
  reset_password_expira: null,
  reset_password_attempts: 0,
  ...overrides,
});

export const buildTestFazedor = (overrides: Partial<any> = {}) => ({
  id_fazedor: '660e8400-e29b-41d4-a716-446655440001',
  id_usuario: '550e8400-e29b-41d4-a716-446655440000',
  tipo_fazedor: 'maquiador',
  biografia: 'Test bio',
  endereco: null,
  website: null,
  instagram: null,
  facebook: null,
  status_aprovacao: 'aprovado',
  data_aprovacao: null,
  avaliacao_media: null,
  total_avaliacoes: 0,
  capa_url: null,
  capa_public_id: null,
  ...overrides,
});

export const generateTestToken = (payload: Partial<JwtPayload> = {}): string => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@stivy.com',
      tipo: 'apreciador',
      isVerified: true,
      ...payload,
    },
    process.env.JWT_SECRET || 'test-secret-key'
  );
};
