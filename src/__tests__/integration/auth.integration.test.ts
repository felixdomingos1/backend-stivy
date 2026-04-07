import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../server';

const prisma = new PrismaClient();

describe('Testes de Integração - Auth', () => {
  beforeAll(async () => {
    await prisma.fazedor.deleteMany();
    await prisma.usuario.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Fluxo completo de autenticação', () => {
    it('deve completar o fluxo de registro e login', async () => {
      const registerResponse = await request(app)
        .post('/auth/registrar')
        .send({
          nome: 'Usuário Teste',
          email: 'teste@email.com',
          senha: 'senha123',
          tipo: 'apreciador'
        });

      expect(registerResponse.status).toBe(201);
      const token = registerResponse.body.token;

      const profileResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.usuario.email).toBe('teste@email.com');

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'teste@email.com',
          senha: 'senha123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
    });
  });
});
