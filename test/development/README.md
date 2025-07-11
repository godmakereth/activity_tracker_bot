# 📁 開發期間的臨時代碼和檔案

這個資料夾包含了在專案開發過程中創建的各種測試檔案、實驗代碼和舊版本檔案。

## 📋 檔案分類

### 🤖 Bot 測試檔案
- `bot.js` - 原始機器人檔案
- `bot-bilingual.js` - 雙語版本測試
- `bot-json.js` - JSON 版本測試
- `bot-simple.js` - 簡化版本測試
- `full-featured-bot.js` - 完整功能版本
- `webhook-bot.js` - Webhook 版本測試
- `test-bot.js` - 基本測試機器人
- `test-simple-bot.js` - 簡單測試機器人

### 🎹 鍵盤測試檔案
- `inline-keyboard-test.js` - Inline 鍵盤測試
- `simple-keyboard-test.js` - 簡單鍵盤測試
- `test-keyboard.js` - 鍵盤功能測試

### 🔧 調試和工具檔案
- `debug-keyboard.js` - 鍵盤調試工具
- `debug-send-message.js` - 訊息發送調試
- `debug-stats.js` - 統計數據調試
- `clear-bot.js` - 清理工具
- `quick-start.js` - 快速啟動腳本
- `start-final.js` - 最終啟動腳本

### 📊 演示和測試數據
- `demo.js` - 演示腳本
- `activities.db` - 舊版 SQLite 資料庫
- `activities.json` - 舊版 JSON 資料
- `demo_activities.db` - 演示資料庫
- `ongoing.json` - 進行中活動資料
- `demo_reports/` - 演示報告目錄

### 📚 舊版文檔
- `INSTRUCTIONS.md` - 舊版使用說明
- `REFACTOR.md` - 重構計劃文檔
- `START_GUIDE.md` - 舊版開始指南
- `docs/` - 舊版文檔目錄
- `design/` - 設計文檔目錄

### 🧪 測試目錄
- `tests/` - 舊版測試目錄

### 🐍 其他語言版本
- `activity_tracker_bot.py` - Python 版本（實驗性）

## ⚠️ 注意事項

這些檔案主要用於：
1. **開發參考** - 了解專案演進過程
2. **功能測試** - 測試特定功能或配置
3. **版本對比** - 比較不同實現方案
4. **調試工具** - 協助問題排查

## 🚫 不建議使用

這些檔案不建議在生產環境中使用，因為：
- 可能包含過期的代碼邏輯
- 缺乏錯誤處理機制
- 不符合當前的架構設計
- 可能存在安全漏洞

## 📝 建議

如果需要參考這些檔案：
1. 僅作為學習和理解之用
2. 不要直接複製到生產代碼中
3. 採用其中的概念時需要適配當前架構
4. 優先使用 `src/` 目錄下的正式代碼

---

**📅 整理日期**: 2025-07-11  
**📝 整理原因**: 專案代碼清理和結構優化