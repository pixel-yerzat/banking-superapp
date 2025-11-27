import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';
import { Currency } from '../types';
import logger from '../utils/logger';

/**
 * Получение статистики по категориям
 * GET /api/v1/analytics/categories
 */
export const getCategoryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { start_date, end_date, currency } = req.query;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (start_date) {
      startDate = new Date(start_date as string);
    }

    if (end_date) {
      endDate = new Date(end_date as string);
    }

    const stats = await analyticsService.getCategoryStats(
      req.user.userId,
      startDate,
      endDate,
      currency as Currency
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get category stats controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get category statistics',
    });
  }
};

/**
 * Получение анализа расходов
 * GET /api/v1/analytics/spending
 */
export const getSpendingAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { period, currency } = req.query;

    if (!period || !['day', 'week', 'month', 'year'].includes(period as string)) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Period must be one of: day, week, month, year',
      });
      return;
    }

    const analysis = await analyticsService.getSpendingAnalysis(
      req.user.userId,
      period as 'day' | 'week' | 'month' | 'year',
      currency as Currency
    );

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Get spending analysis controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get spending analysis',
    });
  }
};

/**
 * Сравнение расходов
 * GET /api/v1/analytics/compare
 */
export const compareSpending = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { current_start, current_end, previous_start, previous_end } = req.query;

    if (!current_start || !current_end || !previous_start || !previous_end) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'All date parameters are required',
      });
      return;
    }

    const comparison = await analyticsService.compareSpending(
      req.user.userId,
      new Date(current_start as string),
      new Date(current_end as string),
      new Date(previous_start as string),
      new Date(previous_end as string)
    );

    res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    logger.error('Compare spending controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to compare spending',
    });
  }
};

/**
 * Прогноз расходов
 * GET /api/v1/analytics/forecast
 */
export const forecastSpending = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const forecast = await analyticsService.forecastSpending(req.user.userId);

    res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    logger.error('Forecast spending controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to forecast spending',
    });
  }
};

/**
 * Рекомендации по оптимизации расходов
 * GET /api/v1/analytics/recommendations
 */
export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const recommendations = await analyticsService.getSpendingRecommendations(req.user.userId);

    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Get recommendations controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get recommendations',
    });
  }
};

export default {
  getCategoryStats,
  getSpendingAnalysis,
  compareSpending,
  forecastSpending,
  getRecommendations,
};
