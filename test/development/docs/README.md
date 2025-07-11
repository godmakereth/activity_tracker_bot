# Telegram Activity Tracker Bot 📊

一個功能強大的 Telegram 機器人，用於追蹤和記錄日常活動時間，支援自動報告和統計分析。

## 功能特色 ✨

### 🏃‍♂️ 活動追蹤
- **5 種預設活動類型**：
  - 🚽 上廁所 (6分鐘)
  - 🚬 抽菸 (5分鐘)
  - 📱 使用手機 (10分鐘)
  - 💩 大便10 (10分鐘)
  - 💩 大便15 (15分鐘)
- **即時開始/結束**：一鍵開始活動，回來時立即記錄
- **超時檢測**：自動計算超出建議時間的部分
- **並發支援**：多用戶同時使用，互不影響

### 📊 智能報告
- **自動每日報告**：每晚 23:00 自動生成統計報告
- **即時統計**：隨時查看今日、昨日、本週、上週、本月、上月數據
- **詳細分析**：包含活動次數、總時間、超時統計、參與人數等
- **檔案導出**：自動生成 `statistics/{chat_id}/YYYY-MM-DD.txt` 格式報告

### 🌍 多語言支援
- **中文/泰文雙語**：完整的介面和訊息本地化
- **智能識別**：自動識別用戶語言偏好
- **混合使用**：支援同一群組中不同語言用戶

### 🏗️ 企業級架構
- **DDD 設計**：領域驅動設計，清晰的業務邏輯分離
- **依賴注入**：高度解耦的組件架構
- **錯誤處理**：全面的異常捕獲和優雅處理
- **性能優化**：高效的資料存儲和查詢機制

## 快速開始 🚀

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

創建 `.env` 文件：

```env
# Telegram Bot Token (必要)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# 資料庫設定 (可選)
DATABASE_PATH=./data/activities.db

# 報告設定 (可選)
REPORT_BASE_DIR=./statistics
REPORT_TIME=23:00

# 時區設定 (可選)
TIMEZONE=Asia/Taipei
```

### 3. 啟動機器人

```bash
# 生產環境
npm start

# 開發環境
npm run dev
```

### 4. 開始使用

1. 將機器人添加到你的 Telegram 群組
2. 發送 `/start` 命令初始化
3. 選擇活動類型開始追蹤
4. 完成後發送「我回來了」或「ฉันกลับมาแล้ว」

## 使用指南 📖

### 基本命令

| 命令 | 說明 |
|------|------|
| `/start` | 初始化機器人，顯示活動選單 |
| `/status` | 查看系統狀態和運行資訊 |
| `/report` | 生成今日活動報告 |

### 活動操作

#### 開始活動
點擊以下任一按鈕開始追蹤：
- 🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)
- 🚬 抽菸 (5分鐘)/สูบบุหรี่ (5 นาที)
- 📱 使用手機 (10分鐘)/ใช้โทรศัพท์ (10 นาที)
- 💩 大便10 (10分鐘)/ไปถ่ายอุนจิ (10 นาที)
- 💩 大便15 (15分鐘)/ไปถ่ายอุนจิ (15 นาที)

#### 結束活動
發送以下任一訊息：
- 我回來了
- ฉันกลับมาแล้ว

### 統計查詢

1. 點擊「📊 統計數據/สถิติ」按鈕
2. 選擇時間範圍：
   - 📅 本日資料/ข้อมูลวันนี้
   - 📅 昨日資料/ข้อมูลเมื่อวาน
   - 📅 本週資料/ข้อมูลสัปดาห์นี้
   - 📅 上週資料/ข้อมูลสัปดาห์ที่แล้ว
   - 📅 本月資料/ข้อมูลเดือนนี้
   - 📅 上月資料/ข้อมูลเดือนที่แล้ว

### 自動報告

機器人會在每晚 23:00（台北時間）自動生成每日報告：
- 📊 發送統計摘要到群組
- 📁 生成詳細報告檔案
- 🗂️ 按聊天室分類存儲

## 技術架構 🏗️

### 系統結構

```
src/
├── app.js                          # 主應用程式入口
├── shared/                         # 共享層
│   ├── constants/                  # 常數定義
│   ├── config/                     # 配置管理
│   ├── exceptions/                 # 異常處理
│   └── DependencyContainer.js      # 依賴注入容器
├── domain/                         # 領域層
│   ├── entities/                   # 實體
│   ├── value-objects/              # 值物件
│   └── services/                   # 領域服務
├── application/                    # 應用層
│   ├── use-cases/                  # 用例
│   ├── dto/                        # 資料傳輸物件
│   └── services/                   # 應用服務
└── infrastructure/                 # 基礎設施層
    ├── database/                   # 資料庫
    ├── file-system/                # 檔案系統
    ├── scheduling/                 # 排程
    └── telegram/                   # Telegram API
```

### 核心組件

- **活動管理**：StartActivityUseCase, CompleteActivityUseCase
- **報告生成**：GenerateReportUseCase, ReportGenerator
- **資料存儲**：SimpleDatabaseConnection, ActivityRepository
- **任務排程**：ScheduledTaskManager
- **依賴注入**：DependencyContainer

## 開發指南 👨‍💻

### 環境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 開發命令

```bash
# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 運行測試
npm test
npm run test:unit
npm run test:integration
npm run test:e2e

# 生成測試覆蓋率報告
npm run test:coverage
```

### 測試架構

- **單元測試**：測試個別組件功能
- **整合測試**：測試組件間協作
- **端到端測試**：測試完整用戶場景

### 程式碼規範

- 使用 ES6+ 語法
- 遵循 DDD 設計原則
- 完整的錯誤處理
- 詳細的程式碼註釋

## 部署指南 🚀

### 本地部署

1. 克隆專案
```bash
git clone <repository-url>
cd telegram-activity-tracker-bot
```

2. 安裝依賴
```bash
npm install
```

3. 設定環境變數
```bash
cp .env.example .env
# 編輯 .env 文件，填入你的 Bot Token
```

4. 啟動服務
```bash
npm start
```

### Docker 部署

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### PM2 部署

```bash
# 安裝 PM2
npm install -g pm2

# 啟動應用
pm2 start src/app.js --name "activity-tracker-bot"

# 設定開機啟動
pm2 startup
pm2 save
```

## 配置選項 ⚙️

### 環境變數

| 變數名 | 說明 | 預設值 |
|--------|------|--------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | 必要 |
| `DATABASE_PATH` | 資料庫檔案路徑 | `./data/activities.db` |
| `REPORT_BASE_DIR` | 報告輸出目錄 | `./statistics` |
| `REPORT_TIME` | 每日報告時間 | `23:00` |
| `TIMEZONE` | 時區設定 | `Asia/Taipei` |

### 活動類型配置

可以通過修改 `src/shared/constants/ActivityTypes.js` 來自定義活動類型：

```javascript
const ActivityTypeMap = {
    [ActivityTypes.CUSTOM]: {
        name: '自定義活動',
        nameEn: 'Custom Activity',
        emoji: '⚡',
        maxDuration: 600, // 10分鐘
        buttonText: '⚡ 自定義活動 (10分鐘)/กิจกรรมกำหนดเอง (10 นาที)'
    }
};
```

## 故障排除 🔧

### 常見問題

#### 1. Bot 無法啟動
- 檢查 `TELEGRAM_BOT_TOKEN` 是否正確設定
- 確認 Bot Token 格式正確
- 檢查網路連接是否正常

#### 2. 資料庫錯誤
- 確認資料庫檔案路徑存在
- 檢查檔案系統權限
- 清理損壞的資料檔案

#### 3. 定時任務問題
- 檢查系統時間設定
- 確認時區配置正確
- 查看任務執行日誌

### 日誌查看

```bash
# 查看運行日誌
pm2 logs activity-tracker-bot

# 查看錯誤日誌
pm2 logs activity-tracker-bot --err
```

## 安全考量 🔒

### 資料保護
- 所有敏感資料使用環境變數
- 本地資料庫檔案加密存儲
- 定期清理過期日誌

### 存取控制
- Bot Token 嚴格保密
- 限制管理員命令權限
- 群組權限驗證

### 異常處理
- 全面的錯誤捕獲
- 優雅的降級機制
- 自動重試機制

## 貢獻指南 🤝

1. Fork 此專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 發起 Pull Request

### 開發規範

- 所有新功能必須包含測試
- 保持程式碼覆蓋率 > 80%
- 遵循現有的程式碼風格
- 更新相關文檔

## 授權協議 📜

本專案採用 MIT 授權協議。詳情請見 [LICENSE](LICENSE) 文件。

## 聯絡資訊 📧

- 作者：Activity Tracker Bot Team
- 電子郵件：support@activity-tracker.com
- GitHub：https://github.com/your-username/telegram-activity-tracker-bot

## 更新日誌 📝

### v1.0.0 (2024-01-01)
- 🎉 初始版本發布
- ✨ 完整的活動追蹤功能
- 📊 自動報告生成
- 🌍 雙語支援
- 🏗️ DDD 架構重構

---

## 致謝 🙏

感謝所有貢獻者和使用者的支持！

---

*讓我們一起建立更健康的日常習慣！* 💪