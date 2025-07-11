# 測試說明文件

## 測試架構

本專案採用分層測試架構，包含以下類型的測試：

### 1. 單元測試 (Unit Tests)
- **位置**: `test/unit/`
- **目的**: 測試個別組件的功能
- **範圍**: 
  - Domain 層邏輯測試
  - Application 層用例測試
  - Infrastructure 層組件測試

### 2. 整合測試 (Integration Tests)
- **位置**: `test/integration/`
- **目的**: 測試多個組件之間的協作
- **範圍**: 
  - 完整的活動工作流程
  - 資料庫操作與業務邏輯整合
  - 跨層級組件互動

### 3. 端到端測試 (End-to-End Tests)
- **位置**: `test/e2e/`
- **目的**: 測試完整的用戶場景
- **範圍**: 
  - Telegram Bot 真實互動
  - 完整系統功能驗證
  - 多語言支援測試

## 測試檔案結構

```
test/
├── unit/                           # 單元測試
│   ├── domain/
│   │   └── ActivityTest.js        # 活動領域邏輯測試
│   ├── application/
│   │   ├── StartActivityUseCaseTest.js
│   │   └── CompleteActivityUseCaseTest.js
│   └── infrastructure/
│       ├── SimpleDatabaseConnectionTest.js
│       └── ScheduledTaskManagerTest.js
├── integration/
│   └── ActivityWorkflowTest.js     # 活動工作流程整合測試
├── e2e/
│   └── TelegramBotTest.js         # Telegram Bot 端到端測試
├── fixtures/                      # 測試資料
├── setup.js                       # 測試設定檔
├── mocha.opts                     # Mocha 設定
└── README.md                      # 本說明文件
```

## 運行測試

### 前置條件

1. 安裝依賴：
```bash
npm install
```

2. 安裝測試框架：
```bash
npm install --save-dev mocha chai sinon
```

### 運行所有測試

```bash
npm test
```

### 運行特定類型測試

```bash
# 只運行單元測試
npm run test:unit

# 只運行整合測試
npm run test:integration

# 只運行端到端測試
npm run test:e2e
```

### 運行特定測試檔案

```bash
# 運行特定測試檔案
npx mocha test/unit/domain/ActivityTest.js

# 運行特定測試套件
npx mocha test/unit/application/
```

## 測試設定

### 環境變數

測試會使用以下環境變數：

- `NODE_ENV=test` - 設定為測試環境
- `DATABASE_PATH` - 測試資料庫路徑
- `TELEGRAM_BOT_TOKEN` - E2E 測試用的 Bot Token (可選)
- `TEST_CHAT_ID` - E2E 測試用的聊天室 ID (可選)

### 測試資料庫

- 測試使用獨立的測試資料庫
- 每個測試開始前會清理資料庫
- 測試結束後會自動清理測試資料

## 測試覆蓋率

### 產生覆蓋率報告

```bash
npm run test:coverage
```

### 查看覆蓋率報告

```bash
npm run test:coverage:report
```

## 測試最佳實踐

### 1. 測試命名規範

- 測試檔案名稱應以 `Test.js` 結尾
- 測試描述應清楚說明測試的功能
- 使用 `describe` 和 `it` 建立清晰的測試結構

### 2. 測試隔離

- 每個測試應該獨立運行
- 使用 `beforeEach` 和 `afterEach` 進行測試設定和清理
- 避免測試之間的相互依賴

### 3. 模擬（Mocking）

- 使用模擬物件隔離測試範圍
- 模擬外部依賴（資料庫、API 調用等）
- 驗證模擬物件的調用情況

### 4. 斷言（Assertions）

- 使用明確的斷言語句
- 測試預期的行為和結果
- 包含正面和負面測試案例

### 5. 錯誤處理測試

- 測試異常情況的處理
- 驗證錯誤訊息的正確性
- 確保系統在錯誤情況下的穩定性

## 常見問題

### 1. 測試超時

如果測試運行時間過長，可以調整 `mocha.opts` 中的 `--timeout` 設定。

### 2. 資料庫連接問題

確保測試資料庫路徑正確，且有足夠的檔案系統權限。

### 3. E2E 測試問題

E2E 測試需要真實的 Telegram Bot Token，如果沒有設定會自動跳過。

### 4. 非同步測試問題

確保正確處理 Promise 和 async/await，避免測試提前結束。

## 持續整合（CI）

測試可以整合到 CI/CD 流程中：

```yaml
# .github/workflows/test.yml 範例
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
```

## 貢獻指南

1. 新增功能時必須包含對應的測試
2. 修改現有功能時必須更新相關測試
3. 確保所有測試通過後再提交程式碼
4. 保持測試覆蓋率在 80% 以上
5. 遵循測試命名和結構規範