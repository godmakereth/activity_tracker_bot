/**
 * 雙語活動追蹤機器人 (中文+泰文)
 * 功能：追蹤活動、超時檢測、詳細統計報告
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
    timezone: 'Asia/Bangkok',
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

// 活動限制時間（秒）
const ACTIVITY_LIMITS = {
    '上廁所': 6 * 60,    // 6分鐘
    '抽菸': 5 * 60,      // 5分鐘
    '大便10': 10 * 60,   // 10分鐘
    '大便15': 15 * 60,   // 15分鐘
    '使用手機': 10 * 60   // 10分鐘
};

// 活動類型映射（雙語）
const activityTypes = {
    '上廁所': {
        name_zh: '上廁所',
        name_th: 'เข้าห้องน้ำ',
        emoji: '🚽',
        limit: 6 * 60
    },
    '抽菸': {
        name_zh: '抽菸',
        name_th: 'สูบบุหรี่',
        emoji: '🚬',
        limit: 5 * 60
    },
    '大便10': {
        name_zh: '大便',
        name_th: 'อึ',
        emoji: '💩',
        limit: 10 * 60
    },
    '大便15': {
        name_zh: '大便',
        name_th: 'อึ',
        emoji: '💩',
        limit: 15 * 60
    },
    '使用手機': {
        name_zh: '使用手機',
        name_th: 'ใช้มือถือ',
        emoji: '📱',
        limit: 10 * 60
    }
};

// 初始化資料庫
function initDatabase() {
    try {
        // 活動記錄表
        db.exec(`CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            chat_id INTEGER NOT NULL,
            activity TEXT NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            duration INTEGER NOT NULL,
            overtime INTEGER NOT NULL,
            user_full_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // 進行中的活動表
        db.exec(`CREATE TABLE IF NOT EXISTS ongoing (
            user_id INTEGER NOT NULL,
            chat_id INTEGER NOT NULL,
            activity TEXT NOT NULL,
            start_time DATETIME NOT NULL,
            user_full_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, chat_id)
        )`);
        
        console.log('✅ 資料庫初始化完成');
    } catch (error) {
        console.error('❌ 資料庫初始化失敗:', error);
    }
}

// 格式化時間（雙語）
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return { zh: '0秒', th: '0วินาที' };
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return {
        zh: `${minutes}分${secs}秒`,
        th: `${minutes}นาที${secs}วินาที`
    };
}

// 獲取進行中的活動
function getOngoingActivity(userId, chatId) {
    try {
        const stmt = db.prepare(`
            SELECT activity, start_time FROM ongoing 
            WHERE user_id = ? AND chat_id = ?
        `);
        const row = stmt.get(userId, chatId);
        if (row) {
            return {
                activity: row.activity,
                start_time: new Date(row.start_time)
            };
        }
        return null;
    } catch (error) {
        console.error('❌ 查詢進行中活動失敗:', error);
        return null;
    }
}

// 開始活動
function startActivity(userId, chatId, activity, userFullName) {
    try {
        const startTime = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO ongoing (user_id, chat_id, activity, start_time, user_full_name)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        stmt.run(userId, chatId, activity, startTime, userFullName);
        return { success: true };
    } catch (error) {
        console.error('❌ 開始活動失敗:', error);
        return { success: false, error: error.message };
    }
}

// 結束活動
function stopActivity(userId, chatId) {
    try {
        // 獲取進行中的活動
        const ongoingStmt = db.prepare(`
            SELECT activity, start_time, user_full_name 
            FROM ongoing WHERE user_id = ? AND chat_id = ?
        `);
        const ongoing = ongoingStmt.get(userId, chatId);
        
        if (!ongoing) {
            return { success: false, message: '沒有進行中的活動' };
        }
        
        const endTime = new Date();
        const startTime = new Date(ongoing.start_time);
        const duration = Math.floor((endTime - startTime) / 1000);
        
        // 計算超時
        const limit = ACTIVITY_LIMITS[ongoing.activity] || 300;
        const overtime = Math.max(0, duration - limit);
        
        // 插入活動記錄
        const insertStmt = db.prepare(`
            INSERT INTO activities 
            (user_id, chat_id, activity, start_time, end_time, duration, overtime, user_full_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(
            userId, chatId, ongoing.activity,
            startTime.toISOString(), endTime.toISOString(),
            duration, overtime, ongoing.user_full_name
        );
        
        // 刪除進行中的活動
        const deleteStmt = db.prepare(`
            DELETE FROM ongoing WHERE user_id = ? AND chat_id = ?
        `);
        deleteStmt.run(userId, chatId);
        
        return {
            success: true,
            activity: ongoing.activity,
            duration: duration,
            overtime: overtime
        };
    } catch (error) {
        console.error('❌ 結束活動失敗:', error);
        return { success: false, error: error.message };
    }
}

// 獲取統計數據
function getStatistics(timeRange, chatId) {
    try {
        let timeCondition = '';
        const now = new Date();
        
        switch (timeRange) {
            case 'today':
                timeCondition = `AND date(start_time) = date('now', 'localtime')`;
                break;
            case 'yesterday':
                timeCondition = `AND date(start_time) = date('now', 'localtime', '-1 day')`;
                break;
            case 'this_week':
                timeCondition = `AND strftime('%Y-%W', start_time) = strftime('%Y-%W', 'now', 'localtime')`;
                break;
            case 'last_week':
                timeCondition = `AND strftime('%Y-%W', start_time) = strftime('%Y-%W', 'now', 'localtime', '-7 days')`;
                break;
            case 'this_month':
                timeCondition = `AND strftime('%Y-%m', start_time) = strftime('%Y-%m', 'now', 'localtime')`;
                break;
            case 'last_month':
                timeCondition = `AND strftime('%Y-%m', start_time) = strftime('%Y-%m', 'now', 'localtime', '-1 month')`;
                break;
        }
        
        const stmt = db.prepare(`
            SELECT 
                user_full_name,
                activity,
                COUNT(*) as count,
                SUM(duration) as total_duration,
                SUM(overtime) as total_overtime,
                SUM(CASE WHEN overtime > 0 THEN 1 ELSE 0 END) as overtime_count
            FROM activities 
            WHERE chat_id = ? ${timeCondition}
            GROUP BY user_full_name, activity
            ORDER BY user_full_name, activity
        `);
        
        return stmt.all(chatId);
    } catch (error) {
        console.error('❌ 獲取統計數據失敗:', error);
        return [];
    }
}

// 生成統計報告
function generateReport(records, timeRange) {
    if (records.length === 0) {
        return "📊 該時段沒有記錄/ไม่มีข้อมูลในช่วงเวลานี้";
    }
    
    // 按用戶分組
    const userStats = {};
    records.forEach(record => {
        const userName = record.user_full_name;
        if (!userStats[userName]) {
            userStats[userName] = {
                total_count: 0,
                total_duration: 0,
                total_overtime: 0,
                total_overtime_count: 0,
                activities: {}
            };
        }
        
        const stats = userStats[userName];
        stats.total_count += record.count;
        stats.total_duration += record.total_duration;
        stats.total_overtime += record.total_overtime;
        stats.total_overtime_count += record.overtime_count;
        
        stats.activities[record.activity] = {
            count: record.count,
            duration: record.total_duration,
            overtime: record.total_overtime,
            overtime_count: record.overtime_count
        };
    });
    
    // 構建報告
    let report = "📊 群組統計報告/รายงานสถิติกลุ่ม\\n\\n";
    
    for (const [userName, stats] of Object.entries(userStats)) {
        const totalDuration = formatDuration(stats.total_duration);
        const totalOvertime = formatDuration(stats.total_overtime);
        
        report += `👤 ${userName}\\n`;
        report += `📈 總計/รวม:\\n`;
        report += `   🔢 總次數: ${stats.total_count} (ครั้ง)\\n`;
        report += `   ⏱️ 總時間: ${totalDuration.zh} (${totalDuration.th})\\n`;
        report += `   ⚠️ 總超時: ${totalOvertime.zh} (${totalOvertime.th})\\n`;
        report += `   ❌ 超時次數: ${stats.total_overtime_count} 次 (ครั้งที่เกินเวลา)\\n\\n`;
        
        report += "📊 活動明細/รายละเอียดกิจกรรม:\\n";
        for (const [activity, activityStats] of Object.entries(stats.activities)) {
            const activityType = activityTypes[activity];
            const emoji = activityType ? activityType.emoji : '📝';
            const duration = formatDuration(activityStats.duration);
            const overtime = formatDuration(activityStats.overtime);
            
            report += `   ${emoji} ${activity}:\\n`;
            report += `     🔢 次數: ${activityStats.count} (ครั้ง)\\n`;
            report += `     ⏱️ 時間: ${duration.zh} (${duration.th})\\n`;
            if (activityStats.overtime > 0) {
                report += `     ⚠️ 超時: ${overtime.zh} (${overtime.th})\\n`;
                report += `     ❌ 超時次數: ${activityStats.overtime_count} 次 (ครั้งที่เกินเวลา)\\n`;
            }
        }
        report += "\\n";
    }
    
    return report;
}

// 主鍵盤
function getMainKeyboard() {
    return {
        keyboard: [
            [
                { text: "🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)" },
                { text: "🚬 抽菸 (5分鐘)/สูบบุหรี่" }
            ],
            [
                { text: "💩 大便 (10分鐘)/อึ10นาที" },
                { text: "💩 大便 (15分鐘)/อึ15นาที" }
            ],
            [
                { text: "📱 使用手機 (10分鐘)/ใช้มือถือ" },
                { text: "✅ 我回來了/ฉันกลับมาแล้ว" }
            ],
            [
                { text: "📊 統計數據/สถิติ" }
            ]
        ],
        resize_keyboard: true
    };
}

// 統計選單鍵盤
function getStatisticsKeyboard() {
    return {
        keyboard: [
            [
                { text: "📅 本日資料/ข้อมูลวันนี้" },
                { text: "📅 昨日資料/ข้อมูลเมื่อวาน" }
            ],
            [
                { text: "📅 本週資料/ข้อมูลสัปดาห์นี้" },
                { text: "📅 上週資料/ข้อมูลสัปดาห์ที่แล้ว" }
            ],
            [
                { text: "📅 本月資料/ข้อมูลเดือนนี้" },
                { text: "📅 上月資料/ข้อมูลเดือนที่แล้ว" }
            ],
            [
                { text: "🔙 返回主選單/กลับเมนูหลัก" }
            ]
        ],
        resize_keyboard: true
    };
}

// 處理 /start 命令
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `👋 歡迎使用活動追蹤機器人！
請選擇您要開始的活動，或查看統計數據。

ยินดีต้อนรับสู่บอทติดตามกิจกรรม!
กรุณาเลือกกิจกรรมที่ต้องการเริ่มต้น หรือดูสถิติ`;
    
    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: getMainKeyboard()
    });
});

// 處理文字訊息
bot.on('message', (msg) => {
    if (msg.text.startsWith('/')) return; // 跳過命令
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userFullName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
    const text = msg.text;
    
    // 返回主選單
    if (text.includes('返回主選單') || text.includes('กลับเมนูหลัก')) {
        bot.sendMessage(chatId, '🏠 返回主選單/กลับเมนูหลัก', {
            reply_markup: getMainKeyboard()
        });
        return;
    }
    
    // 統計選單
    if (text === '📊 統計數據/สถิติ') {
        bot.sendMessage(chatId, '📊 請選擇要查看的統計時間範圍/เลือกช่วงเวลาที่ต้องการดูสถิติ', {
            reply_markup: getStatisticsKeyboard()
        });
        return;
    }
    
    // 處理統計查詢
    if (text.startsWith('📅')) {
        let timeRange = null;
        if (text.includes('本日') || text.includes('วันนี้')) timeRange = 'today';
        else if (text.includes('昨日') || text.includes('เมื่อวาน')) timeRange = 'yesterday';
        else if (text.includes('本週') || text.includes('สัปดาห์นี้')) timeRange = 'this_week';
        else if (text.includes('上週') || text.includes('สัปดาห์ที่แล้ว')) timeRange = 'last_week';
        else if (text.includes('本月') || text.includes('เดือนนี้')) timeRange = 'this_month';
        else if (text.includes('上月') || text.includes('เดือนที่แล้ว')) timeRange = 'last_month';
        
        if (timeRange) {
            const records = getStatistics(timeRange, chatId);
            const report = generateReport(records, timeRange);
            bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
        }
        return;
    }
    
    // 檢查是否有進行中的活動
    const ongoingActivity = getOngoingActivity(userId, chatId);
    
    // 處理活動開始
    if (text.includes('上廁所') || text.includes('เข้าห้องน้ำ')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        startActivity(userId, chatId, '上廁所', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄上廁所時間/เริ่มบันทึกเวลาเข้าห้องน้ำ');
    }
    else if (text.includes('抽菸') || text.includes('สูบบุหรี่')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        startActivity(userId, chatId, '抽菸', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄抽菸時間/เริ่มบันทึกเวลาสูบบุหรี่');
    }
    else if (text.includes('大便 (10分鐘)') || text.includes('อึ10นาที')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        startActivity(userId, chatId, '大便10', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄大便時間/เริ่มบันทึกเวลาอึ');
    }
    else if (text.includes('大便 (15分鐘)') || text.includes('อึ15นาที')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        startActivity(userId, chatId, '大便15', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄大便時間/เริ่มบันทึกเวลาอึ');
    }
    else if (text.includes('使用手機') || text.includes('ใช้มือถือ')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        startActivity(userId, chatId, '使用手機', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄使用手機時間/เริ่มบันทึกเวลาใช้มือถือ');
    }
    else if (text.includes('我回來了') || text.includes('ฉันกลับมาแล้ว')) {
        const result = stopActivity(userId, chatId);
        if (result.success) {
            const duration = formatDuration(result.duration);
            const overtime = formatDuration(result.overtime);
            
            let response = `✅ 已記錄 ${result.activity} 時間/บันทึกเวลา ${result.activity}:\\n`;
            response += `⏱ 總時間/รวมเวลา: ${duration.zh} (${duration.th})`;
            
            if (result.overtime > 0) {
                response += `\\n⚠️ 超時/เกินเวลา: ${overtime.zh} (${overtime.th})`;
            }
            
            bot.sendMessage(chatId, response);
        } else {
            bot.sendMessage(chatId, '❌ 沒有進行中的活動/ไม่มีกิจกรรมที่กำลังดำเนินอยู่');
        }
    }
});

// 錯誤處理
bot.on('error', (error) => {
    console.error('🚨 Bot 錯誤:', error);
});

// 啟動
function startBot() {
    console.log('🚀 正在啟動雙語活動追蹤機器人...');
    
    // 初始化資料庫
    initDatabase();
    
    if (config.token === 'YOUR_BOT_TOKEN_HERE') {
        console.log('⚠️  請設定 TELEGRAM_BOT_TOKEN');
    } else {
        console.log('✅ 雙語機器人已啟動！');
        console.log('🗣️  支援語言: 中文 + 泰文');
        console.log('📊 統計功能: 本日/昨日/本週/上週/本月/上月');
        console.log('⏰ 超時檢測: 已啟用');
    }
}

// 啟動機器人
startBot();