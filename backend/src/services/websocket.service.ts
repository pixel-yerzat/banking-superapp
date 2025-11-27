import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verify } from 'jsonwebtoken';
import config from '../config/config';
import logger from '../utils/logger';
import { TokenPayload } from '../types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let io: SocketIOServer;

/**
 * Инициализация WebSocket сервера
 */
export const initializeWebSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // В production указать конкретные домены
      methods: ['GET', 'POST'],
    },
  });

  // Middleware для аутентификации
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = verify(token, config.jwt.secret) as TokenPayload;
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Обработка подключений
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('WebSocket client connected', { 
      socketId: socket.id,
      userId: socket.userId,
    });

    // Присоединяем пользователя к его персональной комнате
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      
      // Отправляем подтверждение подключения
      socket.emit('connected', {
        message: 'Successfully connected to notification service',
        userId: socket.userId,
      });
    }

    // Обработка отключения
    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
      });
    });

    // Ping-pong для поддержания соединения
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Запрос количества непрочитанных уведомлений
    socket.on('get:unread-count', async () => {
      if (!socket.userId) return;

      try {
        // Здесь можно импортировать сервис и получить count
        // Для примера отправляем тестовое значение
        socket.emit('unread-count', { count: 0 });
      } catch (error) {
        logger.error('Error getting unread count via socket:', error);
      }
    });
  });

  logger.info('WebSocket server initialized');

  return io;
};

/**
 * Получение экземпляра WebSocket сервера
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
};

/**
 * Отправка уведомления конкретному пользователю
 */
export const sendNotificationToUser = (
  userId: string,
  notification: any
): void => {
  if (!io) {
    logger.warn('WebSocket server not initialized, cannot send notification');
    return;
  }

  io.to(`user:${userId}`).emit('notification', notification);
  
  logger.info('Real-time notification sent', {
    userId,
    notificationId: notification.id,
    type: notification.notification_type,
  });
};

/**
 * Отправка обновления количества непрочитанных
 */
export const sendUnreadCountUpdate = (
  userId: string,
  count: number
): void => {
  if (!io) {
    logger.warn('WebSocket server not initialized, cannot send unread count');
    return;
  }

  io.to(`user:${userId}`).emit('unread-count', { count });
  
  logger.info('Unread count update sent', { userId, count });
};

/**
 * Broadcast уведомление всем подключенным пользователям
 */
export const broadcastNotification = (notification: any): void => {
  if (!io) {
    logger.warn('WebSocket server not initialized, cannot broadcast');
    return;
  }

  io.emit('broadcast', notification);
  
  logger.info('Notification broadcasted to all users');
};

/**
 * Отправка транзакционного события
 */
export const sendTransactionEvent = (
  userId: string,
  transactionData: any
): void => {
  if (!io) return;

  io.to(`user:${userId}`).emit('transaction', {
    type: 'transaction_completed',
    data: transactionData,
    timestamp: new Date().toISOString(),
  });

  logger.info('Transaction event sent', { userId, transactionId: transactionData.id });
};

/**
 * Отправка события безопасности
 */
export const sendSecurityEvent = (
  userId: string,
  eventType: string,
  details: any
): void => {
  if (!io) return;

  io.to(`user:${userId}`).emit('security', {
    type: eventType,
    details,
    timestamp: new Date().toISOString(),
    priority: 'high',
  });

  logger.info('Security event sent', { userId, eventType });
};

/**
 * Отправка обновления баланса счета
 */
export const sendBalanceUpdate = (
  userId: string,
  accountId: string,
  newBalance: number
): void => {
  if (!io) return;

  io.to(`user:${userId}`).emit('balance-update', {
    account_id: accountId,
    balance: newBalance,
    timestamp: new Date().toISOString(),
  });

  logger.info('Balance update sent', { userId, accountId, newBalance });
};

/**
 * Проверка, подключен ли пользователь
 */
export const isUserConnected = (userId: string): boolean => {
  if (!io) return false;

  const sockets = io.sockets.adapter.rooms.get(`user:${userId}`);
  return sockets ? sockets.size > 0 : false;
};

/**
 * Получение количества активных подключений
 */
export const getActiveConnectionsCount = (): number => {
  if (!io) return 0;
  return io.sockets.sockets.size;
};

export default {
  initializeWebSocket,
  getIO,
  sendNotificationToUser,
  sendUnreadCountUpdate,
  broadcastNotification,
  sendTransactionEvent,
  sendSecurityEvent,
  sendBalanceUpdate,
  isUserConnected,
  getActiveConnectionsCount,
};
