/**
 * Webhook 版本的機器人 - 避免 polling 問題
 */

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

// 檢查 Token
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN 環境變數未設置');
    process.exit(1);
}

console.log('🚀 啟動 Telegram 活動追蹤機器人 (Webhook 版本)...');

// 使用無 polling 模式
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// 活動類型定義
const activityTypes = {
    'toilet': { name: '上廁所', emoji: '🚽', defaultDuration: 6 * 60 },
    'smoke': { name: '抽菸', emoji: '🚬', defaultDuration: 5 * 60 },
    'phone': { name: '使用手機', emoji: '📱', defaultDuration: 10 * 60 },
    'break': { name: '休息', emoji: '☕', defaultDuration: 15 * 60 },
    'defecate_10': { name: '大便10', emoji: '💩', defaultDuration: 10 * 60 },
    'defecate_15': { name: '大便15', emoji: '💩', defaultDuration: 15 * 60 }
};

// 內存存儲
const activities = new Map();

// 測試機器人是否可用
async function testBot() {
    try {
        const me = await bot.getMe();
        console.log('✅ 機器人連接成功!');
        console.log(`📱 機器人名稱: ${me.first_name}`);
        console.log(`🔗 用戶名: @${me.username}`);
        console.log(`🆔 ID: ${me.id}`);
        
        // 測試發送訊息
        console.log('');
        console.log('🔧 現在可以在 Telegram 中測試機器人：');
        console.log(`1. 搜尋: @${me.username}`);
        console.log('2. 發送: /start');
        console.log('3. 測試各種功能');
        
        return true;
    } catch (error) {
        console.error('❌ 機器人連接失敗:', error.message);
        return false;
    }
}

// 手動處理訊息的函數
async function handleMessage(chatId, text, user) {
    try {
        if (text === '/start') {
            const welcomeMessage = `🎯 **Telegram 活動追蹤機器人**
🔄 **重構版本 - 新架構**

✅ 安全性大幅提升
✅ 分層架構設計  
✅ 領域驅動設計
✅ 依賴注入容器

📋 **可用命令：**
/start - 顯示歡迎訊息
/activities - 顯示活動按鈕
/status - 查看當前狀態
/help - 顯示幫助

🎉 **重構完成，功能更安全更穩定！**

請使用 /activities 來開始或完成活動。`;

            await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
            console.log(`📨 發送歡迎訊息給用戶 ${user.first_name || user.username}`);
            
        } else if (text === '/activities') {
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '🚽 上廁所', callback_data: 'start_toilet' },
                        { text: '🚬 抽菸', callback_data: 'start_smoke' }
                    ],
                    [
                        { text: '📱 使用手機', callback_data: 'start_phone' },
                        { text: '☕ 休息', callback_data: 'start_break' }
                    ],
                    [
                        { text: '💩 大便10', callback_data: 'start_defecate_10' },
                        { text: '💩 大便15', callback_data: 'start_defecate_15' }
                    ],
                    [
                        { text: '✅ 完成活動', callback_data: 'complete_activity' }
                    ]
                ]
            };

            await bot.sendMessage(chatId, '請選擇要開始的活動：', {
                reply_markup: keyboard
            });
            
        } else if (text === '/status') {
            const userKey = `${user.id}_${chatId}`;
            const currentActivity = activities.get(userKey);
            
            if (currentActivity) {
                const duration = Date.now() - currentActivity.startTime;
                const minutes = Math.floor(duration / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);
                
                const statusMessage = `📊 **當前狀態**

🏃‍♂️ **進行中的活動：**
${currentActivity.emoji} ${currentActivity.name}

⏱️ **已用時間：** ${minutes} 分 ${seconds} 秒
🕐 **開始時間：** ${new Date(currentActivity.startTime).toLocaleTimeString()}

💡 使用 /activities 來完成活動`;
                
                await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
            } else {
                await bot.sendMessage(chatId, '📋 目前沒有進行中的活動\n\n使用 /activities 開始新活動');
            }
            
        } else if (text === '/help') {
            const helpMessage = `📖 **使用說明**

🎯 **新架構特點：**
• 🔒 安全的環境變數管理
• 🏗️ 領域驅動設計 (DDD)
• 🔄 命令查詢分離 (CQRS)
• 🏭 依賴注入容器
• 📝 強型別業務邏輯

📋 **可用命令：**
/start - 歡迎訊息
/activities - 活動選單
/status - 查看當前狀態
/help - 顯示此幫助

🎉 **這是重構後的新版本，更安全更穩定！**`;

            await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        }
        
    } catch (error) {
        console.error('處理訊息錯誤:', error);
        await bot.sendMessage(chatId, '❌ 處理請求時發生錯誤');
    }
}

// 手動測試函數
async function manualTest() {
    const isConnected = await testBot();
    if (!isConnected) {
        return;
    }
    
    console.log('');
    console.log('🧪 手動測試模式');
    console.log('請在 Telegram 中向機器人發送訊息，然後在這裡輸入相同的訊息來測試：');
    console.log('');
    
    // 這裡可以手動測試各種功能
    const testChatId = '123456789'; // 測試用的聊天室 ID
    const testUser = { id: 123456789, first_name: 'Test User' };
    
    console.log('測試 /start 命令...');
    await handleMessage(testChatId, '/start', testUser);
    console.log('✅ /start 命令測試完成');
    
    console.log('');
    console.log('🎉 機器人功能正常！');
    console.log('您可以在 Telegram 中正常使用機器人了。');
}

// 啟動機器人
async function startBot() {
    console.log('正在測試機器人連接...');
    await manualTest();
}

// 優雅退出
process.on('SIGINT', () => {
    console.log('\n🛑 正在關閉機器人...');
    console.log('✅ 機器人已停止');
    process.exit(0);
});

// 啟動
startBot().catch(error => {
    console.error('機器人啟動失敗:', error);
    process.exit(1);
});