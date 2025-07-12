# 部署到新電腦指南

## 🚫 不該複製的檔案/資料夾

複製程式到新電腦時，以下檔案和資料夾 **不應該複製**：

### 📊 資料檔案 (包含舊電腦的群組資料)
```
data/
├── activities.json     ❌ 不要複製 (包含舊電腦群組資料)
├── activities.db       ❌ 不要複製 (如果存在)
└── *.db               ❌ 不要複製
```

### 📁 存檔資料夾
```
archives/              ❌ 不要複製 (包含舊檔案)
├── excel/
└── reports/
```

### 📝 日誌檔案
```
logs/                  ❌ 不要複製
├── *.log
└── error.log
```

### 📈 統計檔案
```
statistics/            ❌ 不要複製
└── *.json
```

### 🔧 環境檔案 (可能包含不同的設定)
```
.env                   ⚠️  檢查後再複製 (確認設定是否適用)
```

## ✅ 應該複製的檔案

```
├── src/               ✅ 程式碼
├── config/            ✅ 設定檔
├── package.json       ✅ 依賴清單
├── package-lock.json  ✅ 依賴鎖定
├── start.bat          ✅ 啟動腳本
├── start-final.js     ✅ 主程式
├── *.md              ✅ 文件
└── deployment/        ✅ 部署檔案
```

## 🛠️ 新電腦部署步驟

1. **複製程式碼** (排除上述檔案)
2. **安裝依賴**
   ```bash
   npm install
   ```
3. **設定環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 設定 TELEGRAM_BOT_TOKEN
   ```
4. **首次啟動**
   ```bash
   node start-final.js
   ```

## 🔄 如果已經複製錯誤檔案

### 清理舊資料
```bash
# 刪除資料檔案
rm -rf data/
rm -rf archives/
rm -rf logs/
rm -rf statistics/

# 或在 Windows 中
del /s data\
del /s archives\
del /s logs\
del /s statistics\
```

### 重新初始化
```bash
# 重新啟動程式，會自動建立新的空資料檔案
node start-final.js
```

## 📱 Telegram Bot 設定

- 每台電腦使用相同的 BOT_TOKEN 是正常的
- Bot 會自動偵測新的群組並建立資料
- 不需要重新邀請 Bot 到群組

## 🌐 Web 面板

新電腦啟動後：
- 瀏覽 http://localhost:3000
- 只會顯示新電腦上的群組
- 沒有舊電腦的群組資料