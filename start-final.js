/**
 * 最終版 Windows 啟動器
 * 正確處理環境變數和應用程式啟動
 */

console.log('🚀 Telegram Activity Tracker Bot - Windows 啟動器');
console.log('================================================');

// 1. 設置環境變數
console.log('\n📝 設置環境變數...');
process.env.TELEGRAM_BOT_TOKEN = '8134343577:AAF_U30xi1Gw1aDk05MdIgzbX8i_eit_XKo';
process.env.DATABASE_PATH = './data/activities.db';
process.env.REPORT_BASE_DIR = './statistics';
process.env.REPORT_TIME = '23:00';
process.env.TIMEZONE = 'Asia/Taipei';
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'info';

console.log('✅ 環境變數設置完成');
console.log('🔍 Bot Token:', process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...');

// 2. 確保目錄存在
console.log('\n📁 檢查必要目錄...');
const fs = require('fs');
const directories = ['data', 'statistics', 'logs', 'archives', 'archives/excel'];
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ 創建目錄: ${dir}`);
    } else {
        console.log(`✅ 目錄已存在: ${dir}`);
    }
});

// 3. 載入 dotenv (可選，因為我們已經直接設置了)
try {
    require('dotenv').config();
    console.log('✅ dotenv 載入完成');
} catch (error) {
    console.log('ℹ️ dotenv 載入失敗，使用直接設置的環境變數');
}

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