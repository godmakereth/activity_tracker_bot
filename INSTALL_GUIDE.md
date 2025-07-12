# 📦 Activity Tracker Bot 安裝指南

## 🔄 新設備快速部署指南

### 📱 移動到新設備的完整步驟

#### 步驟 1：環境準備
```bash
# 1. 檢查 Node.js 版本（需要 14.0+）
node --version

# 2. 如果未安裝 Node.js：
# Windows: 從 https://nodejs.org/ 下載安裝
# macOS: brew install node
# Ubuntu: sudo apt install nodejs npm
```

#### 步驟 2：獲取專案文件
```bash
# 方法 A：Git 克隆（推薦）
git clone [repository-url]
cd activity_tracker_bot

# 方法 B：ZIP 解壓
# 1. 下載 ZIP 檔案
# 2. 解壓到任意位置
# 3. 開啟終端/命令提示字元到該目錄
```

#### 步驟 3：配置 Telegram Bot
```bash
# 1. 在 Telegram 找到 @BotFather
# 2. 發送 /newbot 創建新機器人
# 3. 設定機器人名稱和用戶名
# 4. 複製獲得的 Token（格式：123456789:XXXXXXX）
```

#### 步驟 4：設置環境配置
```bash
# 1. 複製環境配置模板
copy .env.example .env         # Windows
cp .env.example .env           # macOS/Linux

# 2. 編輯 .env 檔案
notepad .env                   # Windows
nano .env                      # Linux
open .env                      # macOS

# 3. 將 Token 替換為實際值：
TELEGRAM_BOT_TOKEN=123456789:實際的Token值
```

#### 步驟 5：一鍵啟動
```bash
# Windows 用戶（最簡單）
雙擊 start-project.bat

# macOS/Linux 用戶
chmod +x start-project.sh
./start-project.sh

# 通用方法
npm install  # 安裝依賴
npm start    # 啟動專案
```

## 🚀 快速開始（5分鐘設置）

### 📋 安裝步驟

#### 1. **獲取專案**
```bash
# 如果是從 ZIP 下載，解壓到任意位置
# 如果是 Git 克隆：
git clone [repository-url]
cd activity_tracker_bot
```

#### 2. **設置 Telegram Bot Token**
1. 在 Telegram 中找到 `@BotFather`
2. 發送 `/newbot` 創建新 Bot
3. 複製獲得的 Token

#### 3. **配置環境變數**
1. 複製 `.env.example` 為 `.env`
   ```bash
   copy .env.example .env
   ```
2. 編輯 `.env` 檔案，替換 Token：
   ```
   TELEGRAM_BOT_TOKEN=你的實際Token
   ```

#### 4. **啟動專案**

**Windows 用戶（推薦）：**
```bash
雙擊 start-project.bat
```

**macOS/Linux 用戶：**
```bash
chmod +x start-project.sh
./start-project.sh
```

**通用方法（所有系統）：**
```bash
npm start
```

### ✅ 啟動成功標誌
看到以下訊息表示成功：
```
✅ Bot 輪詢已啟動
🌐 詳細員工數據面板已啟動: http://localhost:3000
🎉 應用程式初始化完成！
```

### 📱 使用方式
1. **將 Bot 添加到 Telegram 群組**
2. **發送 `/start` 開始使用**
3. **訪問 http://localhost:3000 查看統計**

## 🔧 系統需求

### 所有系統通用
- **Node.js** 14.0 或更高版本
- **npm** 套件管理器

### 按作業系統分類

#### 🥇 Windows 10/11（最佳體驗）
- ✅ 一鍵啟動 `start-project.bat`
- ✅ 完整錯誤提示
- ✅ 開箱即用

#### 🥈 macOS（完全支援）
```bash
# 安裝 Node.js
brew install node

# 啟動專案
./start-project.sh
```

#### 🥉 Linux（Ubuntu/CentOS/Debian）
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm

# 啟動專案
./start-project.sh
```

## ⚠️ 重要注意事項

### 🚨 Token 安全
- ❌ **絕不要**分享您的 Bot Token
- ✅ **每個人**都應該使用自己的 Token
- ✅ **一個 Token** 只能同時有一個實例運行

### 📂 檔案結構
```
activity_tracker_bot/
├── .env                 # 您的環境配置（不要分享）
├── .env.example         # 配置模板
├── start-project.bat    # 一鍵啟動腳本
├── package.json         # 專案配置
├── src/                 # 源代碼
├── data/                # 運行時數據
└── ...
```

## 📁 資料遷移指南

### 💾 從舊設備複製資料
如果您要從舊設備遷移資料到新設備：

```bash
# 複製以下重要檔案/目錄：
.env                    # 環境配置
data/                   # 所有運行資料
archives/              # 歷史存檔
logs/                  # 日誌檔案（可選）
```

### 🔄 遷移步驟
1. **在舊設備上**：
   ```bash
   # 停止服務
   Ctrl + C
   
   # 複製重要資料
   # Windows: 使用檔案總管複製上述目錄
   # macOS/Linux: 
   tar -czf backup-data.tar.gz .env data/ archives/ logs/
   ```

2. **在新設備上**：
   ```bash
   # 先完成基本安裝（步驟 1-4）
   
   # 然後復原資料
   # Windows: 直接貼上資料目錄
   # macOS/Linux:
   tar -xzf backup-data.tar.gz
   
   # 啟動服務
   npm start
   ```

### ✅ 驗證遷移成功
- 檢查 Bot 能正常回應
- 訪問 http://localhost:3000 確認歷史資料存在
- 發送測試訊息確認功能正常

## 🐛 常見問題與排除

### ❌ 安裝問題

#### Q: Node.js 版本太舊？
```bash
# 檢查版本
node --version

# 如果低於 14.0，請更新：
# Windows: 重新下載安裝 https://nodejs.org/
# macOS: brew upgrade node
# Ubuntu: 
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Q: npm install 失敗？
```bash
# 清理並重新安裝
rm -rf node_modules package-lock.json   # Linux/macOS
rmdir /s node_modules & del package-lock.json  # Windows

npm cache clean --force
npm install
```

### ❌ 運行問題

#### Q: 出現 "409 Conflict" 錯誤？
**原因**: Token 被其他實例使用
**解決方案**:
```bash
# 使用安全啟動腳本
npm start  # 會自動處理衝突

# 或手動重置
npm run reset
npm run start-unsafe
```

#### Q: 環境變數載入失敗？
**檢查清單**:
- [ ] `.env` 檔案是否存在於專案根目錄
- [ ] Token 格式正確（數字:字母組合）
- [ ] 檔案編碼為 UTF-8
- [ ] 沒有多餘的空格或引號

#### Q: 網頁面板無法開啟？
**排除步驟**:
```bash
# 檢查服務是否啟動
# 看控制台是否顯示：✅ Bot 輪詢已啟動

# 檢查端口占用
netstat -an | findstr :3000  # Windows
lsof -i :3000                # macOS/Linux

# 嘗試其他端口
# 編輯 .env 檔案，添加：
WEB_PORT=3001
```

### ❌ Token 問題

#### Q: Bot Token 無效？
**解決步驟**:
1. 到 @BotFather 確認 Bot 狀態
2. 發送 `/token` 重新獲取 Token
3. 確認複製時沒有多餘字符
4. 重新設定 `.env` 檔案

#### Q: Bot 無法回應訊息？
**檢查項目**:
- [ ] Bot 已加入群組
- [ ] Bot 具有群組訊息權限
- [ ] 發送 `/start` 啟動 Bot
- [ ] 檢查控制台錯誤訊息

## 💡 進階設置

### 自訂配置
可在 `.env` 檔案中修改：
```
WEB_PORT=3000          # Web 服務端口
TIMEZONE=Asia/Taipei   # 時區設置
REPORT_TIME=23:00      # 報告生成時間
```

### 定時任務
系統會自動設置以下定時任務：
- 📊 **每日報告** - 23:00
- 📁 **Excel 存檔** - 23:00
- 🧹 **數據清理** - 02:00
- ❤️ **健康檢查** - 每小時

## 🔒 安全性注意事項

### 🚨 重要安全規則

#### Token 安全
- ❌ **絕不要**將 Token 提交到 Git
- ❌ **絕不要**在聊天中分享 Token
- ❌ **絕不要**在截圖中顯示 Token
- ✅ **定期**更換 Token（建議每3個月）

#### 檔案安全
```bash
# .env 檔案應該在 .gitignore 中
echo ".env" >> .gitignore

# 檢查是否意外提交敏感檔案
git status
```

#### 網路安全
- 防火牆設定僅允許必要端口
- 定期更新 Node.js 和依賴套件
- 在生產環境中使用 HTTPS

### 🛡️ 最佳實踐

#### 開發環境
```bash
# 使用不同的 Token 進行開發測試
TELEGRAM_BOT_TOKEN_DEV=開發用Token
TELEGRAM_BOT_TOKEN_PROD=生產用Token
```

#### 備份策略
```bash
# 定期備份重要資料
# 設定自動備份腳本（每日）
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf "backup-$DATE.tar.gz" .env data/ archives/
```

#### 監控和日誌
- 定期檢查日誌檔案
- 設定異常警報
- 監控系統資源使用情況

## 🚀 生產環境部署

### 🏢 伺服器部署建議

#### 系統要求
- **記憶體**: 最少 512MB，建議 1GB+
- **存儲**: 最少 1GB 可用空間
- **網路**: 穩定的網路連接
- **系統**: Ubuntu 20.04+ 或 CentOS 8+

#### 使用 PM2 管理（推薦）
```bash
# 安裝 PM2
npm install -g pm2

# 啟動服務
pm2 start start-final.js --name "activity-tracker"

# 設定自動重啟
pm2 startup
pm2 save

# 監控狀態
pm2 status
pm2 logs activity-tracker
```

#### 使用 Docker（可選）
```bash
# 建置映像
docker build -t activity-tracker-bot .

# 執行容器
docker run -d --name activity-bot \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env \
  activity-tracker-bot
```

### 🔧 效能調整

#### 記憶體優化
```bash
# 在 .env 檔案中設定
NODE_OPTIONS="--max-old-space-size=1024"
```

#### 資料庫優化
- 定期清理舊資料
- 設定資料保留期限
- 考慮使用 SQLite 或 PostgreSQL

## 📊 維護指南

### 🧹 定期維護任務

#### 每週檢查
- [ ] 檢查日誌錯誤
- [ ] 確認 Bot 回應正常
- [ ] 檢查磁盘空間
- [ ] 備份重要資料

#### 每月檢查
- [ ] 更新依賴套件：`npm update`
- [ ] 檢查安全性警告：`npm audit`
- [ ] 清理舊日誌檔案
- [ ] 檢查系統效能

#### 季度檢查
- [ ] 更換 Bot Token
- [ ] 審查存取權限
- [ ] 更新 Node.js 版本
- [ ] 完整系統備份

### 🆘 獲取幫助

#### 自助排除
1. **檢查控制台錯誤訊息**
2. **確認 Node.js 和 npm 版本**
3. **驗證 Token 有效性**
4. **測試網路連接**
5. **查看系統資源使用情況**

#### 常用偵錯命令
```bash
# 檢查服務狀態
npm run status

# 查看詳細日誌
npm run logs

# 執行健康檢查
npm run health-check

# 重啟服務
npm run restart
```

#### 支援資源
- 📚 查看專案 README.md
- 🐛 檢查 Issues 頁面
- 💬 參考社群討論
- 📖 閱讀官方文檔

---
**🎉 祝您使用愉快！**

> 💡 **提示**: 將此安裝指南保存到書籤，方便日後參考。定期檢查更新版本以獲得最新功能和安全修復。