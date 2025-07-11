// 清除Bot衝突
const TelegramBot = require('node-telegram-bot-api');

const token = '8134343577:AAF_U30xi1Gw1aDk05MdIgzbX8i_eit_XKo';

async function clearWebhook() {
    try {
        const bot = new TelegramBot(token, { polling: false });
        console.log('🧹 正在清除webhook...');
        
        await bot.deleteWebHook();
        console.log('✅ Webhook已清除');
        
        await bot.stopPolling();
        console.log('✅ Polling已停止');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ 清除失敗:', error.message);
        process.exit(1);
    }
}

clearWebhook();