// 極簡鍵盤測試
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot('8134343577:AAF_U30xi1Gw1aDk05MdIgzbX8i_eit_XKo', {
    polling: false,
    request: { family: 4 }
});

const chatId = '-1002512140773';

// 最基本的鍵盤測試
const basicKeyboard = {
    keyboard: [
        [{ text: 'Button 1' }, { text: 'Button 2' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

async function testBasicKeyboard() {
    try {
        console.log('發送基本鍵盤測試...');
        const result = await bot.sendMessage(chatId, '基本鍵盤測試', {
            reply_markup: basicKeyboard
        });
        console.log('✅ 成功發送:', result.message_id);
    } catch (error) {
        console.error('❌ 發送失敗:', error.message);
    }
}

testBasicKeyboard();