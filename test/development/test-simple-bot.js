// 超簡單測試Bot - 只測試鍵盤
const TelegramBot = require('node-telegram-bot-api');

const token = '8134343577:AAF_U30xi1Gw1aDk05MdIgzbX8i_eit_XKo';
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 測試Bot啟動中...');

// 監聽所有訊息
bot.on('message', (msg) => {
    console.log('📨 收到訊息:', msg.text, '來自:', msg.from.first_name);
});

// 處理 /start 命令
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log('🎯 處理 /start 命令，聊天室ID:', chatId);
    
    const keyboard = {
        keyboard: [
            [{ text: '測試按鈕1' }, { text: '測試按鈕2' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };
    
    bot.sendMessage(chatId, '測試訊息 - 應該有按鈕', {
        reply_markup: keyboard
    }).then(() => {
        console.log('✅ 訊息發送成功');
    }).catch((error) => {
        console.error('❌ 發送失敗:', error);
    });
});

// 處理按鈕點擊
bot.on('message', (msg) => {
    if (msg.text === '測試按鈕1') {
        bot.sendMessage(msg.chat.id, '✅ 按鈕1被點擊了！');
    } else if (msg.text === '測試按鈕2') {
        bot.sendMessage(msg.chat.id, '✅ 按鈕2被點擊了！');
    }
});

console.log('✨ 測試Bot運行中，請發送 /start');