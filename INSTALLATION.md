# 🏦 Banking SuperApp - Полный Backend

## 📋 Содержание

- [О проекте](#о-проекте)
- [Требования](#требования)
- [Быстрый старт](#быстрый-старт)
- [Подробная установка](#подробная-установка)
- [Структура проекта](#структура-проекта)
- [API документация](#api-документация)
- [Тестирование](#тестирование)

---

## 🎯 О проекте

**Banking SuperApp** - полнофункциональный backend для банковского мобильного приложения.

### Реализованные функции:

✅ **Этап 1: Инфраструктура**
- Docker, PostgreSQL, TypeScript, Express
- Логирование, безопасность, rate limiting

✅ **Этап 2: Аутентификация**
- Регистрация, вход, JWT токены
- 2FA, OTP, восстановление пароля
- Refresh tokens, управление сессиями

✅ **Этап 3: Основной банкинг**
- Счета (текущие, сберегательные, депозитные)
- Карты (дебетовые, кредитные)
- Транзакции, P2P переводы
- История операций

✅ **Этап 4: Платежи и аналитика**
- Шаблоны платежей
- Автоплатежи
- 15 провайдеров услуг Казахстана
- Аналитика расходов по категориям

✅ **Этап 5: Кредиты и депозиты**
- Калькулятор кредита (аннуитет)
- График платежей
- Досрочное погашение
- Депозиты с капитализацией
- Автопролонгация

✅ **Этап 6: Уведомления**
- HTTP API для уведомлений
- WebSocket (Socket.IO)
- Real-time события
- Настройки уведомлений

### Статистика:
- **60+** TypeScript файлов
- **~14,250** строк кода
- **81** API endpoints
- **8** WebSocket событий
- **10** таблиц БД

---

## ⚙️ Требования

### Обязательно:
- **Node.js** >= 18.0.0
- **Docker** >= 20.10
- **Docker Compose** >= 2.0

### Опционально:
- **PostgreSQL** 15+ (если запуск без Docker)
- **Git** для клонирования

---

## 🚀 Быстрый старт (5 минут)

### 1. Распакуйте архив

```bash
unzip banking-superapp.zip
cd banking-superapp
```

### 2. Запустите Docker

```bash
# Запуск PostgreSQL
docker-compose up -d

# Проверка
docker ps
# Должен быть контейнер banking_postgres
```

### 3. Установите зависимости

```bash
cd backend
npm install
```

### 4. Настройте окружение

```bash
# Скопируйте .env.example в .env
cp .env.example .env

# Файл .env уже настроен для работы
# Можете изменить при необходимости
```

### 5. Запустите сервер

```bash
npm run dev
```

**Готово!** Сервер запущен на http://localhost:5000

### 6. Проверьте работу

```bash
# Health check
curl http://localhost:5000/health

# Должен вернуть:
# {"status":"OK","timestamp":"...","uptime":...}
```

---

## 📚 Подробная установка

### Шаг 1: Подготовка окружения

#### Windows:
1. Установите [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Установите [Node.js](https://nodejs.org/) (LTS версия)
3. Установите [Git](https://git-scm.com/) (опционально)

#### macOS:
```bash
# Homebrew
brew install node
brew install --cask docker

# Или скачайте установщики с официальных сайтов
```

#### Linux (Ubuntu/Debian):
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo usermod -aG docker $USER
```

---

### Шаг 2: База данных

#### Вариант A: Docker (рекомендуется)

```bash
# Запустите PostgreSQL
docker-compose up -d

# Проверка
docker logs banking_postgres

# Подключение к БД
docker exec -it banking_postgres psql -U postgres -d banking_superapp

# Внутри psql:
\l              # список БД
\dt             # список таблиц
\q              # выход
```

#### Вариант B: Локальный PostgreSQL

Если у вас уже установлен PostgreSQL:

```bash
# Создайте БД
psql -U postgres
CREATE DATABASE banking_superapp;
\q

# Обновите .env файл:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=banking_superapp
```

---

### Шаг 3: Backend

```bash
cd backend

# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env

# Редактирование при необходимости
nano .env  # или любой редактор
```

#### Содержимое .env:

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=banking_superapp

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OTP
OTP_EXPIRY=300000

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

### Шаг 4: Создание таблиц

Таблицы создаются автоматически при первом запуске, но можете создать вручную:

```bash
# Подключитесь к БД
docker exec -it banking_postgres psql -U postgres -d banking_superapp

# Скопируйте и выполните SQL из database/schema.sql
```

Или выполните SQL файл:

```bash
docker exec -i banking_postgres psql -U postgres -d banking_superapp < database/schema.sql
```

---

### Шаг 5: Запуск

#### Development режим:

```bash
npm run dev
```

Сервер запустится с hot-reload (автоматическая перезагрузка при изменениях).

#### Production режим:

```bash
# Компиляция TypeScript
npm run build

# Запуск
npm start
```

---

## 🏗️ Структура проекта

```
banking-superapp/
├── backend/
│   ├── src/
│   │   ├── config/          # Конфигурация (DB, config)
│   │   ├── controllers/     # HTTP контроллеры (10 файлов)
│   │   ├── middleware/      # Middleware (auth, validation)
│   │   ├── routes/          # API роуты (11 файлов)
│   │   ├── services/        # Бизнес-логика (13 файлов)
│   │   ├── types/           # TypeScript типы (3 файла)
│   │   ├── utils/           # Утилиты (logger, validators)
│   │   └── server.ts        # Точка входа
│   ├── logs/                # Логи приложения
│   ├── .env.example         # Пример настроек
│   ├── package.json         # Зависимости
│   └── tsconfig.json        # TypeScript конфиг
├── database/
│   └── schema.sql           # SQL схема БД
├── docker-compose.yml       # Docker конфигурация
└── README.md               # Эта документация
```

---

## 📖 API Документация

### Базовый URL: `http://localhost:5000/api/v1`

### Модули (81 endpoint):

1. **Auth** (11 endpoints) - Регистрация, вход, 2FA
2. **Accounts** (9 endpoints) - Управление счетами
3. **Cards** (9 endpoints) - Управление картами
4. **Transactions** (7 endpoints) - Переводы, история
5. **Templates** (10 endpoints) - Шаблоны платежей
6. **Providers** (5 endpoints) - Провайдеры услуг
7. **Analytics** (5 endpoints) - Аналитика расходов
8. **Loans** (9 endpoints) - Кредиты
9. **Deposits** (7 endpoints) - Депозиты
10. **Notifications** (9 endpoints) - Уведомления

### Примеры запросов:

См. файлы в `backend/`:
- `API_EXAMPLES_STAGE2.md` - Аутентификация
- `API_EXAMPLES_STAGE3.md` - Банкинг
- `API_EXAMPLES_STAGE4.md` - Платежи
- `API_EXAMPLES_STAGE5.md` - Кредиты/депозиты
- `API_EXAMPLES_STAGE6.md` - Уведомления

---

## 🧪 Тестирование

### Быстрый тест (1 минута):

```bash
# 1. Health check
curl http://localhost:5000/health

# 2. Регистрация
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "full_name": "Test User",
    "phone": "+77001234567"
  }'

# 3. Вход
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Сохраните access_token из ответа
export TOKEN="ваш_токен"

# 4. Создайте счет
curl -X POST http://localhost:5000/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_type": "checking",
    "currency": "KZT"
  }'
```

### Полное тестирование:

См. файлы `QUICKSTART_STAGEX.md` для каждого этапа.

---

## 🔌 WebSocket

### Подключение:

```javascript
const { io } = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_ACCESS_TOKEN' }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('notification', (notif) => {
  console.log('New notification:', notif);
});
```

---

## 🗄️ База данных

### Таблицы (10):

1. `users` - Пользователи
2. `accounts` - Счета
3. `cards` - Карты
4. `transactions` - Транзакции
5. `payment_templates` - Шаблоны платежей
6. `loans` - Кредиты
7. `loan_payments` - Платежи по кредитам
8. `deposits` - Депозиты
9. `notifications` - Уведомления
10. `notification_settings` - Настройки уведомлений

### Просмотр данных:

```bash
# Подключение к БД
docker exec -it banking_postgres psql -U postgres -d banking_superapp

# Полезные команды:
\dt                           # Список таблиц
\d users                      # Структура таблицы
SELECT * FROM users;          # Все пользователи
SELECT * FROM accounts;       # Все счета
SELECT * FROM transactions    # Последние транзакции
  ORDER BY created_at DESC 
  LIMIT 10;
```

---

## 🐛 Решение проблем

### Проблема: "Cannot connect to database"

```bash
# Проверьте что PostgreSQL запущен
docker ps

# Перезапустите контейнер
docker-compose restart

# Проверьте логи
docker logs banking_postgres
```

### Проблема: "Port 5000 already in use"

```bash
# Измените порт в .env
PORT=5001

# Или найдите процесс и убейте
lsof -i :5000
kill -9 PID
```

### Проблема: "Module not found"

```bash
# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Tables not found"

```bash
# Создайте таблицы вручную
docker exec -i banking_postgres psql -U postgres -d banking_superapp < database/schema.sql
```

---

## 📝 Логи

```bash
# Все логи
tail -f backend/logs/combined.log

# Только ошибки
tail -f backend/logs/error.log

# Docker логи
docker logs -f banking_postgres
```

---

## 🔒 Безопасность

### В Production:

1. **Измените секреты** в `.env`:
   ```env
   JWT_ACCESS_SECRET=генерируйте-случайную-строку-длиной-минимум-32-символа
   JWT_REFRESH_SECRET=другую-случайную-строку-длиной-минимум-32-символа
   ```

2. **Ограничьте CORS**:
   ```env
   CORS_ORIGIN=https://ваш-домен.com
   ```

3. **Используйте HTTPS**
4. **Настройте firewall**
5. **Регулярно обновляйте зависимости**

---

## 📚 Дополнительная документация

- `PROJECT_STRUCTURE.md` - Подробная структура
- `DATABASE_SCHEMA.md` - Схема БД
- `STAGE2_COMPLETE.md` - Аутентификация
- `STAGE3_COMPLETE.md` - Банкинг
- `STAGE4_COMPLETE.md` - Платежи
- `STAGE5_COMPLETE.md` - Кредиты/депозиты
- `STAGE6_COMPLETE.md` - Уведомления

---

## 🎯 Что дальше?

После успешного запуска backend:

1. **Протестируйте API** - используйте Postman или curl
2. **Изучите документацию** - см. файлы STAGE*.md
3. **Создайте Frontend** - React Native приложение
4. **Добавьте тесты** - Jest, Supertest
5. **Deploy** - AWS, Heroku, DigitalOcean

---

## 💻 Полезные команды

```bash
# Development
npm run dev          # Запуск с hot-reload
npm run build        # Компиляция TypeScript
npm start            # Production запуск

# Docker
docker-compose up -d              # Запуск БД
docker-compose down               # Остановка
docker-compose logs -f postgres   # Логи БД

# База данных
docker exec -it banking_postgres psql -U postgres -d banking_superapp

# Очистка
npm run clean        # Удалить dist/
docker system prune  # Очистить Docker
```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте секцию [Решение проблем](#решение-проблем)
2. Посмотрите логи: `tail -f backend/logs/combined.log`
3. Проверьте что все сервисы запущены: `docker ps`

---

## 📄 Лицензия

MIT License - используйте свободно в своих проектах.

---

**🎉 Готово! Backend полностью функционален и готов к использованию!**

**Версия:** 1.0.0  
**Дата:** Ноябрь 2024  
**Прогресс:** 95% завершено

**Enjoy coding! 🚀**
