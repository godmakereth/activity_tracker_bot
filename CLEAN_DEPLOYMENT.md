# 🚀 新電腦部署完整指南

## ❌ 絕對不要複製的檔案/資料夾

### 📊 運行時資料 (包含舊電腦的狀態)
```
data/                  ❌ 完全不要複製
├── activities.json    ❌ 包含舊群組和活動記錄
├── activities.db      ❌ 資料庫檔案
└── *.db              ❌ 任何資料庫檔案

archives/              ❌ 完全不要複製  
├── excel/            ❌ 舊的Excel存檔
└── reports/          ❌ 舊的報告檔案

logs/                  ❌ 完全不要複製
├── *.log             ❌ 舊的日誌檔案
└── error.log         ❌ 錯誤記錄

statistics/            ❌ 完全不要複製
└── *.json            ❌ 統計檔案
```

### 🔧 系統檔案
```
node_modules/          ❌ 重新安裝 (用 npm install)
package-lock.json      ⚠️  可複製但建議重新生成
.env                   ⚠️  需要修改設定
```

### 🗂️ 臨時檔案
```
*.tmp                  ❌ 臨時檔案
*.temp                 ❌ 臨時檔案
~$*.xlsx              ❌ Excel臨時檔案
.DS_Store             ❌ macOS系統檔案
Thumbs.db             ❌ Windows系統檔案
```

### 🔄 開發檔案 (如果存在)
```
test-*.js             ❌ 測試腳本
manual-*.js           ❌ 手動執行腳本
debug-*.js            ❌ 除錯腳本
*.test.js             ❌ 測試檔案
```

## ✅ 應該複製的檔案

### 📋 核心程式
```
src/                  ✅ 完整複製
├── app.js           
├── application/     
├── domain/          
├── infrastructure/  
├── presentation/    
└── shared/          

config/               ✅ 設定檔案
├── security/        
└── *.json          

deployment/           ✅ 部署相關
├── Dockerfile       
├── docker-compose.yml
└── *.sh            
```

### 📄 設定和文件
```
package.json          ✅ 依賴清單
.env.example          ✅ 環境變數範本
*.md                  ✅ 說明文件
LICENSE               ✅ 授權檔案
.gitignore            ✅ Git忽略清單
```

### 🚀 啟動腳本
```
start.bat             ✅ Windows啟動
start.ps1             ✅ PowerShell啟動  
start-final.js        ✅ 主程式
start-project.bat     ✅ 專案啟動器
start-project.sh      ✅ Linux/Mac啟動
safe-start.js         ✅ 安全啟動
reset-bot.js          ✅ 重置腳本
```

## 🛠️ 新電腦完整部署步驟

### 1️⃣ 複製檔案
```bash
# 建立資料夾結構 (排除不需要的檔案)
mkdir telegram_bot_new
cd telegram_bot_new

# 複製必要檔案 (手動或選擇性複製)
```

### 2️⃣ 安裝依賴
```bash
npm install
```

### 3️⃣ 設定環境變數
```bash
# 複製範本
cp .env.example .env

# 編輯 .env
notepad .env  # Windows
nano .env     # Linux/Mac
```

**必要設定項目：**
```ini
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_CHAT_ID=your_admin_chat_id
NODE_ENV=production
WEB_PORT=3000
TIMEZONE=Asia/Taipei
REPORT_TIME=23:00
WEBHOOK_URL=
```

### 4️⃣ 首次啟動
```bash
# Windows
start.bat

# Linux/Mac  
./start-project.sh

# 或直接執行
node start-final.js
```

### 5️⃣ 驗證部署
- ✅ 檢查 Bot 啟動訊息
- ✅ 瀏覽 http://localhost:3000
- ✅ 確認群組清單為空 (全新開始)
- ✅ 測試 Bot 回應

## 🔧 常見問題排除

### Q: 新電腦顯示舊群組？
```bash
# 刪除資料重新開始
rm -rf data/ archives/ logs/ statistics/
node start-final.js
```

### Q: 依賴安裝失敗？
```bash
# 清除快取重新安裝
npm cache clean --force
rm -rf node_modules/
rm package-lock.json
npm install
```

### Q: Web面板無法開啟？
- 檢查防火牆設定
- 確認 .env 中的 WEB_PORT 設定
- 檢查 3000 端口是否被占用

## 📂 建議的複製排除清單

建立 `.deployignore` 檔案：
```
data/
archives/
logs/
statistics/
node_modules/
*.log
*.tmp
*.temp
~$*
.DS_Store
Thumbs.db
test-*.js
manual-*.js
debug-*.js
.env
package-lock.json
```

## 🎯 部署檢查清單

- [ ] 只複製必要的程式檔案
- [ ] 不複製 data/, archives/, logs/ 資料夾
- [ ] 重新建立 .env 檔案
- [ ] 執行 npm install
- [ ] 測試 Bot 啟動
- [ ] 確認 Web 面板正常
- [ ] 驗證群組為空開始