// 測試 Telegram 鍵盤格式
const TelegramBot = require('node-telegram-bot-api');

const token = '8134343577:AAF_U30xi1Gw1aDk05MdIgzbX8i_eit_XKo';
const bot = new TelegramBot(token, { polling: false });

async function testKeyboard() {
    const chatId = '-1002512140773'; // 你的群組ID
    
    console.log('測試基本鍵盤格式...');
    
    // 測試最簡單的格式
    const simpleKeyboard = {
        keyboard: [
            ['按鈕1', '按鈕2'],
            ['按鈕3']
        ],
        resize_keyboard: true
    };
    
    try {
        await bot.sendMessage(chatId, '測試基本鍵盤:', {
            reply_markup: simpleKeyboard
        });
        console.log('✅ 基本鍵盤發送成功');
    } catch (error) {
        console.error('❌ 基本鍵盤發送失敗:', error.message);
    }
    
    // 等待 2 秒
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 測試雙語鍵盤
    console.log('測試雙語鍵盤格式...');
    const bilingualKeyboard = {
        keyboard: [
            [
                '🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)',
                '🚬 抽菸 (5分鐘)/สูบบุหรี่'
            ],
            [
                '📊 統計數據/สถิติ'
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };
    
    try {
        await bot.sendMessage(chatId, '測試雙語鍵盤:', {
            reply_markup: bilingualKeyboard
        });
        console.log('✅ 雙語鍵盤發送成功');
    } catch (error) {
        console.error('❌ 雙語鍵盤發送失敗:', error.message);
    }
    
    console.log('測試完成！請檢查電腦版是否能看到鍵盤');
}

testKeyboard().catch(console.error);