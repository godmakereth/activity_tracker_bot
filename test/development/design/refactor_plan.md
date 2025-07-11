# Node.js 重構設計方案

## 1. 重構目標

### 1.1 主要目標
- **完整功能實現：** 將Python版本的完整功能遷移到Node.js
- **架構現代化：** 保持並完善現有的DDD架構
- **自動化報告：** 實現每日23:00自動生成統計報告
- **文件系統：** 實現結構化的統計檔案輸出
- **雙語支援：** 保持中文/泰語雙語介面

### 1.2 技術要求
- **時區處理：** 台北時間 (Asia/Taipei)
- **檔案結構：** `statistics/{chat_id}/YYYY-MM-DD.txt`
- **資料庫：** SQLite3 with better-sqlite3
- **定時任務：** node-cron
- **錯誤處理：** 完整的異常處理機制

## 2. 架構設計

### 2.1 保持現有分層架構
```
src/
├── domain/                    # 領域層
│   ├── entities/             # 實體
│   ├── value-objects/        # 值對象
│   ├── repositories/         # 倉庫接口
│   └── services/            # 領域服務
├── application/              # 應用層
│   ├── use-cases/           # 用例
│   ├── commands/            # 命令
│   ├── queries/             # 查詢
│   └── handlers/            # 處理器
├── infrastructure/           # 基礎設施層
│   ├── database/            # 資料庫實現
│   ├── telegram/            # Telegram API
│   ├── file-system/         # 檔案系統
│   ├── caching/             # 快取
│   └── scheduling/          # 定時任務
├── presentation/            # 表現層
│   ├── controllers/         # 控制器
│   ├── middleware/          # 中介軟體
│   └── responses/           # 回應格式
└── shared/                  # 共享層
    ├── config/              # 配置
    ├── constants/           # 常數
    ├── exceptions/          # 異常
    └── utils/               # 工具
```

### 2.2 新增模組規劃

#### 2.2.1 基礎設施層擴展
- **`infrastructure/database/repositories/`** - 實現所有倉庫
- **`infrastructure/scheduling/`** - 定時任務系統
- **`infrastructure/file-system/`** - 報告檔案管理
- **`infrastructure/telegram/`** - Telegram Bot 整合

#### 2.2.2 應用層擴展
- **`application/use-cases/GenerateReportUseCase.js`** - 報告生成
- **`application/queries/GetStatisticsQuery.js`** - 統計查詢
- **`application/handlers/ScheduledTaskHandler.js`** - 定時任務處理

## 3. 核心功能實現

### 3.1 活動追蹤功能
```javascript
// 活動類型與時間限制
const ACTIVITY_TYPES = {
    TOILET: { name: '上廁所', limit: 360, emoji: '🚽' },
    SMOKING: { name: '抽菸', limit: 300, emoji: '🚬' },
    PHONE: { name: '使用手機', limit: 600, emoji: '📱' },
    POOP_10: { name: '大便10', limit: 600, emoji: '💩' },
    POOP_15: { name: '大便15', limit: 900, emoji: '💩' }
};
```

### 3.2 資料庫架構
```sql
-- 活動記錄表
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration INTEGER,
    overtime INTEGER DEFAULT 0,
    user_full_name TEXT NOT NULL,
    chat_title TEXT,
    status TEXT DEFAULT 'ongoing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 正在進行的活動表
CREATE TABLE ongoing_activities (
    user_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    user_full_name TEXT NOT NULL,
    chat_title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, chat_id)
);

-- 聊天室設定表
CREATE TABLE chat_settings (
    chat_id TEXT PRIMARY KEY,
    chat_title TEXT NOT NULL,
    timezone TEXT DEFAULT 'Asia/Taipei',
    report_enabled BOOLEAN DEFAULT 1,
    report_time TEXT DEFAULT '23:00',
    language TEXT DEFAULT 'zh-TW',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 定時報告系統
```javascript
// 定時任務配置
const SCHEDULE_CONFIG = {
    DAILY_REPORT: '0 23 * * *',  // 每日23:00
    TIMEZONE: 'Asia/Taipei'
};

// 報告檔案結構
const REPORT_STRUCTURE = {
    BASE_DIR: './statistics',
    PATTERN: '{chat_id}/{YYYY-MM-DD}.txt'
};
```

## 4. 實現計劃

### 4.1 階段一：基礎設施完成
- **資料庫倉庫實現**
- **Telegram Bot 整合**
- **配置管理完善**
- **異常處理機制**

### 4.2 階段二：核心功能實現
- **活動追蹤用例**
- **統計查詢功能**
- **用戶介面控制器**
- **中介軟體整合**

### 4.3 階段三：報告系統實現
- **報告生成用例**
- **檔案系統管理**
- **定時任務調度**
- **報告模板系統**

### 4.4 階段四：測試與優化
- **單元測試**
- **整合測試**
- **性能優化**
- **安全性檢查**

## 5. 檔案結構規劃

### 5.1 統計檔案結構
```
statistics/
├── {chat_id}/
│   ├── 2025-07-10.txt
│   ├── 2025-07-11.txt
│   └── ...
├── {another_chat_id}/
│   ├── 2025-07-10.txt
│   └── ...
```

### 5.2 報告檔案格式
```
📊 {ChatTitle} - {Date} 活動統計報告
======================================

📋 總覽
- 總活動次數: {totalCount}
- 總活動時間: {totalDuration}
- 總超時時間: {totalOvertime}
- 總超時次數: {totalOvertimeCount}

👥 用戶統計
{用戶統計詳情}

📈 活動分析
{活動類型統計}

⚠️ 超時警告
{超時情況分析}
```

## 6. 技術規格

### 6.1 依賴包管理
```json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.64.0",
    "better-sqlite3": "^9.0.0",
    "node-cron": "^3.0.3",
    "dotenv": "^16.0.0",
    "moment-timezone": "^0.5.0"
  }
}
```

### 6.2 環境變數配置
```env
# Telegram Bot 配置
TELEGRAM_BOT_TOKEN=your_bot_token_here

# 資料庫配置
DATABASE_PATH=./data/activities.db

# 報告配置
REPORT_BASE_DIR=./statistics
REPORT_SCHEDULE=0 23 * * *
TIMEZONE=Asia/Taipei

# 功能開關
ENABLE_DAILY_REPORTS=true
ENABLE_BILINGUAL=true
```

## 7. 安全性考量

### 7.1 資料保護
- **敏感資訊加密**
- **存取權限控制**
- **資料備份機制**
- **日誌記錄管理**

### 7.2 系統安全
- **輸入驗證**
- **SQL注入防護**
- **環境變數保護**
- **錯誤資訊過濾**

## 8. 效能優化

### 8.1 資料庫優化
- **適當的索引設計**
- **查詢效能優化**
- **連接池管理**
- **資料定期清理**

### 8.2 系統效能
- **記憶體使用優化**
- **非同步處理**
- **快取機制**
- **資源管理**

## 9. 監控與維護

### 9.1 日誌系統
- **結構化日誌**
- **分級日誌記錄**
- **日誌輪替**
- **錯誤追蹤**

### 9.2 健康檢查
- **系統狀態監控**
- **資料庫連接檢查**
- **定時任務狀態**
- **Bot 連線狀態**

## 10. 部署規劃

### 10.1 環境配置
- **開發環境**
- **測試環境**
- **生產環境**
- **容器化部署**

### 10.2 CI/CD 流程
- **自動化測試**
- **程式碼品質檢查**
- **自動部署**
- **版本管理**

---

## 總結

這個重構方案將Python版本的完整功能與現有的Node.js DDD架構完美結合，實現了：

1. **功能完整性：** 保持所有原有功能
2. **架構現代化：** 維持企業級架構標準
3. **自動化程度：** 實現完全自動化的報告系統
4. **擴展性：** 為未來功能擴展預留空間
5. **維護性：** 清晰的分層架構便於維護

重構後的系統將具備更好的可維護性、擴展性和穩定性，同時保持原有的用戶體驗。