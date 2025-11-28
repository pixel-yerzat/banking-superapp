# Multi-stage build для оптимизации размера образа

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./
COPY tsconfig.json ./


RUN npm install @vonage/server-sdk
# Устанавливаем зависимости
RUN npm i \
npm cache clean --force

RUN npm install typescript -g

# Копируем исходный код
COPY src ./src

RUN mkdir -p /app/logs && chmod 777 /app/logs
# Компилируем TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Устанавливаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Копируем только необходимые файлы из builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Переключаемся на непривилегированного пользователя
USER nodejs

# Открываем порт
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Запускаем приложение
CMD ["node", "dist/server.js"]
