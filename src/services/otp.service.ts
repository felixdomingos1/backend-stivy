import crypto from 'crypto';

export class OTPService {
  private static instance: OTPService;

  private constructor() { }

  public static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  generateVerificationCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  isOTPValid(codigo: string, codigoSalvo: string | null, expira: Date | null): boolean {
    if (!codigoSalvo || !expira) return false;
    if (codigo !== codigoSalvo) return false;
    if (new Date() > expira) return false;
    return true;
  }

  getExpirationDate(): Date {
    return new Date(Date.now() + 15 * 60 * 1000);
  }
}
