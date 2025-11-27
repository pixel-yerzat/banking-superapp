import { Request, Response } from 'express';
import * as chatService from '../services/chat.service';
import logger from '../utils/logger';

/**
 * Отправка сообщения в чат
 * POST /api/v1/chat/message
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Message is required',
      });
      return;
    }

    const result = await chatService.processUserMessage(req.user.userId, message);

    res.status(200).json({
      success: true,
      data: {
        user_message: result.userMessage,
        bot_response: result.botResponse,
      },
    });
  } catch (error) {
    logger.error('Send chat message controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process message',
    });
  }
};

/**
 * Получение истории чата
 * GET /api/v1/chat/history
 */
export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;

    const history = await chatService.getChatHistory(req.user.userId, limitNum);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Get chat history controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get chat history',
    });
  }
};

/**
 * Очистка истории чата
 * DELETE /api/v1/chat/history
 */
export const clearHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    await chatService.clearChatHistory(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Chat history cleared',
    });
  } catch (error) {
    logger.error('Clear chat history controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to clear chat history',
    });
  }
};

/**
 * Получение всех FAQ
 * GET /api/v1/chat/faq
 */
export const getAllFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;

    const faq = category
      ? chatService.getFAQByCategory(category as string)
      : chatService.getAllFAQ();

    res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    logger.error('Get FAQ controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get FAQ',
    });
  }
};

/**
 * Поиск в FAQ
 * GET /api/v1/chat/faq/search
 */
export const searchFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Search query is required',
      });
      return;
    }

    const results = chatService.searchFAQPublic(q);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Search FAQ controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to search FAQ',
    });
  }
};

/**
 * Получение статистики чата
 * GET /api/v1/chat/stats
 */
export const getChatStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const stats = await chatService.getChatStats(req.user.userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get chat stats controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get chat statistics',
    });
  }
};

export default {
  sendMessage,
  getChatHistory,
  clearHistory,
  getAllFAQ,
  searchFAQ,
  getChatStats,
};
