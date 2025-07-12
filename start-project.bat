@echo off
echo =========================================
echo   Activity Tracker Bot - 啟動腳本
echo =========================================
echo.

REM 切換到專案目錄（自動使用當前腳本所在目錄）
cd /d "%~dp0"
echo 📁 已切換到專案目錄: %CD%
echo.

REM 檢查 Node.js 是否安裝
echo 🔍 檢查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤: 未找到 Node.js，請先安裝 Node.js
    echo 💡 下載地址: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 已安裝: 
node --version
echo.

REM 檢查 npm 是否可用
echo 🔍 檢查 npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤: npm 不可用
    pause
    exit /b 1
)
echo ✅ npm 版本: 
npm --version
echo.

REM 檢查 package.json 是否存在
if not exist package.json (
    echo ❌ 錯誤: 找不到 package.json 檔案
    echo 💡 請確認您在正確的專案目錄中
    pause
    exit /b 1
)
echo ✅ package.json 檔案存在
echo.

REM 檢查 node_modules 是否存在，如果不存在則安裝依賴
if not exist node_modules (
    echo 📦 正在安裝依賴套件...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依賴安裝失敗
        pause
        exit /b 1
    )
    echo ✅ 依賴安裝完成
    echo.
) else (
    echo ✅ 依賴套件已存在
    echo.
)

REM 檢查啟動檔案是否存在
if not exist start-final.js (
    echo ❌ 錯誤: 找不到 start-final.js 檔案
    pause
    exit /b 1
)
echo ✅ 啟動檔案存在
echo.

REM 顯示啟動資訊
echo ========================================
echo 🚀 正在啟動 Activity Tracker Bot...
echo ========================================
echo 📱 Telegram Bot 功能：活動追蹤
echo 🌐 網頁面板：http://localhost:3000
echo 📊 Excel 報告：自動生成和下載
echo ⏰ 定時任務：每日 23:00 自動存檔
echo ========================================
echo.
echo 💡 啟動後請：
echo    1. 將 Bot 加入 Telegram 群組
echo    2. 發送 /start 開始使用
echo    3. 瀏覽器訪問 http://localhost:3000
echo.
echo ⚠️ 按 Ctrl+C 可停止服務
echo ========================================
echo.

REM 啟動專案
echo 🎯 執行啟動指令: npm start
echo.
npm start

REM 如果程式意外結束，暫停以顯示錯誤訊息
if %errorlevel% neq 0 (
    echo.
    echo ❌ 程式異常結束，錯誤代碼: %errorlevel%
    echo.
)

echo.
echo 📋 程式已結束
pause