# 修復 Telegram Bot 409 衝突問題

## 問題說明

您遇到的錯誤是 **409 Conflict: terminated by other getUpdates request**，這表示有另一個 Bot 實例正在使用相同的 Token 進行輪詢。

## 解決方案

### 1. 使用安全啟動腳本（推薦）

```bash
npm start
```

這會執行 `safe-start.js`，它會：
1. 自動重置 Bot 狀態
2. 清理任何衝突的實例
3. 安全啟動新實例

### 2. 手動重置 Bot

如果需要手動重置：

```bash
npm run reset
```

然後再啟動：

```bash
npm run start-unsafe
```

### 3. 檢查並終止其他實例

在 Windows 中查找並終止其他 Node.js 進程：

```cmd
# 查看所有 Node.js 進程
tasklist | findstr node

# 終止特定進程（替換 PID）
taskkill /PID <進程ID> /F
```

## 修改內容

已對以下檔案進行修改以解決問題：

### `src/app.js`
1. **Bot 配置優化**：
   - 設置 `autoStart: false` 避免自動啟動
   - 增加輪詢間隔到 2000ms
   - 添加更好的錯誤處理

2. **新增方法**：
   - `handleBotConflict()` - 處理 409 衝突
   - `startBotPolling()` - 安全啟動輪詢
   - `restartBotPolling()` - 重新啟動輪詢

3. **改進錯誤處理**：
   - 自動檢測 409 錯誤
   - 智能重試機制
   - 更好的關閉流程

### 新增檔案

1. **`reset-bot.js`** - Bot 重置工具
   - 清理 Webhook
   - 清理待處理更新
   - 確保乾淨狀態

2. **`safe-start.js`** - 安全啟動腳本
   - 先重置後啟動
   - 自動處理錯誤
   - 優雅退出處理

3. **`package.json`** 新增腳本：
   - `npm start` - 安全啟動（推薦）
   - `npm run reset` - 重置 Bot
   - `npm run start-unsafe` - 直接啟動

## 使用建議

1. **總是使用安全啟動**：
   ```bash
   npm start
   ```

2. **如果仍有問題，手動重置**：
   ```bash
   npm run reset
   npm run start-unsafe
   ```

3. **確保只有一個實例運行**：
   - 關閉所有終端視窗
   - 檢查任務管理器
   - 使用安全啟動腳本

## 監控和日志

啟動後，您會看到以下日志：
- ✅ Bot 輪詢已啟動 - 表示成功
- 🚨 檢測到 409 衝突 - 自動處理中
- 🔄 重新啟動 Bot 輪詢 - 正在恢復

## 預防措施

1. 總是通過 `Ctrl+C` 正常退出
2. 避免強制終止進程
3. 使用提供的啟動腳本
4. 不要同時運行多個實例