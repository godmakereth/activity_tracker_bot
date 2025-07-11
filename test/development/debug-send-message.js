// 調試訊息發送和鍵盤
const TelegramBot = require('node-telegram-bot-api');

const token = '8134343577:AAF_U30xi1Gw1aDk05MdIgzbX8i_eit_XKo';
const bot = new TelegramBot(token, { polling: false });

async function debugSendMessage() {
    const chatId = '-1002512140773';
    
    console.log('🔍 調試 Telegram 訊息發送...');
    
    try {
        // 測試1: 基本 inline 鍵盤
        console.log('測試1: 基本 inline 鍵盤');
        const result1 = await bot.sendMessage(chatId, '測試 Inline 鍵盤:', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '按鈕1', callback_data: 'test1' },
                        { text: '按鈕2', callback_data: 'test2' }
                    ]
                ]
            }
        });
        console.log('✅ 基本 inline 鍵盤發送成功');
        console.log('回應:', JSON.stringify(result1, null, 2));
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 測試2: 基本 reply 鍵盤
        console.log('\n測試2: 基本 reply 鍵盤');
        const result2 = await bot.sendMessage(chatId, '測試 Reply 鍵盤:', {
            reply_markup: {
                keyboard: [['按鈕A', '按鈕B']],
                resize_keyboard: true
            }
        });
        console.log('✅ 基本 reply 鍵盤發送成功');
        console.log('回應:', JSON.stringify(result2, null, 2));
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 測試3: 隱藏鍵盤
        console.log('\n測試3: 隱藏鍵盤');
        const result3 = await bot.sendMessage(chatId, '隱藏 Reply 鍵盤', {
            reply_markup: {
                remove_keyboard: true
            }
        });
        console.log('✅ 隱藏鍵盤發送成功');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 測試4: 強制 reply 鍵盤
        console.log('\n測試4: 強制 reply 鍵盤');
        const result4 = await bot.sendMessage(chatId, '強制 Reply 鍵盤:', {
            reply_markup: {
                keyboard: [
                    ['🚽 測試上廁所', '🚬 測試抽菸'],
                    ['📊 測試統計']
                ],
                resize_keyboard: true,
                one_time_keyboard: false,
                selective: false
            }
        });
        console.log('✅ 強制 reply 鍵盤發送成功');
        
    } catch (error) {
        console.error('❌ 錯誤:', error.message);
        if (error.response) {
            console.error('回應錯誤:', error.response.body);
        }
    }
}

debugSendMessage().catch(console.error);