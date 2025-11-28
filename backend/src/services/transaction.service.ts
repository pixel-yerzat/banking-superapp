import { query, getClient } from "../config/database";
import {
  Transaction,
  CreateTransactionDto,
  TransactionType,
  TransactionStatus,
  Currency,
  PaginationQuery,
  PaginatedResponse,
} from "../types";
import { generateReferenceNumber } from "../utils/generators";
import { updateAccountBalance, getAccountById } from "./account.service";
import logger from "../utils/logger";
import { log } from "console";

/**
 * Создание транзакции с обновлением балансов
 */
export const createTransaction = async (
  transactionData: CreateTransactionDto
): Promise<Transaction> => {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    logger.info("Creating transaction", { transactionData });
    // Генерируем уникальный референс
    const referenceNumber = generateReferenceNumber();

    // Проверяем существование счетов
    if (transactionData.from_account_id) {
      const fromAccount = await getAccountById(transactionData.from_account_id);
      if (!fromAccount) {
        throw new Error("Source account not found");
      }
      if (fromAccount.status !== "active") {
        throw new Error("Source account is not active");
      }
    }

    logger.info("From account verified");
    if (transactionData.to_account_id) {
      const toAccount = await getAccountById(transactionData.to_account_id);
      if (!toAccount) {
        throw new Error("Destination account not found");
      }
      if (toAccount.status !== "active") {
        throw new Error("Destination account is not active");
      }
    }

    // Создаем транзакцию
    const result = await client.query(
      `INSERT INTO transactions (
        from_account_id, to_account_id, transaction_type,
        amount, currency, exchange_rate, fee, status,
        description, reference_number, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        transactionData.from_account_id || null,
        transactionData.to_account_id || null,
        transactionData.transaction_type,
        transactionData.amount,
        transactionData.currency,
        1.0, // exchange_rate
        0.0, // fee
        TransactionStatus.PENDING,
        transactionData.description || null,
        referenceNumber,
        transactionData.metadata
          ? JSON.stringify(transactionData.metadata)
          : null,
      ]
    );

    logger.info("Transaction record created");

    const transaction = result.rows[0];

    logger.info("Processing account balance updates", {
      transactionId: transaction.id,
    });
    // Обновляем балансы счетов
    if (transactionData.from_account_id) {
      await updateAccountBalance(
        transactionData.from_account_id,
        transactionData.amount,
        true // списание
      );
      logger.info("Debited from_account_id");
    }

    if (transactionData.to_account_id) {
      await updateAccountBalance(
        transactionData.to_account_id,
        transactionData.amount,
        false // пополнение
      );
    }

    // Обновляем статус транзакции на completed
    await client.query(
      `UPDATE transactions 
       SET status = $1, completed_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [TransactionStatus.COMPLETED, transaction.id]
    );
    logger.info("Account balances updated");

    await client.query("COMMIT");

    logger.info("Transaction completed", {
      transactionId: transaction.id,
      type: transactionData.transaction_type,
      amount: transactionData.amount,
      currency: transactionData.currency,
    });

    // Возвращаем обновленную транзакцию
    const updatedResult = await query(
      "SELECT * FROM transactions WHERE id = $1",
      [transaction.id]
    );

    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    // Пытаемся отметить транзакцию как failed если она была создана
    try {
      if (
        error instanceof Error &&
        error.message.includes("Insufficient funds")
      ) {
        logger.warn("Transaction failed due to insufficient funds");
      }
    } catch (e) {
      // Игнорируем ошибки при обновлении статуса
    }

    logger.error("Error creating transaction:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * P2P перевод по номеру телефона
 */
export const transferToPhone = async (
  _fromUserId: string,
  fromAccountId: string,
  toPhone: string,
  amount: number,
  description?: string
): Promise<Transaction> => {
  try {
    // Находим получателя по телефону
    const recipientResult = await query(
      "SELECT id FROM users WHERE phone = $1",
      [toPhone]
    );
    logger.info("Recipient lookup result", { rows: recipientResult.rows });

    if (recipientResult.rows.length === 0) {
      throw new Error("Recipient not found");
    }

    const recipientUserId = recipientResult.rows[0].id;

    // Находим активный счет получателя в той же валюте
    const fromAccount = await getAccountById(fromAccountId);
    if (!fromAccount) {
      throw new Error("Source account not found");
    }

    const recipientAccountResult = await query(
      `SELECT id FROM accounts 
       WHERE user_id = $1 
       AND currency = $2 
       AND status = 'active' 
       LIMIT 1`,
      [recipientUserId, fromAccount.currency]
    );

    if (recipientAccountResult.rows.length === 0) {
      throw new Error(
        `Recipient does not have an active ${fromAccount.currency} account`
      );
    }
    logger.info("Recipient account lookup result", {
      rows: recipientAccountResult.rows,
    });
    const toAccountId = recipientAccountResult.rows[0].id;
    const data = await createTransaction({
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      transaction_type: TransactionType.TRANSFER,
      amount,
      currency: fromAccount.currency,
      description: description || `Transfer to ${toPhone}`,
      metadata: {
        recipient_phone: toPhone,
        transfer_type: "p2p_phone",
      },
    });
    logger.info("Transaction data:", data);
    // Создаем транзакцию
    return;
  } catch (error) {
    logger.error("Error in P2P transfer to phone:", error);
    throw error;
  }
};

/**
 * P2P перевод по номеру счета
 */
export const transferToAccount = async (
  fromAccountId: string,
  toAccountNumber: string,
  amount: number,
  description?: string
): Promise<Transaction> => {
  try {
    // Находим счет получателя
    const toAccountResult = await query(
      "SELECT id, currency, status FROM accounts WHERE account_number = $1",
      [toAccountNumber]
    );

    if (toAccountResult.rows.length === 0) {
      throw new Error("Destination account not found");
    }

    const toAccount = toAccountResult.rows[0];

    if (toAccount.status !== "active") {
      throw new Error("Destination account is not active");
    }

    // Проверяем валюту счета отправителя
    const fromAccount = await getAccountById(fromAccountId);
    if (!fromAccount) {
      throw new Error("Source account not found");
    }

    if (fromAccount.currency !== toAccount.currency) {
      throw new Error(
        "Currency mismatch. Cross-currency transfers not yet supported."
      );
    }

    // Создаем транзакцию
    return await createTransaction({
      from_account_id: fromAccountId,
      to_account_id: toAccount.id,
      transaction_type: TransactionType.TRANSFER,
      amount,
      currency: fromAccount.currency,
      description: description || `Transfer to ${toAccountNumber}`,
      metadata: {
        recipient_account: toAccountNumber,
        transfer_type: "p2p_account",
      },
    });
  } catch (error) {
    logger.error("Error in P2P transfer to account:", error);
    throw error;
  }
};

/**
 * Получение транзакции по ID
 */
export const getTransactionById = async (
  transactionId: string
): Promise<Transaction | null> => {
  try {
    const result = await query("SELECT * FROM transactions WHERE id = $1", [
      transactionId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error("Error getting transaction by ID:", error);
    throw error;
  }
};

/**
 * Получение транзакций счета с пагинацией
 */
export const getAccountTransactions = async (
  accountId: string,
  pagination?: PaginationQuery
): Promise<PaginatedResponse<Transaction>> => {
  try {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // Получаем общее количество
    const countResult = await query(
      `SELECT COUNT(*) as count FROM transactions 
       WHERE from_account_id = $1 OR to_account_id = $1`,
      [accountId]
    );

    const total = parseInt(countResult.rows[0].count);

    // Получаем транзакции
    const result = await query(
      `SELECT * FROM transactions 
       WHERE from_account_id = $1 OR to_account_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    return {
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error("Error getting account transactions:", error);
    throw error;
  }
};

/**
 * Получение всех транзакций пользователя
 */
export const getUserTransactions = async (
  userId: string,
  pagination?: PaginationQuery
): Promise<PaginatedResponse<Transaction>> => {
  try {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // Получаем общее количество
    const countResult = await query(
      `SELECT COUNT(*) as count FROM transactions t
       WHERE t.from_account_id IN (SELECT id FROM accounts WHERE user_id = $1)
       OR t.to_account_id IN (SELECT id FROM accounts WHERE user_id = $1)`,
      [userId]
    );

    const total = parseInt(countResult.rows[0].count);

    // Получаем транзакции
    const result = await query(
      `SELECT DISTINCT t.* FROM transactions t
       LEFT JOIN accounts a1 ON t.from_account_id = a1.id
       LEFT JOIN accounts a2 ON t.to_account_id = a2.id
       WHERE a1.user_id = $1 OR a2.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error("Error getting user transactions:", error);
    throw error;
  }
};

/**
 * Отмена транзакции (только для pending транзакций)
 */
export const cancelTransaction = async (
  transactionId: string
): Promise<void> => {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Получаем транзакцию
    const result = await client.query(
      "SELECT * FROM transactions WHERE id = $1",
      [transactionId]
    );

    if (result.rows.length === 0) {
      throw new Error("Transaction not found");
    }

    const transaction = result.rows[0];

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new Error("Only pending transactions can be cancelled");
    }

    // Обновляем статус
    await client.query("UPDATE transactions SET status = $1 WHERE id = $2", [
      TransactionStatus.CANCELLED,
      transactionId,
    ]);

    await client.query("COMMIT");

    logger.info("Transaction cancelled", { transactionId });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error cancelling transaction:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Получение статистики транзакций пользователя
 */
export const getUserTransactionStats = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  total_transactions: number;
  total_sent: number;
  total_received: number;
  by_type: { [key: string]: number };
  by_currency: { [key: string]: number };
}> => {
  try {
    let dateFilter = "";
    const params: any[] = [userId];

    if (startDate && endDate) {
      dateFilter = "AND t.created_at BETWEEN $2 AND $3";
      params.push(startDate, endDate);
    }

    // Общая статистика
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN a1.user_id = $1 THEN t.amount ELSE 0 END) as total_sent,
        SUM(CASE WHEN a2.user_id = $1 THEN t.amount ELSE 0 END) as total_received
       FROM transactions t
       LEFT JOIN accounts a1 ON t.from_account_id = a1.id
       LEFT JOIN accounts a2 ON t.to_account_id = a2.id
       WHERE (a1.user_id = $1 OR a2.user_id = $1) 
       AND t.status = 'completed'
       ${dateFilter}`,
      params
    );

    // По типам
    const typeResult = await query(
      `SELECT 
        t.transaction_type,
        COUNT(*) as count
       FROM transactions t
       LEFT JOIN accounts a1 ON t.from_account_id = a1.id
       LEFT JOIN accounts a2 ON t.to_account_id = a2.id
       WHERE (a1.user_id = $1 OR a2.user_id = $1)
       AND t.status = 'completed'
       ${dateFilter}
       GROUP BY t.transaction_type`,
      params
    );

    // По валютам
    const currencyResult = await query(
      `SELECT 
        t.currency,
        SUM(t.amount) as total
       FROM transactions t
       LEFT JOIN accounts a1 ON t.from_account_id = a1.id
       LEFT JOIN accounts a2 ON t.to_account_id = a2.id
       WHERE (a1.user_id = $1 OR a2.user_id = $1)
       AND t.status = 'completed'
       ${dateFilter}
       GROUP BY t.currency`,
      params
    );

    const byType: any = {};
    typeResult.rows.forEach((row: any) => {
      byType[row.transaction_type] = parseInt(row.count);
    });

    const byCurrency: any = {};
    currencyResult.rows.forEach((row: any) => {
      byCurrency[row.currency] = parseFloat(row.total);
    });

    return {
      total_transactions: parseInt(statsResult.rows[0].total_transactions),
      total_sent: parseFloat(statsResult.rows[0].total_sent) || 0,
      total_received: parseFloat(statsResult.rows[0].total_received) || 0,
      by_type: byType,
      by_currency: byCurrency,
    };
  } catch (error) {
    logger.error("Error getting transaction stats:", error);
    throw error;
  }
};

export default {
  createTransaction,
  transferToPhone,
  transferToAccount,
  getTransactionById,
  getAccountTransactions,
  getUserTransactions,
  cancelTransaction,
  getUserTransactionStats,
};
