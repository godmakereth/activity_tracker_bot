# 🚀 專案啟動指令大全

## 📋 完整 CMD 啟動指令

### 方法一：逐步手動執行
```batch
REM 1. 切換到專案目錄
cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"

REM 2. 檢查 Node.js 版本
node --version

REM 3. 檢查 npm 版本  
npm --version

REM 4. 安裝依賴套件（如果需要）
npm install

REM 5. 啟動專案
npm start
```

### 方法二：一鍵啟動腳本
**已建立 `start-project.bat` 檔案**
- 雙擊 `start-project.bat` 即可自動執行所有步驟
- 自動檢查環境、安裝依賴、啟動服務

## 💻 PowerShell 啟動指令

```powershell
# 切換到專案目錄
Set-Location "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"

# 檢查環境
Write-Host "檢查 Node.js 版本..." -ForegroundColor Green
node --version

Write-Host "檢查 npm 版本..." -ForegroundColor Green
npm --version

# 安裝依賴（如果需要）
if (!(Test-Path "node_modules")) {
    Write-Host "安裝依賴套件..." -ForegroundColor Yellow
    npm install
}

# 啟動專案
Write-Host "啟動 Activity Tracker Bot..." -ForegroundColor Cyan
npm start
```

## 🔧 開發模式啟動指令

### 開發模式（自動重啟）
```batch
cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"
npm run dev
```

### 測試模式
```batch
cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"
npm test
```

## 🌐 服務訪問地址

啟動成功後可以訪問：

- **🤖 Telegram Bot**: 在 Telegram 中搜索您的 Bot
- **🌐 網頁數據面板**: http://localhost:3000
- **📊 API 端點**: http://localhost:3000/api
- **📄 API 文檔**: 查看 README.md 中的 API 說明

## 🛠️ 環境檢查指令

### 檢查 Node.js 環境
```batch
REM 檢查 Node.js 版本
node --version

REM 檢查 npm 版本
npm --version

REM 檢查已安裝的套件
npm list --depth=0

REM 檢查過期套件
npm outdated
```

### 檢查專案檔案
```batch
REM 檢查重要檔案是否存在
dir start-final.js
dir package.json
dir src\app.js

REM 檢查資料目錄
dir data
dir archives
dir logs
```

## 🔄 更新和維護指令

### 更新專案依賴
```batch
cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"
npm update
```

### 清理快取
```batch
cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"
npm cache clean --force
rmdir /s /q node_modules
npm install
```

### 查看執行日誌
```batch
REM 啟動時顯示詳細日誌
set DEBUG=*
npm start
```

## 🐛 問題排解指令

### 常見問題檢查
```batch
REM 檢查埠口占用
netstat -ano | findstr :3000

REM 檢查 Node.js 程序
tasklist | findstr node

REM 強制結束 Node.js 程序
taskkill /f /im node.exe

REM 檢查環境變數
echo %PATH%
echo %NODE_ENV%
```

### 重新安裝依賴
```batch
cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
```

## 📦 部署相關指令

### 生產環境啟動
```batch
cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"
set NODE_ENV=production
npm start
```

### 使用 PM2 管理（如果已安裝）
```batch
cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"
pm2 start start-final.js --name "activity-tracker"
pm2 status
pm2 logs activity-tracker
pm2 stop activity-tracker
```

## 🔐 設定相關指令

### 檢查 Telegram Bot Token
```batch
REM 查看 start-final.js 中的 Token 設定
findstr "TELEGRAM_BOT_TOKEN" start-final.js
```

### 修改設定檔案
```batch
REM 編輯啟動檔案
notepad start-final.js

REM 編輯套件設定
notepad package.json
```

## 📊 監控指令

### 即時監控
```batch
REM 監控系統資源
wmic process where name="node.exe" get ProcessId,PageFileUsage,WorkingSetSize

REM 監控網路連接
netstat -an | findstr :3000
```

### 日誌查看
```batch
REM 查看 Windows 事件日誌中的應用程式錯誤
eventvwr.msc
```

## 🎯 快速命令摘要

| 功能 | 指令 |
|------|------|
| 切換目錄 | `cd /d "D:\JavaScript_code_project\telegram_bot\activity_tracker_bot"` |
| 安裝依賴 | `npm install` |
| 啟動專案 | `npm start` |
| 開發模式 | `npm run dev` |
| 執行測試 | `npm test` |
| 檢查版本 | `node --version && npm --version` |
| 檢查埠口 | `netstat -ano \| findstr :3000` |
| 停止服務 | `Ctrl + C` |

## 💡 使用建議

1. **首次啟動**: 使用 `start-project.bat` 一鍵啟動
2. **日常使用**: 直接執行 `npm start`
3. **開發調試**: 使用 `npm run dev` 自動重啟
4. **問題排解**: 先檢查環境，再重新安裝依賴

---

**🚀 將這些指令保存起來，隨時可以快速啟動您的專案！**