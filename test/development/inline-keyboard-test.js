// 測試inline鍵盤
process.env.TELEGRAM_BOT_TOKEN = '8134343577:AAF_U30xi1Gw1aDk05MdIgzbX8i_eit_XKo';

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: false,
    request: { family: 4 }
});

const chatId = '-1002512140773';

async function testInlineKeyboard() {
    try {
        console.log('🔥 測試inline鍵盤...');
        
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    { text: '🚽 上廁所', callback_data: 'toilet' },
                    { text: '🚬 抽菸', callback_data: 'smoking' }
                ],
                [
                    { text: '💩 大便10分', callback_data: 'poop_10' },
                    { text: '💩 大便15分', callback_data: 'poop_15' }
                ],
                [
                    { text: '📱 手機', callback_data: 'phone' },
                    { text: '✅ 完成', callback_data: 'complete' }
                ],
                [
                    { text: '📊 統計', callback_data: 'stats' }
                ]
            ]
        };
        
        await bot.sendMessage(chatId, '📱 Inline鍵盤測試\n請點擊下方按鈕', {
            reply_markup: inlineKeyboard
        });
        
        console.log('✅ Inline鍵盤發送成功');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

testInlineKeyboard();