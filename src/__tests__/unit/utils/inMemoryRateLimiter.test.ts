import { InMemoryRateLimiter } from '../../../config/redis';

jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

describe('InMemoryRateLimiter (fallback sem Redis)', () => {
  it('should block after maxRequests within the window', () => {
    const rl = new InMemoryRateLimiter();
    for (let i = 0; i < 3; i++) {
      expect(rl.checkLimit('ip:1', 3, 60).allowed).toBe(true);
    }
    const r = rl.checkLimit('ip:1', 3, 60);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    // outra chave não é afectada
    expect(rl.checkLimit('ip:2', 3, 60).allowed).toBe(true);
  });
});
