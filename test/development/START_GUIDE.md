# 🚀 Telegram 活動追蹤機器人 - 完整啟動指南

## 📋 **完整啟動流程**

### **步驟 1: 環境檢查**

```bash
# 1. 確認在正確目錄
cd /mnt/d/JavaScript_code_project/telegram_bot/activity_tracker_bot

# 2. 檢查檔案是否存在
ls -la .env package.json

# 3. 檢查 Token 是否設定
grep TELEGRAM_BOT_TOKEN .env

# 4. 檢查依賴是否安裝
npm list --depth=0
```

### **步驟 2: 安裝依賴（如果需要）**

```bash
# 如果 node_modules 不存在或不完整
npm install
```

### **步驟 3: 啟動機器人**

## 🎯 **方法 1: 使用重構後的新架構（推薦）**

```bash
# 啟動新版本機器人
npm start

# 或者使用開發模式（自動重啟）
npm run dev
```

**預期輸出：**
```
🚀 啟動 Telegram 活動追蹤機器人 (快速版本)...
✅ 使用重構後的新架構
✅ 安全的環境變數管理
🤖 Telegram Bot 已啟動並等待訊息...
📋 發送 /start 開始使用
```

## 🔄 **方法 2: 備用啟動方式**

如果主要方法有網路問題，可以嘗試：

```bash
# 方法 2A: 手動啟動
node quick-start.js

# 方法 2B: 測試版本
node test-bot.js

# 方法 2C: Webhook 版本
node webhook-bot.js
```

## 🏃‍♂️ **方法 3: 後台運行**

```bash
# 在後台運行（不會被 Ctrl+C 中斷）
nohup npm start > bot.log 2>&1 &

# 查看運行狀態
tail -f bot.log

# 停止後台運行
pkill -f "node quick-start.js"
```

## 🖥️ **方法 4: Windows CMD 啟動**

如果在 Windows 環境中：

```cmd
# 打開 Windows CMD 或 PowerShell
cd D:\JavaScript_code_project\telegram_bot\activity_tracker_bot

# 啟動機器人
npm start

# 或者直接執行
node quick-start.js
```

## 📱 **測試機器人功能**

### **機器人資訊**
- **名稱**: activity_tracker_bot
- **用戶名**: @thai_activity_tracker_bot
- **ID**: 8134343577

### **在 Telegram 中測試**

1. **搜尋機器人**
   - 在 Telegram 中搜尋 `@thai_activity_tracker_bot`
   - 或直接點擊連結：https://t.me/thai_activity_tracker_bot

2. **開始對話**
   - 點擊 "START" 按鈕
   - 或發送 `/start`

3. **測試指令**
   - `/start` - 歡迎訊息和功能介紹
   - `/activities` - 顯示活動選單
   - `/status` - 查看當前活動狀態
   - `/help` - 獲取幫助資訊

## 🔧 **故障排除**

### **問題 1: 網路連接錯誤（Polling Error）**

**症狀：**
```
Polling 錯誤: RequestError: AggregateError
```

**解決方案：**
```bash
# 1. 檢查網路連接
ping api.telegram.org

# 2. 嘗試不同的啟動方式
node webhook-bot.js

# 3. 使用測試腳本
node test-bot.js

# 4. 在 Windows 環境下嘗試
```

### **問題 2: Token 未設置**

**症狀：**
```
❌ TELEGRAM_BOT_TOKEN 環境變數未設置
```

**解決方案：**
```bash
# 編輯 .env 文件
nano .env

# 確保內容為：
TELEGRAM_BOT_TOKEN=8134343577:AAG2s19KY8TTZy8XcdnEy3Fa5Cvbfzhn0fc
```

### **問題 3: 依賴缺失**

**症狀：**
```
Error: Cannot find module 'xxx'
```

**解決方案：**
```bash
# 重新安裝依賴
rm -rf node_modules package-lock.json
npm install
```

### **問題 4: 機器人沒有回應**

**檢查步驟：**

1. **確認機器人在運行**
   ```bash
   ps aux | grep node
   ```

2. **檢查日誌**
   ```bash
   tail -f bot.log
   ```

3. **測試 API 連接**
   ```bash
   curl "https://api.telegram.org/bot8134343577:AAG2s19KY8TTZy8XcdnEy3Fa5Cvbfzhn0fc/getMe"
   ```

4. **手動測試**
   ```bash
   node test-bot.js
   ```

## 🌟 **高級選項**

### **環境變數配置**

編輯 `.env` 文件可以自訂：

```bash
# Telegram Bot 配置
TELEGRAM_BOT_TOKEN=你的Token

# 資料庫配置
DB_TYPE=sqlite
DB_PATH=activities.db

# 報告配置
REPORTS_DIR=reports
REPORT_TIME=5 23 * * *

# 應用配置
NODE_ENV=production
LOG_LEVEL=info
```

### **不同版本的啟動指令**

```bash
# 新架構版本（預設）
npm start

# 新架構開發模式
npm run dev

# 舊版本（需要 better-sqlite3）
npm run start:legacy

# 雙語版本
npm run bilingual

# 簡化版本
npm run simple

# 演示模式
npm run demo
```

## 📊 **監控和維護**

### **查看運行狀態**
```bash
# 檢查進程
ps aux | grep node

# 檢查端口使用
netstat -tlnp | grep :3000

# 查看系統資源
top | grep node
```

### **日誌管理**
```bash
# 即時查看日誌
tail -f bot.log

# 查看錯誤日誌
grep -i error bot.log

# 清理日誌
> bot.log
```

## 🎉 **成功啟動確認**

當看到以下輸出時，表示機器人已成功啟動：

```
🚀 啟動 Telegram 活動追蹤機器人 (快速版本)...
✅ 使用重構後的新架構
✅ 安全的環境變數管理
🤖 Telegram Bot 已啟動並等待訊息...
📋 發送 /start 開始使用
🔧 這是展示新架構的快速版本
💾 注意：此版本使用內存存儲，重啟後數據會遺失

✅ 重構成功，核心功能正常運行！
```

**立即在 Telegram 中搜尋 `@thai_activity_tracker_bot` 開始使用！**