/**
 * 最終版 Windows 啟動器
 * 正確處理環境變數和應用程式啟動
 */

console.log('🚀 Telegram Activity Tracker Bot - Windows 啟動器');
console.log('================================================');

// 1. 載入環境變數
console.log('\n📝 載入環境變數...');
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '.env');

// 檢查 .env 檔案是否存在
if (!fs.existsSync(envPath)) {
    console.error('❌ .env 檔案不存在:', envPath);
    process.exit(1);
}

// 強制清除現有的 TELEGRAM_BOT_TOKEN
delete process.env.TELEGRAM_BOT_TOKEN;

// 載入 .env 檔案
const result = require('dotenv').config({ path: envPath });
if (result.error) {
    console.error('❌ 載入 .env 失敗:', result.error);
    process.exit(1);
}

console.log('📂 實際載入的 .env 路徑:', envPath);
console.log('🔧 載入的變數數量:', Object.keys(result.parsed || {}).length);

// 顯示載入的 Token 前綴（調試用）
console.log('🔍 載入的 Token 前綴:', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'undefined');

// 直接從檔案讀取驗證
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenLine = envContent.split('\n').find(line => line.startsWith('TELEGRAM_BOT_TOKEN='));
if (tokenLine) {
    const fileToken = tokenLine.split('=')[1];
    console.log('📝 檔案中的 Token 前綴:', fileToken ? fileToken.substring(0, 10) + '...' : 'undefined');
}

// 檢查必要的環境變數
if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'your_bot_token_here') {
    console.error('❌ TELEGRAM_BOT_TOKEN 未設置或仍為預設值');
    console.log('💡 請在 .env 檔案中設置 TELEGRAM_BOT_TOKEN');
    console.log('💡 當前 .env 路徑:', envPath);
    process.exit(1);
}

// 設置其他環境變數（如果 .env 中沒有的話）
process.env.DATABASE_PATH = process.env.DATABASE_PATH || './data/activities.db';
process.env.REPORT_BASE_DIR = process.env.REPORT_BASE_DIR || './statistics';
process.env.REPORT_TIME = process.env.REPORT_TIME || '23:00';
process.env.TIMEZONE = process.env.TIMEZONE || 'Asia/Taipei';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';

console.log('✅ 環境變數設置完成');
console.log('🔍 Bot Token:', process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...');

// 2. 確保目錄存在
console.log('\n📁 檢查必要目錄...');
const directories = ['data', 'statistics', 'logs', 'archives', 'archives/excel'];
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ 創建目錄: ${dir}`);
    } else {
        console.log(`✅ 目錄已存在: ${dir}`);
    }
});

// 3. 環境變數已載入，跳過重複載入

// 4. 載入並啟動應用程式
console.log('\n🤖 正在啟動 Telegram Bot...');
console.log('================================================');

try {
    // 載入 App 類別
    const App = require('./src/app.js');
    
    // 如果 App 已經自動啟動了，我們就等待
    if (global.app) {
        console.log('✅ Bot 已自動啟動');
    } else {
        // 手動啟動
        const app = new App();
        global.app = app;
        
        app.start().then(() => {
            console.log('✅ Bot 啟動成功！');
        }).catch(error => {
            console.error('❌ Bot 啟動失敗:', error.message);
            process.exit(1);
        });
    }
    
} catch (error) {
    console.error('❌ 載入應用程式失敗:', error.message);
    console.error('錯誤詳情:', error.stack);
    process.exit(1);
}

// 5. 設置退出處理
process.on('SIGINT', () => {
    console.log('\n\n🛑 收到退出信號，正在關閉 Bot...');
    if (global.app) {
        global.app.stop().then(() => {
            console.log('✅ Bot 已安全關閉');
            process.exit(0);
        }).catch(() => {
            process.exit(1);
        });
    } else {
        process.exit(0);
    }
});

// 6. 顯示使用說明
setTimeout(() => {
    console.log('\n📖 使用說明:');
    console.log('- 將 Bot 添加到您的 Telegram 群組');
    console.log('- 發送 /start 命令開始使用');
    console.log('- 按 Ctrl+C 退出程式');
    console.log('- 網頁數據面板: http://localhost:3000');
    console.log('\n✨ Bot 正在運行中，等待 Telegram 訊息...');
}, 2000);