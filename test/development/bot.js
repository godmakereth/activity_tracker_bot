/**
 * Telegram 活動追蹤機器人
 * 功能：追蹤活動、生成每日報告、按聊天室分資料夾存放
 */

const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// 配置
const config = {
    token: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    dbPath: 'activities.db',
    reportsDir: 'reports',
    timezone: 'Asia/Taipei',
    reportTime: '5 23 * * *' // 每日 23:05
};

// 初始化
const bot = new TelegramBot(config.token, {polling: true});
const db = new Database(config.dbPath);

// 活動類型映射
const activityTypes = {
    'toilet': {
        name: '上廁所',
        emoji: '🚽',
        defaultDuration: 6 * 60 // 6分鐘
    },
    'smoke': {
        name: '抽菸',
        emoji: '🚬',
        defaultDuration: 5 * 60 // 5分鐘
    },
    'phone': {
        name: '使用手機',
        emoji: '📱',
        defaultDuration: 10 * 60 // 10分鐘
    },
    'break': {
        name: '休息',
        emoji: '☕',
        defaultDuration: 15 * 60 // 15分鐘
    },
    'defecate_10': {
        name: '大便10',
        emoji: '💩',
        defaultDuration: 10 * 60 // 10分鐘
    },
    'defecate_15': {
        name: '大便15',
        emoji: '💩',
        defaultDuration: 15 * 60 // 15分鐘
    }
};

// 初始化資料庫
function initDatabase() {
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
    
    // 建立索引
    db.exec(`CREATE INDEX IF NOT EXISTS idx_activities_user_chat 
            ON activities (user_id, chat_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_activities_date 
            ON activities (date(start_time))`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_stats_date_chat 
            ON daily_stats (date, chat_id)`);
    
    console.log('✅ 資料庫初始化完成');
}

// 獲取使用者正在進行的活動
function getOngoingActivity(userId, chatId) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(`
                SELECT * FROM activities 
                WHERE user_id = ? AND chat_id = ? AND status = 'ongoing'
                ORDER BY start_time DESC LIMIT 1
            `);
            const row = stmt.get(userId, chatId);
            resolve(row);
        } catch (err) {
            reject(err);
        }
    });
}

// 開始活動
async function startActivity(userId, userName, chatId, chatTitle, activityType) {
    try {
        // 檢查是否有正在進行的活動
        const ongoing = await getOngoingActivity(userId, chatId);
        if (ongoing) {
            return {
                success: false,
                message: `❌ 您已有正在進行的活動：${getActivityName(ongoing.activity_type)}`
            };
        }
        
        // 開始新活動
        const startTime = new Date().toISOString();
        
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO activities (user_id, user_name, chat_id, chat_title, activity_type, start_time)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, userName, chatId, chatTitle, activityType, startTime], function(err) {
                if (err) {
                    reject(err);
                } else {
                    const activity = activityTypes[activityType];
                    resolve({
                        success: true,
                        activityId: this.lastID,
                        message: `${activity.emoji} 開始${activity.name}`,
                        expectedDuration: activity.defaultDuration
                    });
                }
            });
        });
    } catch (error) {
        return {
            success: false,
            message: `❌ 開始活動失敗：${error.message}`
        };
    }
}

// 完成活動
async function completeActivity(userId, chatId) {
    try {
        const ongoing = await getOngoingActivity(userId, chatId);
        if (!ongoing) {
            return {
                success: false,
                message: '❌ 沒有正在進行的活動'
            };
        }
        
        const endTime = new Date().toISOString();
        const duration = Math.floor((new Date(endTime) - new Date(ongoing.start_time)) / 1000);
        
        return new Promise((resolve, reject) => {
            db.run(`
                UPDATE activities 
                SET end_time = ?, duration = ?, status = 'completed'
                WHERE id = ?
            `, [endTime, duration, ongoing.id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    const activity = activityTypes[ongoing.activity_type];
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    
                    resolve({
                        success: true,
                        message: `✅ ${activity.name}完成\n⏱️ 用時：${minutes}分${seconds}秒`,
                        duration: duration
                    });
                }
            });
        });
    } catch (error) {
        return {
            success: false,
            message: `❌ 完成活動失敗：${error.message}`
        };
    }
}

// 獲取活動名稱
function getActivityName(type) {
    return activityTypes[type]?.name || type;
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

// 生成每日報告
async function generateDailyReport(chatId) {
    const today = new Date().toISOString().split('T')[0];
    
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                user_name,
                activity_type,
                COUNT(*) as count,
                SUM(duration) as total_duration,
                AVG(duration) as avg_duration,
                MIN(start_time) as first_activity,
                MAX(end_time) as last_activity,
                chat_title
            FROM activities 
            WHERE chat_id = ? AND date(start_time) = ? AND status = 'completed'
            GROUP BY user_name, activity_type
            ORDER BY user_name, count DESC
        `, [chatId, today], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (rows.length === 0) {
                resolve({
                    success: false,
                    message: '今日沒有活動記錄'
                });
                return;
            }
            
            const report = formatDailyReport(rows, today);
            
            // 保存報告到資料庫
            saveDailyReport(chatId, today, rows, report);
            
            // 保存報告到文件
            saveReportToFile(chatId, today, report);
            
            resolve({
                success: true,
                report: report,
                chatTitle: rows[0].chat_title
            });
        });
    });
}

// 格式化每日報告
function formatDailyReport(data, date) {
    const chatTitle = data[0]?.chat_title || '聊天室';
    
    let report = `📊 ${chatTitle} 每日活動統計報告\n`;
    report += `📅 日期: ${date}\n`;
    report += `🕐 統計時間: ${date} 11:00 PM 前 24 小時\n`;
    report += '='.repeat(60) + '\n\n';
    
    // 計算總覽統計
    const totalActivities = data.reduce((sum, row) => sum + row.count, 0);
    const totalDuration = data.reduce((sum, row) => sum + (row.total_duration || 0), 0);
    const activeUsers = new Set(data.map(row => row.user_name)).size;
    
    report += '📋 總覽\n';
    report += `• 總活動次數: ${totalActivities}\n`;
    report += `• 總用時: ${formatDuration(totalDuration)}\n`;
    report += `• 活躍使用者: ${activeUsers} 人\n`;
    report += `• 平均活動時間: ${formatDuration(totalDuration / totalActivities)}\n\n`;
    
    // 活動類型分佈
    const activityStats = {};
    data.forEach(row => {
        const activityName = getActivityName(row.activity_type);
        if (!activityStats[activityName]) {
            activityStats[activityName] = {
                count: 0,
                duration: 0,
                users: new Set()
            };
        }
        activityStats[activityName].count += row.count;
        activityStats[activityName].duration += row.total_duration || 0;
        activityStats[activityName].users.add(row.user_name);
    });
    
    report += '📈 活動類型分佈\n';
    Object.entries(activityStats)
        .sort(([,a], [,b]) => b.count - a.count)
        .forEach(([activityName, stats]) => {
            report += `• ${activityName}:\n`;
            report += `  - 次數: ${stats.count}\n`;
            report += `  - 總時間: ${formatDuration(stats.duration)}\n`;
            report += `  - 平均時間: ${formatDuration(stats.duration / stats.count)}\n`;
            report += `  - 參與人數: ${stats.users.size} 人\n\n`;
        });
    
    // 使用者統計
    const userStats = {};
    data.forEach(row => {
        if (!userStats[row.user_name]) {
            userStats[row.user_name] = {
                totalCount: 0,
                totalDuration: 0,
                activities: {}
            };
        }
        userStats[row.user_name].totalCount += row.count;
        userStats[row.user_name].totalDuration += row.total_duration || 0;
        userStats[row.user_name].activities[getActivityName(row.activity_type)] = row.count;
    });
    
    report += '👥 使用者統計\n';
    Object.entries(userStats)
        .sort(([,a], [,b]) => b.totalCount - a.totalCount)
        .forEach(([userName, stats]) => {
            report += `• ${userName}:\n`;
            report += `  - 活動次數: ${stats.totalCount}\n`;
            report += `  - 總時間: ${formatDuration(stats.totalDuration)}\n`;
            report += `  - 活動分佈:\n`;
            Object.entries(stats.activities)
                .sort(([,a], [,b]) => b - a)
                .forEach(([activityName, count]) => {
                    report += `    • ${activityName}: ${count} 次\n`;
                });
            report += '\n';
        });
    
    // 排行榜
    report += '🏆 活動排行榜\n';
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    Object.entries(userStats)
        .sort(([,a], [,b]) => b.totalCount - a.totalCount)
        .slice(0, 5)
        .forEach(([userName, stats], index) => {
            const medal = medals[index] || `${index + 1}️⃣`;
            const productivityScore = stats.totalCount * 10; // 簡單評分
            report += `${medal} ${userName}\n`;
            report += `   - 活動次數: ${stats.totalCount}\n`;
            report += `   - 總時間: ${formatDuration(stats.totalDuration)}\n`;
            report += `   - 生產力評分: ${productivityScore}\n\n`;
        });
    
    // 結語
    report += '='.repeat(60) + '\n';
    report += `📝 報告生成時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n`;
    report += '🤖 由 Node.js 活動追蹤機器人自動生成\n';
    
    return report;
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

// 保存每日報告到資料庫
function saveDailyReport(chatId, date, data, reportContent) {
    const totalActivities = data.reduce((sum, row) => sum + row.count, 0);
    const totalDuration = data.reduce((sum, row) => sum + (row.total_duration || 0), 0);
    const activeUsers = new Set(data.map(row => row.user_name)).size;
    const chatTitle = data[0]?.chat_title || '聊天室';
    
    db.run(`
        INSERT OR REPLACE INTO daily_stats 
        (date, chat_id, chat_title, total_activities, total_duration, active_users, report_content)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [date, chatId, chatTitle, totalActivities, totalDuration, activeUsers, reportContent]);
}

// 保存報告到文件
function saveReportToFile(chatId, date, report) {
    const chatDir = path.join(config.reportsDir, chatId);
    
    // 確保目錄存在
    if (!fs.existsSync(chatDir)) {
        fs.mkdirSync(chatDir, { recursive: true });
    }
    
    const filename = `${date}_daily_report.txt`;
    const filepath = path.join(chatDir, filename);
    
    fs.writeFileSync(filepath, report, 'utf8');
    console.log(`📄 報告已保存: ${filepath}`);
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
/status - 查看狀態
/report - 生成今日報告`;
    
    bot.sendMessage(chatId, helpMessage);
});

bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        const ongoing = await getOngoingActivity(userId, chatId);
        
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

bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const result = await generateDailyReport(chatId);
        
        if (result.success) {
            // 分段發送報告（Telegram 有字數限制）
            const report = result.report;
            const maxLength = 4000;
            
            if (report.length <= maxLength) {
                bot.sendMessage(chatId, `\`\`\`\n${report}\n\`\`\``, { parse_mode: 'Markdown' });
            } else {
                // 分段發送
                const parts = [];
                let currentPart = '';
                const lines = report.split('\n');
                
                for (const line of lines) {
                    if (currentPart.length + line.length + 1 > maxLength) {
                        parts.push(currentPart);
                        currentPart = line;
                    } else {
                        currentPart += (currentPart ? '\n' : '') + line;
                    }
                }
                if (currentPart) parts.push(currentPart);
                
                for (let i = 0; i < parts.length; i++) {
                    const partMessage = `\`\`\`\n${parts[i]}\n\`\`\``;
                    if (i === 0) {
                        bot.sendMessage(chatId, `📊 每日報告 (${i + 1}/${parts.length})\n${partMessage}`, { parse_mode: 'Markdown' });
                    } else {
                        bot.sendMessage(chatId, `📊 每日報告 (${i + 1}/${parts.length})\n${partMessage}`, { parse_mode: 'Markdown' });
                    }
                }
            }
        } else {
            bot.sendMessage(chatId, result.message);
        }
    } catch (error) {
        bot.sendMessage(chatId, `❌ 生成報告失敗：${error.message}`);
    }
});

// 處理回調查詢
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const userId = callbackQuery.from.id;
    const userName = callbackQuery.from.first_name || callbackQuery.from.username;
    const chatTitle = message.chat.title || message.chat.first_name;
    const data = callbackQuery.data;
    
    try {
        if (data.startsWith('start_')) {
            const activityType = data.replace('start_', '');
            const result = await startActivity(userId, userName, chatId, chatTitle, activityType);
            
            bot.answerCallbackQuery(callbackQuery.id, { text: result.message });
            
            if (result.success) {
                bot.editMessageText(
                    `${result.message}\n⏰ 預期時間：${formatDuration(result.expectedDuration)}`,
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
            const result = await completeActivity(userId, chatId);
            
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
            const ongoing = await getOngoingActivity(userId, chatId);
            
            if (ongoing) {
                const activity = activityTypes[ongoing.activity_type];
                const startTime = new Date(ongoing.start_time);
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                
                const statusMessage = `📊 當前狀態：${activity.emoji} ${activity.name}\n⏱️ 已用時：${formatDuration(elapsed)}`;
                bot.answerCallbackQuery(callbackQuery.id, { text: statusMessage });
            } else {
                bot.answerCallbackQuery(callbackQuery.id, { text: '目前沒有正在進行的活動' });
            }
        }
    } catch (error) {
        bot.answerCallbackQuery(callbackQuery.id, { text: `操作失敗：${error.message}` });
    }
});

// 定時任務：每日 23:05 生成報告
cron.schedule(config.reportTime, async () => {
    console.log('🕐 開始生成每日報告...');
    
    try {
        // 獲取所有活躍聊天室
        const chatIds = await new Promise((resolve, reject) => {
            db.all(`
                SELECT DISTINCT chat_id 
                FROM activities 
                WHERE date(start_time) = date('now')
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.chat_id));
            });
        });
        
        console.log(`📊 找到 ${chatIds.length} 個活躍聊天室`);
        
        // 為每個聊天室生成報告
        for (const chatId of chatIds) {
            try {
                const result = await generateDailyReport(chatId);
                
                if (result.success) {
                    console.log(`✅ ${result.chatTitle} 報告生成成功`);
                    
                    // 可選：發送報告到聊天室
                    // bot.sendMessage(chatId, `📊 每日報告已生成\n查看完整報告請使用 /report 命令`);
                } else {
                    console.log(`⚠️ ${chatId} 無活動記錄`);
                }
            } catch (error) {
                console.error(`❌ 生成 ${chatId} 報告失敗:`, error);
            }
        }
        
        console.log('🎉 每日報告生成完成');
    } catch (error) {
        console.error('❌ 定時任務執行失敗:', error);
    }
});

// 錯誤處理
bot.on('error', (error) => {
    console.error('🚨 Bot 錯誤:', error);
});

process.on('uncaughtException', (error) => {
    console.error('🚨 未捕獲的異常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 未處理的 Promise 拒絕:', reason);
});

// 啟動
function startBot() {
    console.log('🚀 正在啟動 Telegram 活動追蹤機器人...');
    
    // 初始化資料庫
    initDatabase();
    
    // 檢查 token
    if (config.token === 'YOUR_BOT_TOKEN_HERE') {
        console.log('⚠️  請設定 TELEGRAM_BOT_TOKEN 環境變數或修改 config.token');
        console.log('💡 在 Windows 中設定: set TELEGRAM_BOT_TOKEN=你的機器人TOKEN');
        console.log('💡 或創建 .env 文件');
    } else {
        console.log('✅ Bot 已啟動，等待消息...');
        console.log('📝 每日報告時間:', config.reportTime);
        console.log('📁 報告保存目錄:', config.reportsDir);
    }
}

// 啟動機器人
startBot();

module.exports = { bot, db };