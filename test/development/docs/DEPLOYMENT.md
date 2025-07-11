# 部署指南 🚀

## 概述

本文檔提供了 Telegram Activity Tracker Bot 的完整部署指南，涵蓋多種部署方式和環境配置。

## 部署方式對比

| 部署方式 | 適用場景 | 優點 | 缺點 |
|----------|----------|------|------|
| 本地直接運行 | 開發測試 | 簡單快速 | 不穩定，無自動重啟 |
| PM2 部署 | 小型生產環境 | 進程管理，自動重啟 | 單機部署 |
| Docker 部署 | 容器化環境 | 環境一致性，易於遷移 | 需要 Docker 知識 |
| 雲端部署 | 大型生產環境 | 高可用性，自動擴展 | 成本較高 |

## 🖥️ 本地部署

### 前置要求

- Node.js 14.0.0 或以上版本
- npm 6.0.0 或以上版本
- Git

### 步驟詳解

#### 1. 克隆項目

```bash
git clone https://github.com/your-username/telegram-activity-tracker-bot.git
cd telegram-activity-tracker-bot
```

#### 2. 安裝依賴

```bash
npm install
```

#### 3. 環境配置

複製環境變數範例檔案：
```bash
cp .env.example .env
```

編輯 `.env` 檔案：
```env
# Telegram Bot Token (必要)
TELEGRAM_BOT_TOKEN=123456789:AABBCCDDEEFFGGHHIIJJKKLLMMNNOOpp

# 資料庫設定
DATABASE_PATH=./data/activities.db

# 報告設定
REPORT_BASE_DIR=./statistics
REPORT_TIME=23:00

# 時區設定
TIMEZONE=Asia/Taipei

# 日誌設定
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

#### 4. 創建必要目錄

```bash
mkdir -p data
mkdir -p statistics
mkdir -p logs
```

#### 5. 啟動應用

```bash
# 生產環境
npm start

# 開發環境（自動重啟）
npm run dev
```

#### 6. 驗證部署

檢查應用是否正常運行：
```bash
# 查看進程
ps aux | grep node

# 查看日誌
tail -f logs/app.log
```

## 🔄 PM2 部署

PM2 是 Node.js 應用的進程管理器，提供自動重啟、日誌管理等功能。

### 安裝 PM2

```bash
npm install -g pm2
```

### 創建 PM2 配置檔案

創建 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'activity-tracker-bot',
    script: './src/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 日誌配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 重啟策略
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // 健康檢查
    health_check_grace_period: 3000,
    health_check_interval: 30000
  }]
};
```

### 部署步驟

```bash
# 啟動應用
pm2 start ecosystem.config.js

# 查看狀態
pm2 status

# 查看日誌
pm2 logs activity-tracker-bot

# 設定開機啟動
pm2 startup
pm2 save

# 停止應用
pm2 stop activity-tracker-bot

# 重啟應用
pm2 restart activity-tracker-bot

# 刪除應用
pm2 delete activity-tracker-bot
```

### PM2 監控

```bash
# 監控面板
pm2 monit

# 查看詳細資訊
pm2 show activity-tracker-bot

# 重載配置
pm2 reload ecosystem.config.js
```

## 🐳 Docker 部署

### 創建 Dockerfile

```dockerfile
FROM node:16-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production && npm cache clean --force

# 複製應用程式碼
COPY . .

# 創建必要目錄
RUN mkdir -p data statistics logs

# 設定用戶
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 啟動命令
CMD ["npm", "start"]
```

### Docker Compose 配置

創建 `docker-compose.yml`：
```yaml
version: '3.8'

services:
  activity-tracker-bot:
    build: .
    container_name: activity-tracker-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - DATABASE_PATH=/app/data/activities.db
      - REPORT_BASE_DIR=/app/statistics
      - TIMEZONE=Asia/Taipei
    volumes:
      - ./data:/app/data
      - ./statistics:/app/statistics
      - ./logs:/app/logs
    ports:
      - "3000:3000"
    depends_on:
      - redis
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network

volumes:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### Docker 部署步驟

```bash
# 構建映像
docker build -t activity-tracker-bot .

# 使用 Docker Compose 部署
docker-compose up -d

# 查看日誌
docker-compose logs -f activity-tracker-bot

# 查看狀態
docker-compose ps

# 停止服務
docker-compose stop

# 重啟服務
docker-compose restart

# 清理
docker-compose down
docker-compose down -v  # 同時刪除 volumes
```

## ☁️ 雲端部署

### AWS EC2 部署

#### 1. 創建 EC2 實例

```bash
# 使用 AWS CLI 創建實例
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.micro \
  --key-name my-key-pair \
  --security-groups my-security-group \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ActivityTrackerBot}]'
```

#### 2. 配置安全組

```bash
# 允許 SSH 連接
aws ec2 authorize-security-group-ingress \
  --group-name my-security-group \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# 允許 HTTP 連接
aws ec2 authorize-security-group-ingress \
  --group-name my-security-group \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

#### 3. 連接並設定實例

```bash
# 連接到實例
ssh -i my-key-pair.pem ec2-user@your-instance-public-ip

# 更新系統
sudo yum update -y

# 安裝 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 16
nvm use 16

# 安裝 PM2
npm install -g pm2

# 克隆並部署應用
git clone https://github.com/your-username/telegram-activity-tracker-bot.git
cd telegram-activity-tracker-bot
npm install
cp .env.example .env
# 編輯 .env 文件
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Heroku 部署

#### 1. 安裝 Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu
curl https://cli-assets.heroku.com/install-ubuntu.sh | sh
```

#### 2. 創建 Heroku 應用

```bash
# 登錄 Heroku
heroku login

# 創建應用
heroku create activity-tracker-bot

# 設定環境變數
heroku config:set TELEGRAM_BOT_TOKEN=your-token-here
heroku config:set NODE_ENV=production
heroku config:set TIMEZONE=Asia/Taipei

# 部署
git push heroku main
```

#### 3. Heroku 配置檔案

創建 `Procfile`：
```
web: node src/app.js
```

創建 `app.json`：
```json
{
  "name": "Activity Tracker Bot",
  "description": "Telegram bot for tracking daily activities",
  "keywords": ["telegram", "bot", "activity", "tracker"],
  "website": "https://github.com/your-username/telegram-activity-tracker-bot",
  "repository": "https://github.com/your-username/telegram-activity-tracker-bot",
  "env": {
    "TELEGRAM_BOT_TOKEN": {
      "description": "Telegram Bot Token",
      "required": true
    },
    "TIMEZONE": {
      "description": "Application timezone",
      "value": "Asia/Taipei"
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "free"
    }
  },
  "addons": [
    "heroku-postgresql:hobby-dev"
  ]
}
```

### DigitalOcean Droplet 部署

#### 1. 創建 Droplet

```bash
# 使用 doctl CLI
doctl compute droplet create activity-tracker-bot \
  --image ubuntu-20-04-x64 \
  --size s-1vcpu-1gb \
  --region sgp1 \
  --ssh-keys your-ssh-key-id
```

#### 2. 初始化服務器

```bash
# 連接到 Droplet
ssh root@your-droplet-ip

# 更新系統
apt update && apt upgrade -y

# 安裝 Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
apt-get install -y nodejs

# 安裝 PM2
npm install -g pm2

# 創建應用用戶
adduser --disabled-password --gecos "" appuser

# 切換到應用用戶
su - appuser

# 克隆並部署應用
git clone https://github.com/your-username/telegram-activity-tracker-bot.git
cd telegram-activity-tracker-bot
npm install
cp .env.example .env
# 編輯 .env 文件
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## 📊 監控與日誌

### PM2 監控

```bash
# 實時監控
pm2 monit

# 查看日誌
pm2 logs

# 查看特定應用日誌
pm2 logs activity-tracker-bot

# 清理日誌
pm2 flush
```

### 日誌輪轉

創建 `pm2-logrotate` 配置：
```bash
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

### 系統監控

#### 使用 htop 監控資源
```bash
# 安裝 htop
sudo apt install htop

# 運行監控
htop
```

#### 使用 systemd 服務

創建 systemd 服務檔案 `/etc/systemd/system/activity-tracker-bot.service`：
```ini
[Unit]
Description=Activity Tracker Bot
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/home/appuser/telegram-activity-tracker-bot
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/appuser/telegram-activity-tracker-bot/.env

[Install]
WantedBy=multi-user.target
```

啟用服務：
```bash
sudo systemctl daemon-reload
sudo systemctl enable activity-tracker-bot
sudo systemctl start activity-tracker-bot
sudo systemctl status activity-tracker-bot
```

## 🔧 故障排除

### 常見問題

#### 1. 應用無法啟動

**問題診斷**：
```bash
# 檢查日誌
pm2 logs activity-tracker-bot

# 檢查進程
ps aux | grep node

# 檢查端口
netstat -tlnp | grep 3000
```

**解決方案**：
- 檢查環境變數是否正確設定
- 確認 Bot Token 有效性
- 檢查防火牆設定
- 確認依賴是否完整安裝

#### 2. 記憶體使用過高

**監控記憶體**：
```bash
# 查看進程記憶體使用
ps aux --sort=-%mem | head

# 使用 PM2 監控
pm2 monit
```

**解決方案**：
- 設定 PM2 記憶體限制
- 優化程式碼減少記憶體洩漏
- 增加服務器記憶體

#### 3. 資料庫連接問題

**診斷**：
```bash
# 檢查資料庫檔案權限
ls -la data/

# 檢查磁碟空間
df -h
```

**解決方案**：
- 確認資料庫目錄權限
- 檢查磁碟空間是否充足
- 清理過期資料

### 性能優化

#### 1. 應用層優化

```javascript
// 使用連接池
const pool = new ConnectionPool({
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000
});

// 實現快取
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分鐘
```

#### 2. 系統層優化

```bash
# 調整系統參數
echo 'vm.max_map_count=262144' >> /etc/sysctl.conf
echo 'fs.file-max=65536' >> /etc/sysctl.conf
sysctl -p

# 優化 Node.js 參數
NODE_OPTIONS="--max-old-space-size=1024" npm start
```

## 🔒 安全考量

### 防火牆配置

```bash
# Ubuntu UFW
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status

# CentOS firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### SSL/TLS 配置

使用 Let's Encrypt 設定 HTTPS：
```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx

# 獲取證書
sudo certbot --nginx -d yourdomain.com

# 自動更新
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 環境變數安全

```bash
# 設定檔案權限
chmod 600 .env

# 使用 Docker secrets
docker secret create telegram_token /path/to/token/file
```

## 📋 部署檢查清單

### 部署前檢查
- [ ] 確認 Node.js 版本兼容性
- [ ] 檢查環境變數配置
- [ ] 驗證 Bot Token 有效性
- [ ] 確認網路連接正常
- [ ] 檢查磁碟空間充足

### 部署後檢查
- [ ] 應用正常啟動
- [ ] Bot 能正常響應指令
- [ ] 資料庫連接正常
- [ ] 日誌記錄正常
- [ ] 定時任務運行正常
- [ ] 監控系統配置完成

### 維護檢查
- [ ] 定期更新依賴
- [ ] 監控系統資源使用
- [ ] 備份重要資料
- [ ] 檢查日誌輪轉
- [ ] 測試故障恢復

---

*完成部署後，記得將 Bot 添加到你的 Telegram 群組並發送 `/start` 命令開始使用！*