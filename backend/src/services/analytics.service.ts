import { query } from '../config/database';
import {
  CategoryStats,
  SpendingAnalysis,
  PaymentCategory,
  Currency,
} from '../types';
import logger from '../utils/logger';

/**
 * Получение статистики расходов по категориям
 */
export const getCategoryStats = async (
  userId: string,
  startDate?: Date,
  endDate?: Date,
  currency?: Currency
): Promise<CategoryStats[]> => {
  try {
    let dateFilter = '';
    const params: any[] = [userId];
    let paramCount = 2;

    if (startDate && endDate) {
      dateFilter = `AND t.created_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    }

    let currencyFilter = '';
    if (currency) {
      currencyFilter = `AND t.currency = $${paramCount}`;
      params.push(currency);
    }

    const result = await query(
      `SELECT 
        pt.category,
        COUNT(t.id) as count,
        SUM(t.amount) as total_amount,
        t.currency
       FROM transactions t
       JOIN payment_templates pt ON t.metadata->>'template_id' = pt.id::text
       JOIN accounts a ON t.from_account_id = a.id
       WHERE a.user_id = $1 
       AND t.status = 'completed'
       AND pt.category IS NOT NULL
       ${dateFilter}
       ${currencyFilter}
       GROUP BY pt.category, t.currency
       ORDER BY total_amount DESC`,
      params
    );

    // Вычисляем общую сумму для процентов
    const totalAmount = result.rows.reduce(
      (sum, row) => sum + parseFloat(row.total_amount),
      0
    );

    return result.rows.map(row => ({
      category: row.category as PaymentCategory,
      count: parseInt(row.count),
      total_amount: parseFloat(row.total_amount),
      currency: row.currency,
      percentage: totalAmount > 0 ? (parseFloat(row.total_amount) / totalAmount) * 100 : 0,
    }));
  } catch (error) {
    logger.error('Error getting category stats:', error);
    throw error;
  }
};

/**
 * Полный анализ расходов
 */
export const getSpendingAnalysis = async (
  userId: string,
  period: 'day' | 'week' | 'month' | 'year',
  currency?: Currency
): Promise<SpendingAnalysis> => {
  try {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    // Определяем период
    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    let currencyFilter = '';
    const params: any[] = [userId, startDate, endDate];
    
    if (currency) {
      currencyFilter = 'AND t.currency = $4';
      params.push(currency);
    }

    // Общие расходы и поступления
    const totalsResult = await query(
      `SELECT 
        SUM(CASE WHEN a1.user_id = $1 THEN t.amount ELSE 0 END) as total_spent,
        SUM(CASE WHEN a2.user_id = $1 THEN t.amount ELSE 0 END) as total_received
       FROM transactions t
       LEFT JOIN accounts a1 ON t.from_account_id = a1.id
       LEFT JOIN accounts a2 ON t.to_account_id = a2.id
       WHERE (a1.user_id = $1 OR a2.user_id = $1)
       AND t.status = 'completed'
       AND t.created_at BETWEEN $2 AND $3
       ${currencyFilter}`,
      params
    );

    // Статистика по категориям
    const categoryStats = await getCategoryStats(
      userId,
      startDate,
      endDate,
      currency
    );

    // Топ получателей
    const topRecipientsResult = await query(
      `SELECT 
        pt.recipient_name as name,
        SUM(t.amount) as amount,
        COUNT(t.id) as count
       FROM transactions t
       JOIN payment_templates pt ON t.metadata->>'template_id' = pt.id::text
       JOIN accounts a ON t.from_account_id = a.id
       WHERE a.user_id = $1 
       AND t.status = 'completed'
       AND t.created_at BETWEEN $2 AND $3
       ${currencyFilter}
       GROUP BY pt.recipient_name
       ORDER BY amount DESC
       LIMIT 5`,
      params
    );

    const totalSpent = parseFloat(totalsResult.rows[0]?.total_spent || 0);
    const totalReceived = parseFloat(totalsResult.rows[0]?.total_received || 0);
    
    // Вычисляем средние значения
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyAverage = totalSpent / (daysDiff || 1);
    const monthlyAverage = totalSpent / ((daysDiff / 30) || 1);

    return {
      period,
      start_date: startDate,
      end_date: endDate,
      total_spent: totalSpent,
      total_received: totalReceived,
      by_category: categoryStats,
      top_recipients: topRecipientsResult.rows.map(row => ({
        name: row.name,
        amount: parseFloat(row.amount),
        count: parseInt(row.count),
      })),
      daily_average: dailyAverage,
      monthly_average: monthlyAverage,
    };
  } catch (error) {
    logger.error('Error getting spending analysis:', error);
    throw error;
  }
};

/**
 * Сравнение расходов за разные периоды
 */
export const compareSpending = async (
  userId: string,
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date
): Promise<{
  current: { total: number; by_category: CategoryStats[] };
  previous: { total: number; by_category: CategoryStats[] };
  change_percent: number;
  category_changes: Record<string, number>;
}> => {
  try {
    // Текущий период
    const currentStats = await getCategoryStats(userId, currentStart, currentEnd);
    const currentTotal = currentStats.reduce((sum, stat) => sum + stat.total_amount, 0);

    // Предыдущий период
    const previousStats = await getCategoryStats(userId, previousStart, previousEnd);
    const previousTotal = previousStats.reduce((sum, stat) => sum + stat.total_amount, 0);

    // Изменение в процентах
    const changePercent = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

    // Изменения по категориям
    const categoryChanges: Record<string, number> = {};
    currentStats.forEach(current => {
      const previous = previousStats.find(p => p.category === current.category);
      if (previous) {
        categoryChanges[current.category] = previous.total_amount > 0
          ? ((current.total_amount - previous.total_amount) / previous.total_amount) * 100
          : 0;
      }
    });

    return {
      current: {
        total: currentTotal,
        by_category: currentStats,
      },
      previous: {
        total: previousTotal,
        by_category: previousStats,
      },
      change_percent: changePercent,
      category_changes: categoryChanges,
    };
  } catch (error) {
    logger.error('Error comparing spending:', error);
    throw error;
  }
};

/**
 * Прогноз расходов на следующий месяц
 */
export const forecastSpending = async (
  userId: string
): Promise<{
  forecast_amount: number;
  confidence: number;
  by_category: Record<string, number>;
}> => {
  try {
    // Берем данные за последние 3 месяца для прогноза
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const stats = await getCategoryStats(userId, threeMonthsAgo, new Date());

    // Простой прогноз: средние расходы за последние 3 месяца
    const totalAmount = stats.reduce((sum, stat) => sum + stat.total_amount, 0);
    const forecastAmount = totalAmount / 3; // Средний месяц

    const byCategory: Record<string, number> = {};
    stats.forEach(stat => {
      byCategory[stat.category] = stat.total_amount / 3;
    });

    // Уверенность в прогнозе (упрощенно, на основе количества данных)
    const confidence = Math.min((stats.length / 10) * 100, 90);

    return {
      forecast_amount: forecastAmount,
      confidence,
      by_category: byCategory,
    };
  } catch (error) {
    logger.error('Error forecasting spending:', error);
    throw error;
  }
};

/**
 * Рекомендации по оптимизации расходов
 */
export const getSpendingRecommendations = async (
  userId: string
): Promise<{
  recommendations: string[];
  savings_potential: number;
}> => {
  try {
    const analysis = await getSpendingAnalysis(userId, 'month');
    const recommendations: string[] = [];
    let savingsPotential = 0;

    // Анализируем категории
    analysis.by_category.forEach(category => {
      // Если категория занимает > 30% расходов
      if (category.percentage > 30) {
        recommendations.push(
          `Consider reducing ${category.category} expenses (${category.percentage.toFixed(1)}% of total)`
        );
        savingsPotential += category.total_amount * 0.1; // Потенциал экономии 10%
      }
    });

    // Проверяем автоплатежи
    if (analysis.by_category.length > 0) {
      recommendations.push(
        'Set up auto-payments for recurring bills to avoid late fees'
      );
    }

    // Проверяем средние расходы
    if (analysis.daily_average > 10000) {
      recommendations.push(
        `Your daily average spending is ${analysis.daily_average.toFixed(0)}. Consider setting a budget.`
      );
    }

    return {
      recommendations,
      savings_potential: savingsPotential,
    };
  } catch (error) {
    logger.error('Error getting spending recommendations:', error);
    throw error;
  }
};

export default {
  getCategoryStats,
  getSpendingAnalysis,
  compareSpending,
  forecastSpending,
  getSpendingRecommendations,
};
