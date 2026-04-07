// utils/sanitize.ts
import xss from 'xss';

export class SanitizeUtils {
  static sanitizeString(input: string | null | undefined): string {
    if (!input) return '';
    return xss(input.trim());
  }

  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  static sanitizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      return '';
    }
  }

  static sanitizeHtml(html: string): string {
    return xss(html, {
      whiteList: {
        p: ['class', 'style'],
        br: [],
        strong: [],
        b: [],
        em: [],
        i: [],
        u: [],
        a: ['href', 'target', 'rel'],
        ul: [],
        ol: [],
        li: [],
        h1: ['class'],
        h2: ['class'],
        h3: ['class'],
        h4: ['class'],
        img: ['src', 'alt', 'width', 'height']
      }
    });
  }

  static sanitizeObject<T extends object>(obj: T): T {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  static sanitizeRequestBody<T extends object>(req: any): T {
    return this.sanitizeObject(req.body);
  }

  static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static normalizeString(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  static slugify(text: string): string {
    return this.normalizeString(text)
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static truncate(text: string, length: number = 100, suffix: string = '...'): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + suffix;
  }

  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static capitalizeWords(str: string): string {
    return str.split(' ').map(word => this.capitalize(word)).join(' ');
  }

  static removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  static isValidCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  static isValidCNPJ(cnpj: string): boolean {
    cnpj = cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    const digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  }
}

export default SanitizeUtils;
