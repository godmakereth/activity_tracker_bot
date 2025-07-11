// 調試鍵盤問題
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot('8134343577:AAF_U30xi1Gw1aDk05MdIgzbX8i_eit_XKo', {
    polling: false,
    request: { family: 4 }
});

const chatId = '-1002512140773';

// 測試不同的鍵盤格式
async function testKeyboardFormats() {
    try {
        // 測試 1: ReplyKeyboardMarkup
        console.log('測試 1: ReplyKeyboardMarkup');
        await bot.sendMessage(chatId, '測試 ReplyKeyboardMarkup', {
            reply_markup: {
                keyboard: [
                    [{ text: '🚽 廁所' }, { text: '🚬 抽菸' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 測試 2: InlineKeyboardMarkup
        console.log('測試 2: InlineKeyboardMarkup');
        await bot.sendMessage(chatId, '測試 InlineKeyboardMarkup', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🚽 廁所', callback_data: 'toilet' },
                        { text: '🚬 抽菸', callback_data: 'smoke' }
                    ]
                ]
            }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 測試 3: 強制回覆
        console.log('測試 3: 強制回覆');
        await bot.sendMessage(chatId, '測試強制回覆', {
            reply_markup: {
                force_reply: true
            }
        });

        console.log('✅ 所有測試完成');

    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

testKeyboardFormats();