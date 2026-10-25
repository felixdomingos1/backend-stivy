import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './database';
import logger from '../utils/logger';
import { startCleanExpiredStoriesJob } from '../jobs/cleanExpiredstories';

interface SocketUser {
  id: string;
  email?: string;
  tipo?: string;
  nome?: string;
}

const connectedUsers = new Map<string, string[]>(); // userId -> socketIds[]
let ioInstance: SocketServer | null = null;

export const getIO = (): SocketServer | null => ioInstance;

/** Emite um evento para a sala pessoal `user:<id>` (todas as ligações do utilizador). */
export const emitToUser = (userId: string, event: string, payload: any): void => {
  if (!ioInstance || !userId) return;
  try {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  } catch (error) {
    logger.error(`[SOCKET] Erro ao emitir ${event} para user:${userId}:`, error);
  }
};

/** Emite um evento para a sala de conversa `chat:<id>`. */
export const emitToConversa = (conversaId: string, event: string, payload: any): void => {
  if (!ioInstance || !conversaId) return;
  try {
    ioInstance.to(`chat:${conversaId}`).emit(event, payload);
  } catch (error) {
    logger.error(`[SOCKET] Erro ao emitir ${event} para chat:${conversaId}:`, error);
  }
};

const extractToken = (socket: Socket): string | undefined => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken) {
    return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
  }
  const queryToken = socket.handshake.query?.token;
  if (typeof queryToken === 'string' && queryToken) return queryToken;
  const header = socket.handshake.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return undefined;
};

const extractConversaId = (data: any): string | undefined => {
  if (typeof data === 'string') return data;
  if (data && typeof data.id_conversa === 'string') return data.id_conversa;
  return undefined;
};

const isParticipante = async (conversaId: string, userId: string): Promise<boolean> => {
  const participante = await prisma.conversaParticipante.findUnique({
    where: { id_conversa_id_usuario: { id_conversa: conversaId, id_usuario: userId } },
    select: { id_participante: true },
  });
  return !!participante;
};

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

  ioInstance = io;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('[SOCKET] JWT_SECRET não configurado: todas as ligações Socket.IO serão recusadas');
  }

  // Middleware de autenticação
  io.use(async (socket: Socket, next) => {
    try {
      if (!jwtSecret) {
        return next(new Error('Autenticação indisponível'));
      }

      const token = extractToken(socket);
      if (!token) {
        return next(new Error('Token de autenticação não fornecido'));
      }

      const decoded = jwt.verify(token, jwtSecret) as any;
      const id = decoded?.id || decoded?.id_usuario;
      if (!id) {
        return next(new Error('Token inválido'));
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: id },
        select: { id_usuario: true, nome: true, tipo: true, status: true },
      });
      if (!usuario || usuario.status !== 'ativo') {
        return next(new Error('Usuário inválido ou inativo'));
      }

      socket.data.user = { id, email: decoded.email, tipo: usuario.tipo, nome: usuario.nome } as SocketUser;
      next();
    } catch (error: any) {
      logger.warn(`[SOCKET] Autenticação falhou: ${error?.message}`);
      next(new Error('Autenticação falhou'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    const userId = user.id;
    logger.info(`Socket conectado: ${socket.id} - Usuário: ${userId}`);

    const wasOnline = connectedUsers.has(userId);
    if (!wasOnline) {
      connectedUsers.set(userId, []);
    }
    connectedUsers.get(userId)?.push(socket.id);
    socket.join(`user:${userId}`);
    if (!wasOnline) {
      socket.broadcast.emit('user:online', { id_usuario: userId });
    }

    socket.on('subscribe:evento', (eventoId: string) => {
      if (typeof eventoId === 'string') socket.join(`evento:${eventoId}`);
    });
    socket.on('unsubscribe:evento', (eventoId: string) => {
      if (typeof eventoId === 'string') socket.leave(`evento:${eventoId}`);
    });
    socket.on('subscribe:servico', (servicoId: string) => {
      if (typeof servicoId === 'string') socket.join(`servico:${servicoId}`);
    });
    socket.on('unsubscribe:servico', (servicoId: string) => {
      if (typeof servicoId === 'string') socket.leave(`servico:${servicoId}`);
    });

    const joinConversa = async (data: any, ack?: (res: any) => void) => {
      const conversaId = extractConversaId(data);
      if (!conversaId) {
        if (typeof ack === 'function') ack({ success: false, error: 'id_conversa obrigatório' });
        return;
      }
      try {
        if (!(await isParticipante(conversaId, userId))) {
          logger.warn(`[SOCKET] Usuário ${userId} tentou entrar na conversa ${conversaId} sem ser participante`);
          if (typeof ack === 'function') ack({ success: false, error: 'Sem permissão' });
          return;
        }
        socket.join(`chat:${conversaId}`);
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        logger.error('[SOCKET] Erro em chat:join:', error);
        if (typeof ack === 'function') ack({ success: false, error: 'Erro interno' });
      }
    };

    const leaveConversa = (data: any) => {
      const conversaId = extractConversaId(data);
      if (conversaId) socket.leave(`chat:${conversaId}`);
    };

    socket.on('chat:join', joinConversa);
    socket.on('join:chat', joinConversa); // compatibilidade
    socket.on('chat:leave', leaveConversa);
    socket.on('leave:chat', leaveConversa); // compatibilidade

    socket.on('chat:typing', (data: any) => {
      const conversaId = extractConversaId(data);
      if (!conversaId || !socket.rooms.has(`chat:${conversaId}`)) return;
      socket.to(`chat:${conversaId}`).emit('chat:typing', {
        id_conversa: conversaId,
        id_usuario: userId,
        nome: user.nome,
      });
    });

    socket.on('chat:stopTyping', (data: any) => {
      const conversaId = extractConversaId(data);
      if (!conversaId || !socket.rooms.has(`chat:${conversaId}`)) return;
      socket.to(`chat:${conversaId}`).emit('chat:stopTyping', {
        id_conversa: conversaId,
        id_usuario: userId,
        nome: user.nome,
      });
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      logger.info(`Socket desconectado: ${socket.id} - Usuário: ${userId}`);
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        const index = userSockets.indexOf(socket.id);
        if (index > -1) {
          userSockets.splice(index, 1);
        }
        if (userSockets.length === 0) {
          connectedUsers.delete(userId);
          socket.broadcast.emit('user:offline', { id_usuario: userId });
        }
      }
    });
  });

  // Jobs periódicos de domínio (arrancam uma única vez, junto com o servidor)
  if (process.env.NODE_ENV !== 'test') {
    startCleanExpiredStoriesJob();
  }

  return io;
}

export const SocketEmitter = {
  emitToUser: (_io: SocketServer | null, userId: string, event: string, data: any) => {
    emitToUser(userId, event, data);
  },
  emitToEvento: (io: SocketServer, eventoId: string, event: string, data: any) => {
    io.to(`evento:${eventoId}`).emit(event, data);
  },
  emitToServico: (io: SocketServer, servicoId: string, event: string, data: any) => {
    io.to(`servico:${servicoId}`).emit(event, data);
  },
  emitToChat: (_io: SocketServer | null, chatId: string, event: string, data: any) => {
    emitToConversa(chatId, event, data);
  },
  isUserOnline: (userId: string): boolean => {
    return connectedUsers.has(userId) && (connectedUsers.get(userId)?.length || 0) > 0;
  },
  getUserConnections: (userId: string): number => {
    return connectedUsers.get(userId)?.length || 0;
  }
};
