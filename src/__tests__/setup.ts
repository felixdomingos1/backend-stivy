process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SALT_ROUNDS = '10';
process.env.SMTP_HOST = '';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';

const originalEnv = { ...process.env };

export const resetEnv = () => {
  process.env = { ...originalEnv };
};

describe('setup', () => {
  it('should set test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
