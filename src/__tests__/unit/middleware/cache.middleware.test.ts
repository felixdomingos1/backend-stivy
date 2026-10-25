import { Request } from 'express';
import { buildCacheKey, normalizarPadraoCache, cacheListResponse } from '../../../middleware/cache.middleware';
import { cacheService } from '../../../config/redis';
import { generateTestToken, mockResponse } from '../../helpers';

jest.mock('../../../config/database', () => ({ __esModule: true, default: {} }));
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const minimatchRedis = (pattern: string, key: string): boolean => {
  const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return re.test(key);
};

describe('cache.middleware', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('buildCacheKey', () => {
    it('should include the user id', () => {
      expect(buildCacheKey('list', '/api/v1/events?page=1', 'u1')).toBe('cache:list:/api/v1/events?page=1|u:u1');
    });

    it('should use anon when there is no user', () => {
      expect(buildCacheKey('detail', '/api/v1/events/1', null)).toBe('cache:detail:/api/v1/events/1|u:anon');
    });
  });

  describe('normalizarPadraoCache', () => {
    const keyU1 = buildCacheKey('list', '/api/v1/events?page=1', 'u1');
    const keyAnon = buildCacheKey('detail', '/api/v1/events/abc', null);

    it('should match all users and prefixes for /api/v1/events*', () => {
      const p = normalizarPadraoCache('/api/v1/events*');
      expect(p).toBe('cache:*:/api/v1/events*');
      expect(minimatchRedis(p, keyU1)).toBe(true);
      expect(minimatchRedis(p, keyAnon)).toBe(true);
    });

    it('should match an exact URL for all users', () => {
      const p = normalizarPadraoCache('/api/v1/events/abc');
      expect(minimatchRedis(p, keyAnon)).toBe(true);
      expect(minimatchRedis(p, buildCacheKey('detail', '/api/v1/events/abc', 'u9'))).toBe(true);
      expect(minimatchRedis(p, buildCacheKey('detail', '/api/v1/events/abcd', 'u9'))).toBe(false);
    });

    it('should keep accepting legacy patterns', () => {
      const p = normalizarPadraoCache('list:*/api/events*');
      expect(p).toBe('cache:list:*/api/v1/events*');
      expect(minimatchRedis(p, keyU1)).toBe(true);
      expect(minimatchRedis(p, keyAnon)).toBe(false);
    });
  });

  describe('cacheResponse', () => {
    const buildReq = (headers: any = {}, extra: any = {}) =>
      ({ method: 'GET', originalUrl: '/api/v1/events?page=1', url: '/?page=1', headers, query: {}, ...extra } as unknown as Request);

    it('should key the cache by the authenticated user (Bearer token)', async () => {
      const get = jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      const token = generateTestToken({ id: 'user-123' });
      const next = jest.fn();

      await cacheListResponse(60)(buildReq({ authorization: `Bearer ${token}` }), mockResponse(), next);

      expect(get).toHaveBeenCalledWith('cache:list:/api/v1/events?page=1|u:user-123');
      expect(next).toHaveBeenCalled();
    });

    it('should prefer req.usuarioId when set', async () => {
      const get = jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      await cacheListResponse(60)(buildReq({}, { usuarioId: 'abc' }), mockResponse(), jest.fn());
      expect(get).toHaveBeenCalledWith('cache:list:/api/v1/events?page=1|u:abc');
    });

    it('should bypass the cache with an invalid token', async () => {
      const get = jest.spyOn(cacheService, 'get');
      const next = jest.fn();
      await cacheListResponse(60)(buildReq({ authorization: 'Bearer invalido' }), mockResponse(), next);
      expect(get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should not cache non-2xx responses', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      const set = jest.spyOn(cacheService, 'set').mockResolvedValue(true);
      const res = mockResponse();
      res.statusCode = 401;
      res.headersSent = false;
      await cacheListResponse(60)(buildReq(), res, jest.fn());
      res.json({ error: 'Não autorizado' });
      expect(set).not.toHaveBeenCalled();
    });
  });
});
