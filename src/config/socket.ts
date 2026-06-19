import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

interface SocketUser {
  id_usuario: string;
  email: string;
  tipo: string;
}

const connectedUsers = new Map<string, string[]>(); // userId -> socketIds[]

export function configureSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware de autenticação
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Token de autenticação não fornecido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as SocketUser;

      if (!decoded.id_usuario || !decoded.email) {
        return next(new Error('Token inválido'));
      }

      socket.data.user = decoded;
      next();
    } catch (error) {
      logger.error('Erro na autenticação do socket:', error);
      next(new Error('Autenticação falhou'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    const userId = user.id_usuario;
    logger.info(`Socket conectado: ${socket.id} - Usuário: ${userId}`);
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, []);
    }
    connectedUsers.get(userId)?.push(socket.id);
    socket.join(`user:${userId}`);
    socket.join(`fazedor:${userId}`);
    socket.on('subscribe:evento', (eventoId: string) => {
      socket.join(`evento:${eventoId}`);
      logger.debug(`Usuário ${userId} inscrito no evento ${eventoId}`);
    });
    socket.on('unsubscribe:evento', (eventoId: string) => {
      socket.leave(`evento:${eventoId}`);
      logger.debug(`Usuário ${userId} desinscrito do evento ${eventoId}`);
    });
    socket.on('subscribe:servico', (servicoId: string) => {
      socket.join(`servico:${servicoId}`);
      logger.debug(`Usuário ${userId} inscrito no serviço ${servicoId}`);
    });
    socket.on('unsubscribe:servico', (servicoId: string) => {
      socket.leave(`servico:${servicoId}`);
      logger.debug(`Usuário ${userId} desinscrito do serviço ${servicoId}`);
    });
    socket.on('join:chat', (chatId: string) => {
      socket.join(`chat:${chatId}`);
      logger.debug(`Usuário ${userId} entrou no chat ${chatId}`);
    });
    socket.on('leave:chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`Usuário ${userId} saiu do chat ${chatId}`);
    });
    socket.on('ping', () => {
      socket.emit('pong');
    });
    socket.on('disconnect', () => {
      logger.info(`🔌 Socket desconectado: ${socket.id} - Usuário: ${userId}`);
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        const index = userSockets.indexOf(socket.id);
        if (index > -1) {
          userSockets.splice(index, 1);
        }
        if (userSockets.length === 0) {
          connectedUsers.delete(userId);
        }
      }
    });
  });

  return io;
}

export const SocketEmitter = {
  // Emitir para um usuário específico
  emitToUser: (io: SocketServer, userId: string, event: string, data: any) => {
    io.to(`user:${userId}`).emit(event, data);
  },
  // Emitir para uma sala de evento
  emitToEvento: (io: SocketServer, eventoId: string, event: string, data: any) => {
    io.to(`evento:${eventoId}`).emit(event, data);
  },
  // Emitir para uma sala de serviço
  emitToServico: (io: SocketServer, servicoId: string, event: string, data: any) => {
    io.to(`servico:${servicoId}`).emit(event, data);
  },
  // Emitir para um chat
  emitToChat: (io: SocketServer, chatId: string, event: string, data: any) => {
    io.to(`chat:${chatId}`).emit(event, data);
  },
  // Emitir para todos os fazedores
  emitToFazedores: (io: SocketServer, event: string, data: any) => {
    io.to('fazedor:*').emit(event, data);
  },
  // Verificar se usuário está online
  isUserOnline: (userId: string): boolean => {
    return connectedUsers.has(userId) && (connectedUsers.get(userId)?.length || 0) > 0;
  },
  // Obter quantidade de conexões de um usuário
  getUserConnections: (userId: string): number => {
    return connectedUsers.get(userId)?.length || 0;
  }
};
