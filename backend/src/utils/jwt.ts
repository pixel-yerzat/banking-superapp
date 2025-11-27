import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config/config';
import { TokenPayload } from '../types';
import logger from './logger';

/**
 * Генерация Access Token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  try {
    const options: any = {
      expiresIn: config.jwt.expiresIn,
    };
    return jwt.sign(payload as any, config.jwt.secret, options);
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Генерация Refresh Token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  try {
    const options: any = {
      expiresIn: config.jwt.refreshExpiresIn,
    };
    return jwt.sign(payload as any, config.jwt.refreshSecret, options);
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Верификация Access Token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Верификация Refresh Token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Refresh token verification failed');
  }
};

/**
 * Декодирование токена без верификации (для отладки)
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Генерация пары токенов (access + refresh)
 */
export const generateTokenPair = (payload: TokenPayload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  generateTokenPair,
};
