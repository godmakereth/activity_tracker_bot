# 使用官方 Node.js 16 Alpine 基礎映像
FROM node:16-alpine

# 設定維護者資訊
LABEL maintainer="Activity Tracker Bot Team <support@activity-tracker.com>"
LABEL version="1.0.0"
LABEL description="Telegram bot for tracking daily activities"

# 安裝必要的系統依賴
RUN apk add --no-cache \
    tini \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 設定工作目錄
WORKDIR /app

# 複製 package files
COPY package*.json ./

# 設定 npm 配置以提高安裝速度
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fund false \
    && npm config set audit false

# 安裝生產依賴
RUN npm ci --only=production \
    && npm cache clean --force \
    && rm -rf /tmp/*

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# 複製應用程式碼
COPY --chown=nodejs:nodejs . .

# 創建必要目錄並設定權限
RUN mkdir -p data statistics logs \
    && chown -R nodejs:nodejs /app \
    && chmod -R 755 /app

# 切換到非 root 用戶
USER nodejs

# 暴露端口
EXPOSE 3000

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/activities.db
ENV REPORT_BASE_DIR=/app/statistics
ENV TIMEZONE=Asia/Taipei

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e " \
        const http = require('http'); \
        const options = { \
            host: 'localhost', \
            port: process.env.PORT || 3000, \
            path: '/health', \
            timeout: 2000 \
        }; \
        const request = http.request(options, (res) => { \
            console.log('Health check status:', res.statusCode); \
            process.exit(res.statusCode === 200 ? 0 : 1); \
        }); \
        request.on('error', () => { \
            console.log('Health check failed'); \
            process.exit(1); \
        }); \
        request.end();" || exit 1

# 設定啟動參數
ENTRYPOINT ["/sbin/tini", "--"]

# 啟動命令
CMD ["node", "src/app.js"]

# 設定 volume 掛載點
VOLUME ["/app/data", "/app/statistics", "/app/logs"]

# 設定 labels 用於容器管理
LABEL org.opencontainers.image.title="Activity Tracker Bot"
LABEL org.opencontainers.image.description="Telegram bot for tracking daily activities with bilingual support"
LABEL org.opencontainers.image.vendor="Activity Tracker Bot Team"
LABEL org.opencontainers.image.source="https://github.com/your-username/telegram-activity-tracker-bot"
LABEL org.opencontainers.image.documentation="https://github.com/your-username/telegram-activity-tracker-bot/blob/main/docs/README.md"