import { format, formatDistance, formatRelative, subDays, addDays, isAfter, isBefore, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class DateUtils {
  static formatDate(date: Date | string, pattern: string = 'dd/MM/yyyy'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, pattern, { locale: ptBR });
  }

  static formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  }

  static formatRelative(date: Date | string, baseDate: Date = new Date()): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatRelative(d, baseDate, { locale: ptBR });
  }

  static formatDistance(date: Date | string, baseDate: Date = new Date()): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDistance(d, baseDate, { locale: ptBR, addSuffix: true });
  }

  static isExpired(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return isAfter(new Date(), d);
  }

  static isFuture(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return isAfter(d, new Date());
  }

  static daysBetween(start: Date | string, end: Date | string): number {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    return differenceInDays(e, s);
  }

  static hoursBetween(start: Date | string, end: Date | string): number {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    return differenceInHours(e, s);
  }

  static minutesBetween(start: Date | string, end: Date | string): number {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    return differenceInMinutes(e, s);
  }

  static addDays(date: Date | string, days: number): Date {
    const d = typeof date === 'string' ? new Date(date) : date;
    return addDays(d, days);
  }

  static subDays(date: Date | string, days: number): Date {
    const d = typeof date === 'string' ? new Date(date) : date;
    return subDays(d, days);
  }

  static startOfDay(date: Date | string): Date {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  static endOfDay(date: Date | string): Date {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  static isToday(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  }

  static isThisWeek(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const weekStart = subDays(today, today.getDay());
    const weekEnd = addDays(weekStart, 7);
    return isAfter(d, weekStart) && isBefore(d, weekEnd);
  }

  static isThisMonth(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }

  static getAge(birthDate: Date | string): number {
    const today = new Date();
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  static toISO(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString();
  }

  static fromISO(isoString: string): Date {
    return new Date(isoString);
  }

  static isValid(date: any): boolean {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }
}

export default DateUtils;
