/**
 * 簡化版 Telegram 活動追蹤機器人
 * 使用 better-sqlite3 避免編譯問題
 */

const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// 安全配置 - 移除硬編碼Token
const config = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    dbPath: 'activities.db',
    reportsDir: 'reports',
    timezone: 'Asia/Taipei',
    reportTime: '5 23 * * *' // 每日 23:05
};

// 驗證必要的環境變數
if (!config.token) {
    console.error('❌ TELEGRAM_BOT_TOKEN 環境變數未設置');
    console.error('請創建 .env 文件或設置環境變數');
    process.exit(1);
}

// 初始化
const bot = new TelegramBot(config.token, {polling: true});
const db = new Database(config.dbPath);

// 活動類型映射
const activityTypes = {
    'toilet': { name: '上廁所', emoji: '🚽', defaultDuration: 6 * 60 },
    'smoke': { name: '抽菸', emoji: '🚬', defaultDuration: 5 * 60 },
    'phone': { name: '使用手機', emoji: '📱', defaultDuration: 10 * 60 },
    'break': { name: '休息', emoji: '☕', defaultDuration: 15 * 60 },
    'defecate_10': { name: '大便10', emoji: '💩', defaultDuration: 10 * 60 },
    'defecate_15': { name: '大便15', emoji: '💩', defaultDuration: 15 * 60 }
};

// 初始化資料庫
function initDatabase() {
    try {
        // 活動記錄表
        db.exec(`CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            chat_id TEXT NOT NULL,
            chat_title TEXT,
            activity_type TEXT NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            duration INTEGER,
            status TEXT DEFAULT 'ongoing',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // 每日統計表
        db.exec(`CREATE TABLE IF NOT EXISTS daily_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            chat_id TEXT NOT NULL,
            chat_title TEXT,
            total_activities INTEGER DEFAULT 0,
            total_duration INTEGER DEFAULT 0,
            active_users INTEGER DEFAULT 0,
            report_content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        console.log('✅ 資料庫初始化完成');
    } catch (error) {
        console.error('❌ 資料庫初始化失敗:', error);
    }
}

// 獲取使用者正在進行的活動
function getOngoingActivity(userId, chatId) {
    try {
        const stmt = db.prepare(`
            SELECT * FROM activities 
            WHERE user_id = ? AND chat_id = ? AND status = 'ongoing'
            ORDER BY start_time DESC LIMIT 1
        `);
        return stmt.get(userId, chatId);
    } catch (error) {
        console.error('❌ 查詢進行中活動失敗:', error);
        return null;
    }
}

// 開始活動
function startActivity(userId, userName, chatId, chatTitle, activityType) {
    try {
        // 檢查是否有正在進行的活動
        const ongoing = getOngoingActivity(userId, chatId);
        if (ongoing) {
            return {
                success: false,
                message: `❌ 您已有正在進行的活動：${activityTypes[ongoing.activity_type].name}`
            };
        }
        
        // 開始新活動
        const startTime = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO activities (user_id, user_name, chat_id, chat_title, activity_type, start_time)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(userId, userName, chatId, chatTitle, activityType, startTime);
        const activity = activityTypes[activityType];
        
        return {
            success: true,
            activityId: result.lastInsertRowid,
            message: `${activity.emoji} 開始${activity.name}`,
            expectedDuration: activity.defaultDuration
        };
    } catch (error) {
        console.error('❌ 開始活動失敗:', error);
        return {
            success: false,
            message: `❌ 開始活動失敗：${error.message}`
        };
    }
}

// 完成活動
function completeActivity(userId, chatId) {
    try {
        const ongoing = getOngoingActivity(userId, chatId);
        if (!ongoing) {
            return {
                success: false,
                message: '❌ 沒有正在進行的活動'
            };
        }
        
        const endTime = new Date().toISOString();
        const duration = Math.floor((new Date(endTime) - new Date(ongoing.start_time)) / 1000);
        
        const stmt = db.prepare(`
            UPDATE activities 
            SET end_time = ?, duration = ?, status = 'completed'
            WHERE id = ?
        `);
        
        stmt.run(endTime, duration, ongoing.id);
        
        const activity = activityTypes[ongoing.activity_type];
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        return {
            success: true,
            message: `✅ ${activity.name}完成\\n⏱️ 用時：${minutes}分${seconds}秒`,
            duration: duration
        };
    } catch (error) {
        console.error('❌ 完成活動失敗:', error);
        return {
            success: false,
            message: `❌ 完成活動失敗：${error.message}`
        };
    }
}

// 獲取活動按鈕
function getActivityButtons() {
    const buttons = [];
    const types = Object.keys(activityTypes);
    
    // 每行2個按鈕
    for (let i = 0; i < types.length; i += 2) {
        const row = [];
        for (let j = i; j < i + 2 && j < types.length; j++) {
            const type = types[j];
            const activity = activityTypes[type];
            row.push({
                text: `${activity.emoji} ${activity.name}`,
                callback_data: `start_${type}`
            });
        }
        buttons.push(row);
    }
    
    // 添加完成和狀態按鈕
    buttons.push([
        { text: '✅ 完成活動', callback_data: 'complete' },
        { text: '📊 查看狀態', callback_data: 'status' }
    ]);
    
    return buttons;
}

// 格式化時間
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0秒';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}小時`;
    if (minutes > 0) result += `${minutes}分鐘`;
    if (secs > 0 || result === '') result += `${secs}秒`;
    
    return result;
}

// Bot 命令處理
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `🤖 活動追蹤機器人已啟動！

🎯 功能：
• 追蹤各種活動（上廁所、抽菸、使用手機等）
• 每日自動生成統計報告
• 按聊天室分資料夾存放報告

⚡ 快速開始：
選擇下方按鈕開始活動或查看狀態`;
    
    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            inline_keyboard: getActivityButtons()
        }
    });
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `📖 使用說明

🔸 基本操作：
• 點擊活動按鈕開始追蹤
• 點擊「完成活動」結束追蹤
• 點擊「查看狀態」查看當前狀態

🔸 報告功能：
• 每日 23:05 自動生成報告
• 報告包含活動統計、使用者排行榜
• 報告保存在 reports/聊天室ID/ 目錄

🔸 命令：
/start - 開始使用
/help - 查看說明
/status - 查看狀態`;
    
    bot.sendMessage(chatId, helpMessage);
});

bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        const ongoing = getOngoingActivity(userId, chatId);
        
        if (ongoing) {
            const activity = activityTypes[ongoing.activity_type];
            const startTime = new Date(ongoing.start_time);
            const now = new Date();
            const elapsed = Math.floor((now - startTime) / 1000);
            
            const message = `📊 當前狀態

🔸 正在進行：${activity.emoji} ${activity.name}
⏱️ 已用時：${formatDuration(elapsed)}
🕐 開始時間：${startTime.toLocaleString('zh-TW')}
⏰ 預期時間：${formatDuration(activity.defaultDuration)}`;
            
            bot.sendMessage(chatId, message);
        } else {
            bot.sendMessage(chatId, '📊 目前沒有正在進行的活動', {
                reply_markup: {
                    inline_keyboard: getActivityButtons()
                }
            });
        }
    } catch (error) {
        bot.sendMessage(chatId, `❌ 查看狀態失敗：${error.message}`);
    }
});

// 處理回調查詢
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const userId = callbackQuery.from.id;
    const userName = callbackQuery.from.first_name || callbackQuery.from.username;
    const chatTitle = message.chat.title || message.chat.first_name;
    const data = callbackQuery.data;
    
    try {
        if (data.startsWith('start_')) {
            const activityType = data.replace('start_', '');
            const result = startActivity(userId, userName, chatId, chatTitle, activityType);
            
            bot.answerCallbackQuery(callbackQuery.id, { text: result.message });
            
            if (result.success) {
                bot.editMessageText(
                    `${result.message}\\n⏰ 預期時間：${formatDuration(result.expectedDuration)}`,
                    {
                        chat_id: chatId,
                        message_id: message.message_id,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ 完成活動', callback_data: 'complete' }],
                                [{ text: '📊 查看狀態', callback_data: 'status' }]
                            ]
                        }
                    }
                );
            }
        } else if (data === 'complete') {
            const result = completeActivity(userId, chatId);
            
            bot.answerCallbackQuery(callbackQuery.id, { text: result.message });
            
            bot.editMessageText(
                result.message,
                {
                    chat_id: chatId,
                    message_id: message.message_id,
                    reply_markup: {
                        inline_keyboard: getActivityButtons()
                    }
                }
            );
        } else if (data === 'status') {
            const ongoing = getOngoingActivity(userId, chatId);
            
            if (ongoing) {
                const activity = activityTypes[ongoing.activity_type];
                const startTime = new Date(ongoing.start_time);
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                
                const statusMessage = `📊 當前狀態：${activity.emoji} ${activity.name}\\n⏱️ 已用時：${formatDuration(elapsed)}`;
                bot.answerCallbackQuery(callbackQuery.id, { text: statusMessage });
            } else {
                bot.answerCallbackQuery(callbackQuery.id, { text: '目前沒有正在進行的活動' });
            }
        }
    } catch (error) {
        bot.answerCallbackQuery(callbackQuery.id, { text: `操作失敗：${error.message}` });
    }
});

// 錯誤處理
bot.on('error', (error) => {
    console.error('🚨 Bot 錯誤:', error);
});

// 啟動
function startBot() {
    console.log('🚀 正在啟動 Telegram 活動追蹤機器人...');
    
    // 初始化資料庫
    initDatabase();
    
    // 檢查 token
    if (config.token === 'YOUR_BOT_TOKEN_HERE') {
        console.log('⚠️  請設定 TELEGRAM_BOT_TOKEN 環境變數');
        console.log('💡 在 Windows 中設定: set TELEGRAM_BOT_TOKEN=你的機器人TOKEN');
    } else {
        console.log('✅ Bot 已啟動，等待消息...');
        console.log('📝 每日報告時間:', config.reportTime);
        console.log('📁 報告保存目錄:', config.reportsDir);
    }
}

// 啟動機器人
startBot();