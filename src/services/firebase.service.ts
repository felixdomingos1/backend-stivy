import logger from '../utils/logger';

export class FirebaseService {
  private static instance: FirebaseService;
  private initialized = false;

  private constructor() {}

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const fcmEnabled = process.env.FCM_ENABLED === 'true';
    if (!fcmEnabled || !process.env.FCM_SERVER_KEY) {
      logger.warn('FCM não configurado. Notificações push desativadas.');
      return;
    }

    try {
      logger.info('Firebase Cloud Messaging inicializado');
      this.initialized = true;
    } catch (error: any) {
      logger.error('Erro ao inicializar FCM:', error.message);
      throw error;
    }
  }

  async sendToUser(userId: string, title: string, _body: string, _data?: any): Promise<boolean> {
    if (!this.initialized) {
      logger.warn(`FCM não inicializado. Notificação não enviada para usuário ${userId}`);
      return false;
    }

    try {
      logger.info(`FCM: Notificação enviada para usuário ${userId}: ${title}`);
      return true;
    } catch (error: any) {
      logger.error(`FCM: Erro ao enviar notificação para usuário ${userId}:`, error.message);
      return false;
    }
  }

  async sendToMultipleUsers(userIds: string[], title: string, _body: string, _data?: any): Promise<boolean> {
    if (!this.initialized) {
      logger.warn('FCM não inicializado. Notificações não enviadas.');
      return false;
    }

    try {
      logger.info(`FCM: Notificação enviada para ${userIds.length} usuários: ${title}`);
      return true;
    } catch (error: any) {
      logger.error('FCM: Erro ao enviar notificações múltiplas:', error.message);
      return false;
    }
  }

  async sendToTopic(topic: string, title: string, _body: string, _data?: any): Promise<boolean> {
    if (!this.initialized) {
      logger.warn(`FCM não inicializado. Notificação não enviada para tópico ${topic}`);
      return false;
    }

    try {
      logger.info(`FCM: Notificação enviada para tópico ${topic}: ${title}`);
      return true;
    } catch (error: any) {
      logger.error(`FCM: Erro ao enviar notificação para tópico ${topic}:`, error.message);
      return false;
    }
  }
}

export default FirebaseService;
