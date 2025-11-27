import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { TokenPayload } from '../types';
import logger from '../utils/logger';

// Расширяем интерфейс Request для добавления user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware для проверки JWT токена
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authorization header provided',
      });
      return;
    }

    // Проверяем формат Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Use: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    // Верифицируем токен
    try {
      const decoded = verifyAccessToken(token);
      
      // Добавляем данные пользователя в request
      req.user = decoded;
      
      logger.debug('User authenticated', { userId: decoded.userId });
      next();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Token expired') {
          res.status(401).json({
            success: false,
            error: 'TokenExpired',
            message: 'Access token has expired',
          });
          return;
        }
        
        if (error.message === 'Invalid token') {
          res.status(401).json({
            success: false,
            error: 'InvalidToken',
            message: 'Access token is invalid',
          });
          return;
        }
      }

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token verification failed',
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};

/**
 * Опциональная аутентификация (не требует токена, но если он есть - проверяет)
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Токена нет - продолжаем без аутентификации
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      
      try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
      } catch (error) {
        // Игнорируем ошибки верификации для опционального middleware
        logger.debug('Optional auth: Invalid token provided');
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next();
  }
};

/**
 * Проверка что пользователь является владельцем ресурса
 */
export const authorizeOwner = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const requestedUserId = req.params[userIdParam];
      
      if (!requestedUserId) {
        res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: `Missing ${userIdParam} parameter`,
        });
        return;
      }

      if (req.user.userId !== requestedUserId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Authorization check failed',
      });
    }
  };
};

export default {
  authenticate,
  optionalAuthenticate,
  authorizeOwner,
};
