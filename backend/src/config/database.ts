import { Pool, PoolClient, QueryResult } from 'pg';
import config from '../config/config';
import logger from '../utils/logger';

/**
 * Пул подключений к PostgreSQL
 */
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20, // Максимальное количество подключений в пуле
  idleTimeoutMillis: 30000, // Таймаут для неактивных подключений
  connectionTimeoutMillis: 2000, // Таймаут подключения
});

// Обработка ошибок пула
pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Выполнение SQL запроса
 */
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
};

/**
 * Получение клиента из пула для транзакций
 */
export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  return client;
};

/**
 * Проверка подключения к БД
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connection successful', { time: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('Database connection failed', error);
    return false;
  }
};

/**
 * Закрытие всех подключений
 */
export const closePool = async (): Promise<void> => {
  await pool.end();
  logger.info('Database pool closed');
};

export default {
  query,
  getClient,
  testConnection,
  closePool,
  pool,
};
