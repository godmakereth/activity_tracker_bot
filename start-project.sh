#!/bin/bash

echo "========================================="
echo "  Activity Tracker Bot - 啟動腳本"
echo "========================================="
echo

# 切換到腳本所在目錄
cd "$(dirname "$0")"
echo "📁 已切換到專案目錄: $(pwd)"
echo

# 檢查 Node.js 是否安裝
echo "🔍 檢查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未找到 Node.js，請先安裝 Node.js"
    echo "💡 macOS: brew install node"
    echo "💡 Ubuntu: sudo apt install nodejs npm"
    echo "💡 CentOS: sudo yum install nodejs npm"
    exit 1
fi
echo "✅ Node.js 已安裝: $(node --version)"
echo

# 檢查 npm 是否可用
echo "🔍 檢查 npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: npm 不可用"
    exit 1
fi
echo "✅ npm 版本: $(npm --version)"
echo

# 檢查 package.json 是否存在
if [ ! -f package.json ]; then
    echo "❌ 錯誤: 找不到 package.json 檔案"
    echo "💡 請確認您在正確的專案目錄中"
    exit 1
fi
echo "✅ package.json 檔案存在"
echo

# 檢查 .env 檔案是否存在
if [ ! -f .env ]; then
    echo "⚠️ 警告: 找不到 .env 檔案"
    if [ -f .env.example ]; then
        echo "📋 發現 .env.example 檔案"
        echo "💡 請執行以下命令設置環境變數："
        echo "   cp .env.example .env"
        echo "   nano .env  # 或使用其他編輯器"
        echo "   # 然後編輯 TELEGRAM_BOT_TOKEN"
        exit 1
    else
        echo "❌ 也找不到 .env.example 檔案"
        exit 1
    fi
fi
echo "✅ .env 檔案存在"
echo

# 檢查 node_modules 是否存在，如果不存在則安裝依賴
if [ ! -d node_modules ]; then
    echo "📦 正在安裝依賴套件..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依賴安裝失敗"
        exit 1
    fi
    echo "✅ 依賴安裝完成"
    echo
else
    echo "✅ 依賴套件已存在"
    echo
fi

# 檢查啟動檔案是否存在
if [ ! -f start-final.js ]; then
    echo "❌ 錯誤: 找不到 start-final.js 檔案"
    exit 1
fi
echo "✅ 啟動檔案存在"
echo

# 顯示啟動資訊
echo "========================================"
echo "🚀 正在啟動 Activity Tracker Bot..."
echo "========================================"
echo "📱 Telegram Bot 功能：活動追蹤"
echo "🌐 網頁面板：http://localhost:3000"
echo "📊 Excel 報告：自動生成和下載"
echo "⏰ 定時任務：每日 23:00 自動存檔"
echo "========================================"
echo
echo "💡 啟動後請："
echo "   1. 將 Bot 加入 Telegram 群組"
echo "   2. 發送 /start 開始使用"
echo "   3. 瀏覽器訪問 http://localhost:3000"
echo
echo "⚠️ 按 Ctrl+C 可停止服務"
echo "========================================"
echo

# 啟動專案
echo "🎯 執行啟動指令: npm start"
echo
npm start

# 如果程式意外結束，顯示錯誤訊息
if [ $? -ne 0 ]; then
    echo
    echo "❌ 程式異常結束，錯誤代碼: $?"
    echo
fi

echo
echo "📋 程式已結束"
read -p "按 Enter 鍵退出..."