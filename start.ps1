# PowerShell 啟動腳本
Write-Host "Starting Telegram Activity Tracker Bot..." -ForegroundColor Green

# 設定環境變數
$env:TELEGRAM_BOT_TOKEN = "8134343577:AAG2s19KY8TTZy8XcdnEy3Fa5Cvbfzhn0fc"
$env:NODE_ENV = "production"
$env:DATABASE_PATH = "./data/activities.db"
$env:REPORT_BASE_DIR = "./statistics"
$env:TIMEZONE = "Asia/Taipei"

# 確保目錄存在
$directories = @("data", "statistics", "logs")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
        Write-Host "Created directory: $dir" -ForegroundColor Yellow
    }
}

# 顯示配置資訊
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Token: $($env:TELEGRAM_BOT_TOKEN.Substring(0,10))..." -ForegroundColor Cyan
Write-Host "  Environment: $env:NODE_ENV" -ForegroundColor Cyan
Write-Host "  Database: $env:DATABASE_PATH" -ForegroundColor Cyan

# 啟動應用程式
Write-Host "Starting bot..." -ForegroundColor Green
node src/app.js