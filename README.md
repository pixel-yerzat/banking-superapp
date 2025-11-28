# 🏦 Banking SuperApp - Backend

Банковское суперприложение на Node.js, TypeScript, Express и PostgreSQL.

## 📋 Содержание

- [Технологический стек](#технологический-стек)
- [Быстрый старт](#быстрый-старт)
- [Структура проекта](#структура-проекта)
- [API Документация](#api-документация)
- [База данных](#база-данных)

---

## 🛠️ Технологический стек

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL 15+
- **Caching**: Redis 7+

### Security
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Security Headers**: Helmet
- **Rate Limiting**: express-rate-limit

### DevOps
- **Containerization**: Docker & Docker Compose
- **Process Manager**: PM2 (для production)
- **Logging**: Winston

---

## 🚀 Быстрый старт

### Вариант 1: Docker (Рекомендуется)

1. **Убедитесь что установлен Docker и Docker Compose**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Запустите все сервисы**
   ```bash
   cd banking-superapp
   docker-compose up -d
   ```

3. **Проверьте статус**
   ```bash
   docker-compose ps
   ```

   Должны быть запущены:
   - `banking_postgres` (PostgreSQL) - порт 5432
   - `banking_pgadmin` (PgAdmin) - порт 5050
   - `banking_redis` (Redis) - порт 6379

4. **Просмотр логов**
   ```bash
   docker-compose logs -f postgres
   ```

5. **Остановка сервисов**
   ```bash
   docker-compose down
   ```

6. **Полная очистка (с удалением данных)**
   ```bash
   docker-compose down -v
   ```

### Вариант 2: Локальная установка

1. **Установите зависимости**
   ```bash
   cd backend
   npm install
   ```

2. **Настройте переменные окружения**
   ```bash
   cp .env.example .env
   # Отредактируйте .env файл с вашими настройками
   ```

3. **Убедитесь что PostgreSQL запущен**
   ```bash
   # macOS (Homebrew)
   brew services start postgresql@15
   
   # Linux (systemd)
   sudo systemctl start postgresql
   
   # Windows
   # Запустите через Services или pgAdmin
   ```

4. **Создайте базу данных**
   ```bash
   # Подключитесь к PostgreSQL
   psql -U postgres
   
   # Создайте БД
   CREATE DATABASE banking_superapp;
   \q
   ```

5. **Примените схему БД**
   ```bash
   psql -U postgres -d banking_superapp -f ../database/schema.sql
   ```

6. **Запустите backend в режиме разработки**
   ```bash
   npm run dev
   ```

7. **Сервер должен запуститься на http://localhost:5000**

---

## 📁 Структура проекта

```
banking-superapp/
├── backend/
│   ├── src/
│   │   ├── config/          # Конфигурация (DB, env)
│   │   │   ├── config.ts
│   │   │   └── database.ts
│   │   ├── controllers/     # Контроллеры (обработка запросов)
│   │   ├── middleware/      # Middleware (auth, validation, error)
│   │   ├── models/          # Модели данных
│   │   ├── routes/          # API маршруты
│   │   ├── services/        # Бизнес-логика
│   │   ├── types/           # TypeScript типы
│   │   ├── utils/           # Утилиты (logger, helpers)
│   │   │   └── logger.ts
│   │   └── server.ts        # Главный файл сервера
│   ├── logs/                # Логи приложения
│   ├── .env.example         # Пример переменных окружения
│   ├── .gitignore
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── database/
│   └── schema.sql           # SQL схема базы данных
├── docker-compose.yml       # Docker конфигурация
└── README.md
```

---

## 🗄️ База данных

### Схема PostgreSQL

База данных включает следующие основные таблицы:

1. **users** - Пользователи системы
2. **accounts** - Банковские счета
3. **cards** - Банковские карты
4. **transactions** - Транзакции
5. **payment_templates** - Шаблоны платежей
6. **loans** - Кредиты
7. **deposits** - Депозиты
8. **notifications** - Уведомления
9. **audit_logs** - Журнал аудита

### Подключение к БД через PgAdmin

1. Откройте http://localhost:5050
2. Логин: `admin@bank.com`
3. Пароль: `admin123`
4. Добавьте новый сервер:
   - **Host**: `postgres` (или `localhost` если не через Docker)
   - **Port**: `5432`
   - **Username**: `postgres`
   - **Password**: `postgres_password_2024`

### Просмотр данных через CLI

```bash
# Подключение к PostgreSQL в Docker
docker exec -it banking_postgres psql -U postgres -d banking_superapp

# Список таблиц
\dt

# Описание таблицы
\d users

# Пример запроса
SELECT * FROM users LIMIT 10;

# Выход
\q
```

---

## 🔌 API Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### API Info
```
GET /api/v1
```

**Response:**
```json
{
  "message": "Banking SuperApp API",
  "version": "v1",
  "status": "running"
}
```

---

## 🧪 Тестирование API

### С помощью cURL

```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api/v1
```

### С помощью Postman/Insomnia

1. Импортируйте коллекцию (будет добавлена позже)
2. Установите base URL: `http://localhost:5000`

---

## 📝 Переменные окружения

Основные переменные в `.env`:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_superapp
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 🐛 Отладка

### Просмотр логов

Логи сохраняются в папке `backend/logs/`:
- `combined.log` - все логи
- `error.log` - только ошибки

```bash
# Просмотр в реальном времени
tail -f backend/logs/combined.log
```

### Проверка подключения к БД

```bash
# Проверка что PostgreSQL работает
docker exec banking_postgres pg_isready -U postgres

# Проверка что база данных существует
docker exec banking_postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw banking_superapp
```

---



## 💡 Полезные команды

```bash
# Backend разработка
npm run dev           # Запуск в режиме разработки
npm run build         # Сборка TypeScript
npm start             # Запуск production версии
npm run lint          # Проверка кода
npm run format        # Форматирование кода

# Docker
docker-compose up -d              # Запустить все сервисы
docker-compose down               # Остановить все сервисы
docker-compose logs -f [service]  # Просмотр логов
docker-compose restart [service]  # Перезапуск сервиса

# База данных
npm run migrate       # Применить миграции (будет добавлено)
npm run seed          # Заполнить тестовыми данными (будет добавлено)
```

---

