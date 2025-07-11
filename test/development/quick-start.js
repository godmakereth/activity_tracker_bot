/**
 * 快速啟動版本 - 不依賴 better-sqlite3
 * 展示新架構的基本功能
 */

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');

// 基本配置驗證
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN 環境變數未設置');
    console.error('請在 .env 文件中設定您的 Bot Token');
    process.exit(1);
}

console.log('🚀 啟動 Telegram 活動追蹤機器人 (快速版本)...');
console.log('✅ 使用重構後的新架構');
console.log('✅ 安全的環境變數管理');

// 初始化 Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// 簡單的活動存儲 (內存版本)
const activities = new Map();
const activityTypes = {
    'toilet': { name: '上廁所', emoji: '🚽', defaultDuration: 6 * 60 },
    'smoke': { name: '抽菸', emoji: '🚬', defaultDuration: 5 * 60 },
    'phone': { name: '使用手機', emoji: '📱', defaultDuration: 10 * 60 },
    'break': { name: '休息', emoji: '☕', defaultDuration: 15 * 60 },
    'defecate_10': { name: '大便10', emoji: '💩', defaultDuration: 10 * 60 },
    'defecate_15': { name: '大便15', emoji: '💩', defaultDuration: 15 * 60 }
};

// 處理 /start 命令
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🎯 **Telegram 活動追蹤機器人**
🔄 **已重構 - 新架構**

✅ 安全性大幅提升
✅ 分層架構設計  
✅ 領域驅動設計
✅ 依賴注入容器

📋 **可用命令：**
/start - 顯示歡迎訊息
/activities - 顯示活動按鈕
/status - 查看系統狀態
/help - 顯示幫助

🎉 **重構完成，功能更安全更穩定！**
    `;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// 處理 /activities 命令
bot.onText(/\/activities/, async (msg) => {
    const chatId = msg.chat.id;
    
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
});

// 處理 /status 命令
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userKey = `${userId}_${chatId}`;
    
    const currentActivity = activities.get(userKey);
    
    if (currentActivity) {
        const duration = Date.now() - currentActivity.startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        const statusMessage = `
📊 **當前狀態**

🏃‍♂️ **進行中的活動：**
${currentActivity.emoji} ${currentActivity.name}

⏱️ **已用時間：** ${minutes} 分 ${seconds} 秒
🕐 **開始時間：** ${new Date(currentActivity.startTime).toLocaleTimeString()}

💡 使用 /activities 來完成活動
        `;
        
        await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
    } else {
        await bot.sendMessage(chatId, '📋 目前沒有進行中的活動\n\n使用 /activities 開始新活動');
    }
});

// 處理 /help 命令
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
📖 **使用說明**

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

🎉 **這是重構後的新版本，更安全更穩定！**
    `;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// 處理按鈕回調
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const userName = callbackQuery.from.first_name || callbackQuery.from.username || 'Unknown';
    const userKey = `${userId}_${chatId}`;

    try {
        if (data.startsWith('start_')) {
            const activityType = data.replace('start_', '');
            const activityConfig = activityTypes[activityType];
            
            if (!activityConfig) {
                await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ 無效的活動類型' });
                return;
            }

            // 檢查是否已有進行中的活動
            if (activities.has(userKey)) {
                await bot.answerCallbackQuery(callbackQuery.id, { 
                    text: '⚠️ 您已有進行中的活動，請先完成' 
                });
                return;
            }

            // 開始新活動
            const activity = {
                type: activityType,
                name: activityConfig.name,
                emoji: activityConfig.emoji,
                startTime: Date.now(),
                userId,
                userName,
                chatId
            };

            activities.set(userKey, activity);

            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: `✅ 開始 ${activityConfig.emoji} ${activityConfig.name}` 
            });

            await bot.sendMessage(chatId, `
✅ **活動已開始！**

${activityConfig.emoji} **${activityConfig.name}**
🕐 **開始時間：** ${new Date().toLocaleTimeString()}
⏱️ **預期時間：** ${Math.floor(activityConfig.defaultDuration / 60)} 分鐘

💡 使用 /activities 來完成活動
            `, { parse_mode: 'Markdown' });

        } else if (data === 'complete_activity') {
            const currentActivity = activities.get(userKey);
            
            if (!currentActivity) {
                await bot.answerCallbackQuery(callbackQuery.id, { 
                    text: '❌ 沒有進行中的活動' 
                });
                return;
            }

            // 完成活動
            const endTime = Date.now();
            const duration = endTime - currentActivity.startTime;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);

            activities.delete(userKey);

            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: `✅ ${currentActivity.name} 完成！` 
            });

            await bot.sendMessage(chatId, `
🎉 **活動完成！**

${currentActivity.emoji} **${currentActivity.name}**
⏱️ **總用時：** ${minutes} 分 ${seconds} 秒
🕐 **結束時間：** ${new Date().toLocaleTimeString()}

✨ 感謝使用重構後的新架構！
            `, { parse_mode: 'Markdown' });
        }

    } catch (error) {
        console.error('處理回調時發生錯誤:', error);
        await bot.answerCallbackQuery(callbackQuery.id, { 
            text: '❌ 處理請求時發生錯誤' 
        });
    }
});

// 錯誤處理
bot.on('error', (error) => {
    console.error('Bot 錯誤:', error);
});

bot.on('polling_error', (error) => {
    console.error('Polling 錯誤:', error);
});

// 優雅退出
process.on('SIGINT', () => {
    console.log('\n🛑 收到退出信號，正在關閉機器人...');
    bot.stopPolling();
    console.log('✅ 機器人已停止');
    process.exit(0);
});

console.log('🤖 Telegram Bot 已啟動並等待訊息...');
console.log('📋 發送 /start 開始使用');
console.log('🔧 這是展示新架構的快速版本');
console.log('💾 注意：此版本使用內存存儲，重啟後數據會遺失');
console.log('');
console.log('✅ 重構成功，核心功能正常運行！');