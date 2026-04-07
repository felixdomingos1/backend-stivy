// src/services/email.service.ts
import nodemailer from 'nodemailer';
import logger from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter!: nodemailer.Transporter;
  private isConfigured: boolean;
  private connectionVerified: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.isConfigured = this.checkConfiguration();

    if (!this.isConfigured) {
      logger.warn('⚠️ Serviço de email não configurado. Os emails serão registrados mas não enviados.');
      return;
    }

    this.initializeTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private checkConfiguration(): boolean {
    const hasOldConfig = !!(process.env.EMAIL_SERVICE &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS);
    const hasNewConfig = !!(process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS);

    return !!(hasOldConfig || hasNewConfig);
  }

  private initializeTransporter(): void {
    const hasNewConfig = !!(process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS);

    if (hasNewConfig) {
      // Configuração SMTP (recomendado para Gmail)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: this.cleanPassword(process.env.SMTP_PASS),
        },
        debug: false, // Desabilitar debug em produção
        logger: false,
        pool: true, // Pool de conexões
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 5, // Limitar envios por segundo
      });
    } else {
      // Configuração de serviço
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: this.cleanPassword(process.env.EMAIL_PASS),
        },
        debug: false,
        logger: false,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });
    }

    logger.info('📧 Serviço de email inicializado com pool de conexões');
  }

  private cleanPassword(password: string | undefined): string {
    if (!password) return '';
    // Remove espaços extras e quebras de linha
    return password.trim().replace(/\s+/g, '');
  }

  /**
   * Inicializa a conexão com o serviço de email (uma única vez)
   */
  public async initialize(): Promise<void> {
    if (!this.isConfigured) return;

    if (this.connectionVerified) {
      logger.debug('✅ Conexão com email já estabelecida');
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.verifyConnection();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      // Verificar conexão com timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na verificação do email (10s)')), 10000);
      });

      const verifyPromise = this.transporter.verify();
      await Promise.race([verifyPromise, timeoutPromise]);

      this.connectionVerified = true;
      logger.info('✅ Conexão com serviço de email estabelecida com sucesso');
    } catch (error: any) {
      this.connectionVerified = false;
      logger.error('❌ Conexão com serviço de email falhou:', error.message);
      throw new Error(`Email service unavailable: ${error.message}`);
    }
  }

  public async sendEmail(options: EmailOptions): Promise<void> {
    // Garantir que a conexão está inicializada
    if (this.isConfigured && !this.connectionVerified) {
      await this.initialize();
    }

    if (!this.isConfigured) {
      logger.info(`[EMAIL SIMULADO] Para: ${options.to}, Assunto: ${options.subject}`);
      this.logEmailForDevelopment(options);
      return;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || "noreply@stivy.com",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      // Timeout para envio
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout de email após 15 segundos")), 15000);
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      const info = (await Promise.race([sendPromise, timeoutPromise])) as any;

      logger.info(`📧 Email enviado para ${options.to} - Message ID: ${info.messageId}`);
    } catch (error: any) {
      logger.error('❌ Falha no envio de email:', error.message);

      // Se falhar por autenticação, marcar como não verificado
      if (error.message.includes('Invalid login') || error.message.includes('535')) {
        this.connectionVerified = false;
        throw new Error('Falha na autenticação do email. Verifique suas credenciais.');
      }

      throw new Error(`Falha ao enviar email: ${error.message}`);
    }
  }

  private logEmailForDevelopment(options: EmailOptions): void {
    // Extrair código OTP para desenvolvimento
    const otpMatch = options.html.match(/\b\d{6}\b/);
    if (otpMatch && otpMatch[0]) {
      logger.info(`🔑 [DEV] Código de verificação para ${options.to}: ${otpMatch[0]}`);
    }

    // Extrair token de recuperação
    const tokenMatch = options.html.match(/token=([a-f0-9]+)/i);
    if (tokenMatch && tokenMatch[1]) {
      logger.info(`🔑 [DEV] Token de recuperação: ${tokenMatch[1]}`);
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Templates de email
  public async sendVerificationEmail(to: string, nome: string, otpCode: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Verifique seu email - STIVY</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .code { font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #f0f0f0; border-radius: 10px; letter-spacing: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>STIVY</h1>
            <p>Moda Angolana</p>
          </div>
          <div class="content">
            <h2>Olá ${nome}!</h2>
            <p>Bem-vindo ao STIVY! Para confirmar seu email, utilize o código abaixo:</p>
            <div class="code">${otpCode}</div>
            <p>Este código expira em 15 minutos.</p>
            <p>Se não foi você que criou esta conta, ignore este email.</p>
          </div>
          <div class="footer">
            <p>© 2026 STIVY - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to, subject: '🔐 Verifique seu email - STIVY', html });
  }

  public async sendWelcomeEmail(to: string, nome: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bem-vindo ao STIVY</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo ao STIVY! 🎉</h1>
          </div>
          <div class="content">
            <h2>Olá ${nome}!</h2>
            <p>Seu email foi verificado com sucesso!</p>
            <p>Agora você pode aproveitar todos os recursos da plataforma:</p>
            <ul>
              <li>Descobrir profissionais da moda</li>
              <li>Participar de eventos exclusivos</li>
              <li>Contratar serviços com segurança</li>
            </ul>
            <p>Complete seu perfil e comece sua jornada no mundo da moda angolana!</p>
          </div>
          <div class="footer">
            <p>© 2026 STIVY - Moda Angolana</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to, subject: '🎉 Bem-vindo ao STIVY!', html });
  }

  public async sendPasswordResetEmail(to: string, nome: string, resetToken: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/redefinir-senha?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Redefinir Senha - STIVY</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b6b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 10px 20px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Redefinir Senha</h1>
          </div>
          <div class="content">
            <h2>Olá ${nome}!</h2>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Redefinir Senha</a>
            </p>
            <p>Se não foi você que solicitou, ignore este email.</p>
            <hr>
            <p><small>Token: ${resetToken}</small></p>
          </div>
          <div class="footer">
            <p>© 2026 STIVY - Moda Angolana</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to, subject: '🔐 Redefinição de Senha - STIVY', html });
  }



  public async sendPasswordResetOTPEmail(to: string, nome: string, otpCode: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha - STIVY</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .otp-box { background: #f8f9fa; border: 2px dashed #ff6b6b; border-radius: 15px; padding: 25px; text-align: center; margin: 25px 0; }
          .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #ff6b6b; font-family: monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; font-size: 14px; }
          .footer { text-align: center; padding: 20px; background: #f8f9fa; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Recuperação de Senha</h1>
            <p>STIVY - Moda Angolana</p>
          </div>
          <div class="content">
            <h2>Olá ${nome}!</h2>
            <p>Recebemos uma solicitação para redefinir sua senha na plataforma STIVY.</p>

            <div class="otp-box">
              <p style="margin: 0 0 10px; color: #666;">🔑 Seu código de verificação é:</p>
              <div class="otp-code">${otpCode}</div>
              <p style="margin: 10px 0 0; font-size: 14px; color: #666;">Este código expira em <strong>15 minutos</strong></p>
            </div>

            <div class="warning">
              <strong>⚠️ Atenção:</strong> Por segurança, não compartilhe este código com ninguém.
            </div>

            <p>Se você não solicitou esta redefinição, por favor ignore este email.</p>
            <hr>
            <p><small>Digite este código no aplicativo STIVY para redefinir sua senha.</small></p>
          </div>
          <div class="footer">
            <p>© 2026 STIVY - Moda Angolana. Todos os direitos reservados.</p>
            <p>Luanda, Angola</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: '🔐 Código de recuperação de senha - STIVY',
      html
    });
  }
  
}
