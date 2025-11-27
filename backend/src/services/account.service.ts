import { query, getClient } from '../config/database';
import { Account, CreateAccountDto, AccountType, Currency, AccountStatus } from '../types';
import { generateAccountNumber } from '../utils/generators';
import logger from '../utils/logger';

/**
 * Создание нового счета
 */
export const createAccount = async (
  userId: string,
  accountData: CreateAccountDto
): Promise<Account> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Генерируем уникальный номер счета
    let accountNumber: string;
    let isUnique = false;
    
    while (!isUnique) {
      accountNumber = generateAccountNumber();
      const existing = await client.query(
        'SELECT id FROM accounts WHERE account_number = $1',
        [accountNumber]
      );
      isUnique = existing.rows.length === 0;
    }

    // Создаем счет
    const result = await client.query(
      `INSERT INTO accounts (
        user_id, account_number, account_type, currency, balance, available_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        userId,
        accountNumber!,
        accountData.account_type,
        accountData.currency,
        0.00,
        0.00
      ]
    );

    await client.query('COMMIT');

    logger.info('Account created', { 
      userId, 
      accountId: result.rows[0].id,
      accountNumber: accountNumber!
    });

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating account:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Получение всех счетов пользователя
 */
export const getUserAccounts = async (userId: string): Promise<Account[]> => {
  try {
    const result = await query(
      `SELECT * FROM accounts 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting user accounts:', error);
    throw error;
  }
};

/**
 * Получение счета по ID
 */
export const getAccountById = async (accountId: string): Promise<Account | null> => {
  try {
    const result = await query(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting account by ID:', error);
    throw error;
  }
};

/**
 * Получение счета по номеру
 */
export const getAccountByNumber = async (accountNumber: string): Promise<Account | null> => {
  try {
    const result = await query(
      'SELECT * FROM accounts WHERE account_number = $1',
      [accountNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting account by number:', error);
    throw error;
  }
};

/**
 * Проверка принадлежности счета пользователю
 */
export const isAccountOwner = async (
  accountId: string,
  userId: string
): Promise<boolean> => {
  try {
    const result = await query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking account ownership:', error);
    throw error;
  }
};

/**
 * Получение баланса счета
 */
export const getAccountBalance = async (accountId: string): Promise<{
  balance: number;
  available_balance: number;
  currency: Currency;
}> => {
  try {
    const result = await query(
      'SELECT balance, available_balance, currency FROM accounts WHERE id = $1',
      [accountId]
    );

    if (result.rows.length === 0) {
      throw new Error('Account not found');
    }

    return {
      balance: parseFloat(result.rows[0].balance),
      available_balance: parseFloat(result.rows[0].available_balance),
      currency: result.rows[0].currency,
    };
  } catch (error) {
    logger.error('Error getting account balance:', error);
    throw error;
  }
};

/**
 * Обновление баланса счета (используется в транзакциях)
 */
export const updateAccountBalance = async (
  accountId: string,
  amount: number,
  isDebit: boolean // true = списание, false = пополнение
): Promise<void> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем текущий баланс
    const result = await client.query(
      'SELECT balance, available_balance FROM accounts WHERE id = $1 FOR UPDATE',
      [accountId]
    );

    if (result.rows.length === 0) {
      throw new Error('Account not found');
    }

    const currentBalance = parseFloat(result.rows[0].balance);
    const currentAvailable = parseFloat(result.rows[0].available_balance);

    // Проверяем достаточность средств для списания
    if (isDebit && currentAvailable < amount) {
      throw new Error('Insufficient funds');
    }

    // Вычисляем новый баланс
    const newBalance = isDebit 
      ? currentBalance - amount 
      : currentBalance + amount;
    
    const newAvailable = isDebit 
      ? currentAvailable - amount 
      : currentAvailable + amount;

    // Обновляем баланс
    await client.query(
      `UPDATE accounts 
       SET balance = $1, available_balance = $2 
       WHERE id = $3`,
      [newBalance, newAvailable, accountId]
    );

    await client.query('COMMIT');

    logger.info('Account balance updated', { 
      accountId, 
      amount, 
      isDebit,
      newBalance 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating account balance:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Блокировка счета
 */
export const blockAccount = async (accountId: string): Promise<void> => {
  try {
    await query(
      'UPDATE accounts SET status = $1 WHERE id = $2',
      [AccountStatus.BLOCKED, accountId]
    );

    logger.info('Account blocked', { accountId });
  } catch (error) {
    logger.error('Error blocking account:', error);
    throw error;
  }
};

/**
 * Разблокировка счета
 */
export const unblockAccount = async (accountId: string): Promise<void> => {
  try {
    await query(
      'UPDATE accounts SET status = $1 WHERE id = $2',
      [AccountStatus.ACTIVE, accountId]
    );

    logger.info('Account unblocked', { accountId });
  } catch (error) {
    logger.error('Error unblocking account:', error);
    throw error;
  }
};

/**
 * Закрытие счета
 */
export const closeAccount = async (accountId: string): Promise<void> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Проверяем что баланс равен нулю
    const result = await client.query(
      'SELECT balance FROM accounts WHERE id = $1',
      [accountId]
    );

    if (result.rows.length === 0) {
      throw new Error('Account not found');
    }

    const balance = parseFloat(result.rows[0].balance);

    if (balance !== 0) {
      throw new Error('Cannot close account with non-zero balance');
    }

    // Закрываем счет
    await client.query(
      `UPDATE accounts 
       SET status = $1, closed_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [AccountStatus.CLOSED, accountId]
    );

    await client.query('COMMIT');

    logger.info('Account closed', { accountId });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error closing account:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Получение общего баланса пользователя по всем счетам
 */
export const getTotalBalance = async (userId: string): Promise<{
  [currency: string]: {
    total: number;
    available: number;
  }
}> => {
  try {
    const result = await query(
      `SELECT currency, 
              SUM(balance) as total_balance,
              SUM(available_balance) as available_balance
       FROM accounts 
       WHERE user_id = $1 AND status = $2
       GROUP BY currency`,
      [userId, AccountStatus.ACTIVE]
    );

    const balances: any = {};

    result.rows.forEach(row => {
      balances[row.currency] = {
        total: parseFloat(row.total_balance),
        available: parseFloat(row.available_balance),
      };
    });

    return balances;
  } catch (error) {
    logger.error('Error getting total balance:', error);
    throw error;
  }
};

/**
 * Получение активных счетов пользователя по валюте
 */
export const getAccountsByCurrency = async (
  userId: string,
  currency: Currency
): Promise<Account[]> => {
  try {
    const result = await query(
      `SELECT * FROM accounts 
       WHERE user_id = $1 
       AND currency = $2 
       AND status = $3
       ORDER BY created_at DESC`,
      [userId, currency, AccountStatus.ACTIVE]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting accounts by currency:', error);
    throw error;
  }
};

export default {
  createAccount,
  getUserAccounts,
  getAccountById,
  getAccountByNumber,
  isAccountOwner,
  getAccountBalance,
  updateAccountBalance,
  blockAccount,
  unblockAccount,
  closeAccount,
  getTotalBalance,
  getAccountsByCurrency,
};
