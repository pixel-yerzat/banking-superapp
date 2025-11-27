import { query, getClient } from '../config/database';
import { Card, CardType, PaymentSystem, CardStatus } from '../types';
import { generateCardNumber, validateCardNumber } from '../utils/generators';
import { hashPassword } from '../utils/password';
import logger from '../utils/logger';

interface CreateCardDto {
  account_id: string;
  card_type: CardType;
  payment_system: PaymentSystem;
  daily_limit?: number;
  monthly_limit?: number;
}

/**
 * Создание новой карты
 */
export const createCard = async (
  userId: string,
  cardData: CreateCardDto
): Promise<Card> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Проверяем что счет принадлежит пользователю
    const accountCheck = await client.query(
      'SELECT id, user_id FROM accounts WHERE id = $1',
      [cardData.account_id]
    );

    if (accountCheck.rows.length === 0) {
      throw new Error('Account not found');
    }

    if (accountCheck.rows[0].user_id !== userId) {
      throw new Error('Account does not belong to user');
    }

    // Генерируем уникальный номер карты
    let cardNumber: string;
    let isUnique = false;
    
    // BIN коды для разных платежных систем
    const binCodes: { [key in PaymentSystem]: string } = {
      visa: '4',
      mastercard: '5',
      mir: '2',
      unionpay: '6',
    };

    while (!isUnique) {
      cardNumber = generateCardNumber(binCodes[cardData.payment_system]);
      const existing = await client.query(
        'SELECT id FROM cards WHERE card_number = $1',
        [cardNumber]
      );
      isUnique = existing.rows.length === 0;
    }

    // Получаем имя владельца карты из пользователя
    const userResult = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    const cardHolderName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`.toUpperCase();

    // Генерируем дату истечения (3 года)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);

    // Генерируем и хешируем CVV
    const cvv = Math.floor(100 + Math.random() * 900).toString();
    const cvvHash = await hashPassword(cvv);

    // Создаем карту
    const result = await client.query(
      `INSERT INTO cards (
        account_id, card_number, card_holder_name, card_type, 
        payment_system, expiry_date, cvv_hash, daily_limit, monthly_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        cardData.account_id,
        cardNumber!,
        cardHolderName,
        cardData.card_type,
        cardData.payment_system,
        expiryDate,
        cvvHash,
        cardData.daily_limit || null,
        cardData.monthly_limit || null
      ]
    );

    await client.query('COMMIT');

    logger.info('Card created', { 
      userId, 
      cardId: result.rows[0].id,
      cardType: cardData.card_type
    });

    // В development режиме логируем CVV (в production НЕ ДЕЛАТЬ!)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Card CVV (dev only):', { cvv });
    }

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating card:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Получение всех карт пользователя
 */
export const getUserCards = async (userId: string): Promise<Card[]> => {
  try {
    const result = await query(
      `SELECT c.* FROM cards c
       INNER JOIN accounts a ON c.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting user cards:', error);
    throw error;
  }
};

/**
 * Получение карт по счету
 */
export const getCardsByAccount = async (accountId: string): Promise<Card[]> => {
  try {
    const result = await query(
      'SELECT * FROM cards WHERE account_id = $1 ORDER BY created_at DESC',
      [accountId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting cards by account:', error);
    throw error;
  }
};

/**
 * Получение карты по ID
 */
export const getCardById = async (cardId: string): Promise<Card | null> => {
  try {
    const result = await query(
      'SELECT * FROM cards WHERE id = $1',
      [cardId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting card by ID:', error);
    throw error;
  }
};

/**
 * Получение карты по номеру
 */
export const getCardByNumber = async (cardNumber: string): Promise<Card | null> => {
  try {
    const result = await query(
      'SELECT * FROM cards WHERE card_number = $1',
      [cardNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting card by number:', error);
    throw error;
  }
};

/**
 * Проверка принадлежности карты пользователю
 */
export const isCardOwner = async (
  cardId: string,
  userId: string
): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT c.id FROM cards c
       INNER JOIN accounts a ON c.account_id = a.id
       WHERE c.id = $1 AND a.user_id = $2`,
      [cardId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking card ownership:', error);
    throw error;
  }
};

/**
 * Блокировка карты
 */
export const blockCard = async (cardId: string, reason?: string): Promise<void> => {
  try {
    await query(
      'UPDATE cards SET status = $1 WHERE id = $2',
      [CardStatus.BLOCKED, cardId]
    );

    logger.info('Card blocked', { cardId, reason });
  } catch (error) {
    logger.error('Error blocking card:', error);
    throw error;
  }
};

/**
 * Разблокировка карты
 */
export const unblockCard = async (cardId: string): Promise<void> => {
  try {
    await query(
      'UPDATE cards SET status = $1 WHERE id = $2',
      [CardStatus.ACTIVE, cardId]
    );

    logger.info('Card unblocked', { cardId });
  } catch (error) {
    logger.error('Error unblocking card:', error);
    throw error;
  }
};

/**
 * Отметка карты как утерянной
 */
export const markCardAsLost = async (cardId: string): Promise<void> => {
  try {
    await query(
      'UPDATE cards SET status = $1 WHERE id = $2',
      [CardStatus.LOST, cardId]
    );

    logger.info('Card marked as lost', { cardId });
  } catch (error) {
    logger.error('Error marking card as lost:', error);
    throw error;
  }
};

/**
 * Обновление лимитов карты
 */
export const updateCardLimits = async (
  cardId: string,
  dailyLimit?: number,
  monthlyLimit?: number
): Promise<void> => {
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (dailyLimit !== undefined) {
      updates.push(`daily_limit = $${paramCount}`);
      values.push(dailyLimit);
      paramCount++;
    }

    if (monthlyLimit !== undefined) {
      updates.push(`monthly_limit = $${paramCount}`);
      values.push(monthlyLimit);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No limits to update');
    }

    values.push(cardId);

    await query(
      `UPDATE cards SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    logger.info('Card limits updated', { cardId, dailyLimit, monthlyLimit });
  } catch (error) {
    logger.error('Error updating card limits:', error);
    throw error;
  }
};

/**
 * Включение/выключение бесконтактных платежей
 */
export const toggleContactless = async (
  cardId: string,
  enabled: boolean
): Promise<void> => {
  try {
    await query(
      'UPDATE cards SET is_contactless = $1 WHERE id = $2',
      [enabled, cardId]
    );

    logger.info('Card contactless toggled', { cardId, enabled });
  } catch (error) {
    logger.error('Error toggling contactless:', error);
    throw error;
  }
};

/**
 * Включение/выключение онлайн платежей
 */
export const toggleOnlinePayments = async (
  cardId: string,
  enabled: boolean
): Promise<void> => {
  try {
    await query(
      'UPDATE cards SET is_online_payments = $1 WHERE id = $2',
      [enabled, cardId]
    );

    logger.info('Card online payments toggled', { cardId, enabled });
  } catch (error) {
    logger.error('Error toggling online payments:', error);
    throw error;
  }
};

/**
 * Проверка активных карт по счету
 */
export const hasActiveCards = async (accountId: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT id FROM cards 
       WHERE account_id = $1 
       AND status = $2 
       LIMIT 1`,
      [accountId, CardStatus.ACTIVE]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking active cards:', error);
    throw error;
  }
};

/**
 * Получение активных карт пользователя
 */
export const getActiveUserCards = async (userId: string): Promise<Card[]> => {
  try {
    const result = await query(
      `SELECT c.* FROM cards c
       INNER JOIN accounts a ON c.account_id = a.id
       WHERE a.user_id = $1 AND c.status = $2
       ORDER BY c.created_at DESC`,
      [userId, CardStatus.ACTIVE]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting active user cards:', error);
    throw error;
  }
};

export default {
  createCard,
  getUserCards,
  getCardsByAccount,
  getCardById,
  getCardByNumber,
  isCardOwner,
  blockCard,
  unblockCard,
  markCardAsLost,
  updateCardLimits,
  toggleContactless,
  toggleOnlinePayments,
  hasActiveCards,
  getActiveUserCards,
};
