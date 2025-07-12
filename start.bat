@echo off
chcp 65001 >nul
title Telegram Activity Tracker Bot

:: 顏色設定
color 0A

echo.
echo ================================================
echo    🤖 Telegram Activity Tracker Bot
echo    📅 Windows 啟動器 v2.0
echo ================================================
echo.

:: 檢查 Node.js 是否安裝
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤: 未找到 Node.js
    echo 請先安裝 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 檢查主程式是否存在
if not exist "start-final.js" (
    echo ❌ 錯誤: 找不到 start-final.js
    echo 請確認您在正確的目錄中執行此腳本
    echo.
    pause
    exit /b 1
)

:: 檢查 .env 檔案
if not exist ".env" (
    echo ⚠️  警告: 找不到 .env 檔案
    if exist ".env.example" (
        echo 🔧 自動複製 .env.example 到 .env
        copy ".env.example" ".env" >nul
        echo ✅ 請編輯 .env 檔案設定您的 BOT_TOKEN
        echo.
        pause
    ) else (
        echo 請建立 .env 檔案或從 .env.example 複製
        echo.
        pause
        exit /b 1
    )
)

:: 檢查依賴是否安裝
if not exist "node_modules" (
    echo 📦 檢測到缺少依賴，正在安裝...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依賴安裝失敗
        pause
        exit /b 1
    )
    echo ✅ 依賴安裝完成
    echo.
)

echo 🚀 正在啟動 Telegram Bot...
echo 💡 提示: 按 Ctrl+C 可停止程式
echo 🌐 Web面板: http://localhost:3000
echo ================================================
echo.

:: 啟動主程式
node start-final.js

:: 程式結束處理
echo.
echo ================================================
if %errorlevel% equ 0 (
    echo ✅ Bot 正常關閉
) else (
    echo ❌ Bot 異常結束 (錯誤代碼: %errorlevel%^)
    echo 請檢查上方錯誤訊息
)
echo.
echo 按任意鍵退出...
pause >nul