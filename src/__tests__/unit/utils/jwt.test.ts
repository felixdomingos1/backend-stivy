import jwt from 'jsonwebtoken';
import prisma from '../../../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verificarToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  gerarToken,
  rotateRefreshToken,
} from '../../../utils/jwt';
import { JwtPayload } from '../../../types';

jest.mock('../../../config/database', () => ({
  __esModule: true,
  default: {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockedPrisma = jest.mocked(prisma);

describe('JWT Utils', () => {
  const payload: JwtPayload = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@stivy.com',
    tipo: 'apreciador',
    isVerified: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(payload);
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.tipo).toBe(payload.tipo);
      expect(decoded.isVerified).toBe(payload.isVerified);
    });

    it('should include an expiration', () => {
      const token = generateAccessToken(payload);
      const decoded: any = jwt.decode(token);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should create a refresh token in the database', async () => {
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: 'token-uuid',
        id_usuario: payload.id,
        token: 'some-hex-token',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        revoked: false,
      });

      const token = await generateRefreshToken(payload.id);

      expect(typeof token).toBe('string');
      expect(token.length).toBe(80);
      expect(mockedPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_usuario: payload.id,
            token: expect.any(String),
            expires_at: expect.any(Date),
          }),
        })
      );
    });

    it('should generate a hex string token', async () => {
      const hexRegex = /^[a-f0-9]{80}$/;
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({ token: '' });

      const token = await generateRefreshToken(payload.id);
      expect(token).toMatch(hexRegex);
    });
  });

  describe('verificarToken', () => {
    it('should verify a valid token', () => {
      const token = generateAccessToken(payload);
      const decoded = verificarToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw on an invalid token', () => {
      expect(() => verificarToken('invalid-token')).toThrow();
    });

    it('should throw on an expired token', () => {
      const expired = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET!);
      expect(() => verificarToken(expired)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      (mockedPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id_usuario: payload.id,
        revoked: false,
        expires_at: futureDate,
      });

      const result = await verifyRefreshToken('valid-token');
      expect(result.id_usuario).toBe(payload.id);
    });

    it('should throw if token is not found', async () => {
      (mockedPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(verifyRefreshToken('nonexistent')).rejects.toThrow('Refresh token inválido ou expirado');
    });

    it('should throw if token is revoked', async () => {
      (mockedPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id_usuario: payload.id,
        revoked: true,
        expires_at: new Date(Date.now() + 86400000),
      });

      await expect(verifyRefreshToken('revoked-token')).rejects.toThrow('Refresh token inválido ou expirado');
    });

    it('should throw if token is expired', async () => {
      (mockedPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id_usuario: payload.id,
        revoked: false,
        expires_at: new Date(Date.now() - 86400000),
      });

      await expect(verifyRefreshToken('expired-token')).rejects.toThrow('Refresh token inválido ou expirado');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token', async () => {
      (mockedPrisma.refreshToken.update as jest.Mock).mockResolvedValue({});

      await revokeRefreshToken('token-to-revoke');

      expect(mockedPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'token-to-revoke' },
        data: { revoked: true },
      });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      (mockedPrisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await revokeAllUserTokens(payload.id);

      expect(mockedPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id_usuario: payload.id, revoked: false },
        data: { revoked: true },
      });
    });
  });

  describe('gerarToken (expiração)', () => {
    const original = process.env.JWT_EXPIRES_IN;
    afterEach(() => {
      if (original === undefined) delete process.env.JWT_EXPIRES_IN;
      else process.env.JWT_EXPIRES_IN = original;
    });

    it('should default to 1 day when JWT_EXPIRES_IN is not set', () => {
      delete process.env.JWT_EXPIRES_IN;
      const decoded: any = jwt.decode(gerarToken(payload));
      expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
    });

    it('should respect JWT_EXPIRES_IN', () => {
      process.env.JWT_EXPIRES_IN = '2h';
      const decoded: any = jwt.decode(gerarToken(payload));
      expect(decoded.exp - decoded.iat).toBe(2 * 60 * 60);
    });

    it('should respect an explicit time argument', () => {
      const decoded: any = jwt.decode(gerarToken(payload, '1h'));
      expect(decoded.exp - decoded.iat).toBe(60 * 60);
    });

    it('generateAccessToken should always expire', () => {
      delete process.env.JWT_EXPIRES_IN;
      const decoded: any = jwt.decode(generateAccessToken(payload));
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('rotateRefreshToken', () => {
    const futuro = new Date(Date.now() + 86400000);

    it('should revoke the old token before issuing a new one', async () => {
      (mockedPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id_usuario: payload.id, revoked: false, expires_at: futuro,
      });
      (mockedPrisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await rotateRefreshToken('old');

      expect(result.id_usuario).toBe(payload.id);
      expect(result.refreshToken).toMatch(/^[a-f0-9]{80}$/);
      expect(mockedPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'old', revoked: false },
        data: { revoked: true },
      });
      const ordemRevoke = (mockedPrisma.refreshToken.updateMany as jest.Mock).mock.invocationCallOrder[0];
      const ordemCreate = (mockedPrisma.refreshToken.create as jest.Mock).mock.invocationCallOrder[0];
      expect(ordemRevoke).toBeLessThan(ordemCreate);
    });

    it('should revoke all sessions when a revoked token is reused', async () => {
      (mockedPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id_usuario: payload.id, revoked: true, expires_at: futuro,
      });
      (mockedPrisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await expect(rotateRefreshToken('reused')).rejects.toThrow(/reutilizado/);
      expect(mockedPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id_usuario: payload.id, revoked: false },
        data: { revoked: true },
      });
      expect(mockedPrisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should reject unknown and expired tokens', async () => {
      (mockedPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(rotateRefreshToken('x')).rejects.toThrow('Refresh token inválido ou expirado');

      (mockedPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id_usuario: payload.id, revoked: false, expires_at: new Date(Date.now() - 1000),
      });
      await expect(rotateRefreshToken('y')).rejects.toThrow('Refresh token inválido ou expirado');
    });
  });
});
