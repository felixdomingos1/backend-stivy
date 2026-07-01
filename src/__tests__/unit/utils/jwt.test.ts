import jwt from 'jsonwebtoken';
import prisma from '../../../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verificarToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
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
});
