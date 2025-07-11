/**
 * 雙語活動追蹤機器人 (中文+泰文) - JSON 版本
 * 使用 JSON 文件儲存，避免編譯問題
 */

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// 安全配置 - 移除硬編碼Token
const config = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    dataFile: 'activities.json',
    ongoingFile: 'ongoing.json',
    reportsDir: 'reports'
};

// 驗證必要的環境變數
if (!config.token) {
    console.error('❌ TELEGRAM_BOT_TOKEN 環境變數未設置');
    console.error('請創建 .env 文件或設置環境變數');
    process.exit(1);
}

// 初始化
const bot = new TelegramBot(config.token, {polling: true});

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
    '上廁所': { name_zh: '上廁所', name_th: 'เข้าห้องน้ำ', emoji: '🚽', limit: 6 * 60 },
    '抽菸': { name_zh: '抽菸', name_th: 'สูบบุหรี่', emoji: '🚬', limit: 5 * 60 },
    '大便10': { name_zh: '大便', name_th: 'อึ', emoji: '💩', limit: 10 * 60 },
    '大便15': { name_zh: '大便', name_th: 'อึ', emoji: '💩', limit: 15 * 60 },
    '使用手機': { name_zh: '使用手機', name_th: 'ใช้มือถือ', emoji: '📱', limit: 10 * 60 }
};

// 資料庫操作函數
class JsonDatabase {
    constructor() {
        this.initFiles();
    }

    initFiles() {
        // 初始化活動記錄檔案
        if (!fs.existsSync(config.dataFile)) {
            fs.writeFileSync(config.dataFile, JSON.stringify([], null, 2));
        }
        
        // 初始化進行中活動檔案
        if (!fs.existsSync(config.ongoingFile)) {
            fs.writeFileSync(config.ongoingFile, JSON.stringify({}, null, 2));
        }
        
        console.log('✅ JSON 資料庫初始化完成');
    }

    // 讀取活動記錄
    getActivities() {
        try {
            const data = fs.readFileSync(config.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ 讀取活動記錄失敗:', error);
            return [];
        }
    }

    // 儲存活動記錄
    saveActivities(activities) {
        try {
            fs.writeFileSync(config.dataFile, JSON.stringify(activities, null, 2));
            return true;
        } catch (error) {
            console.error('❌ 儲存活動記錄失敗:', error);
            return false;
        }
    }

    // 讀取進行中的活動
    getOngoingActivities() {
        try {
            const data = fs.readFileSync(config.ongoingFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ 讀取進行中活動失敗:', error);
            return {};
        }
    }

    // 儲存進行中的活動
    saveOngoingActivities(ongoing) {
        try {
            fs.writeFileSync(config.ongoingFile, JSON.stringify(ongoing, null, 2));
            return true;
        } catch (error) {
            console.error('❌ 儲存進行中活動失敗:', error);
            return false;
        }
    }

    // 獲取用戶的進行中活動
    getOngoingActivity(userId, chatId) {
        const ongoing = this.getOngoingActivities();
        const key = `${userId}_${chatId}`;
        return ongoing[key] || null;
    }

    // 開始活動
    startActivity(userId, chatId, activity, userFullName) {
        const ongoing = this.getOngoingActivities();
        const key = `${userId}_${chatId}`;
        
        ongoing[key] = {
            activity: activity,
            start_time: new Date().toISOString(),
            user_full_name: userFullName
        };
        
        return this.saveOngoingActivities(ongoing);
    }

    // 結束活動
    stopActivity(userId, chatId) {
        const ongoing = this.getOngoingActivities();
        const key = `${userId}_${chatId}`;
        
        if (!ongoing[key]) {
            return { success: false, message: '沒有進行中的活動' };
        }
        
        const activity = ongoing[key];
        const endTime = new Date();
        const startTime = new Date(activity.start_time);
        const duration = Math.floor((endTime - startTime) / 1000);
        
        // 計算超時
        const limit = ACTIVITY_LIMITS[activity.activity] || 300;
        const overtime = Math.max(0, duration - limit);
        
        // 新增活動記錄
        const activities = this.getActivities();
        activities.push({
            id: Date.now(),
            user_id: userId,
            chat_id: chatId,
            activity: activity.activity,
            start_time: activity.start_time,
            end_time: endTime.toISOString(),
            duration: duration,
            overtime: overtime,
            user_full_name: activity.user_full_name,
            created_at: new Date().toISOString()
        });
        
        // 儲存活動記錄
        this.saveActivities(activities);
        
        // 刪除進行中的活動
        delete ongoing[key];
        this.saveOngoingActivities(ongoing);
        
        return {
            success: true,
            activity: activity.activity,
            duration: duration,
            overtime: overtime
        };
    }

    // 獲取統計數據
    getStatistics(timeRange, chatId) {
        const activities = this.getActivities();
        const now = new Date();
        
        // 篩選時間範圍
        const filtered = activities.filter(activity => {
            if (activity.chat_id !== chatId) return false;
            
            const activityDate = new Date(activity.start_time);
            
            switch (timeRange) {
                case 'today':
                    return activityDate.toDateString() === now.toDateString();
                case 'yesterday':
                    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    return activityDate.toDateString() === yesterday.toDateString();
                case 'this_week':
                    const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
                    return activityDate >= weekStart;
                case 'last_week':
                    const lastWeekStart = new Date(now.getTime() - ((now.getDay() + 7) * 24 * 60 * 60 * 1000));
                    const lastWeekEnd = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
                    return activityDate >= lastWeekStart && activityDate < lastWeekEnd;
                case 'this_month':
                    return activityDate.getMonth() === now.getMonth() && activityDate.getFullYear() === now.getFullYear();
                case 'last_month':
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    return activityDate.getMonth() === lastMonth.getMonth() && activityDate.getFullYear() === lastMonth.getFullYear();
                default:
                    return false;
            }
        });
        
        // 按用戶和活動分組統計
        const stats = {};
        filtered.forEach(activity => {
            const key = `${activity.user_full_name}_${activity.activity}`;
            if (!stats[key]) {
                stats[key] = {
                    user_full_name: activity.user_full_name,
                    activity: activity.activity,
                    count: 0,
                    total_duration: 0,
                    total_overtime: 0,
                    overtime_count: 0
                };
            }
            
            stats[key].count++;
            stats[key].total_duration += activity.duration;
            stats[key].total_overtime += activity.overtime;
            if (activity.overtime > 0) {
                stats[key].overtime_count++;
            }
        });
        
        return Object.values(stats);
    }
}

// 初始化資料庫
const db = new JsonDatabase();

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
    let report = "📊 群組統計報告/รายงานสถิติกลุ่ม\n\n";
    
    for (const [userName, stats] of Object.entries(userStats)) {
        const totalDuration = formatDuration(stats.total_duration);
        const totalOvertime = formatDuration(stats.total_overtime);
        
        report += `👤 ${userName}\n`;
        report += `📈 總計/รวม:\n`;
        report += `   🔢 總次數: ${stats.total_count} (ครั้ง)\n`;
        report += `   ⏱️ 總時間: ${totalDuration.zh} (${totalDuration.th})\n`;
        report += `   ⚠️ 總超時: ${totalOvertime.zh} (${totalOvertime.th})\n`;
        report += `   ❌ 超時次數: ${stats.total_overtime_count} 次 (ครั้งที่เกินเวลา)\n\n`;
        
        report += "📊 活動明細/รายละเอียดกิจกรรม:\n";
        for (const [activity, activityStats] of Object.entries(stats.activities)) {
            const activityType = activityTypes[activity];
            const emoji = activityType ? activityType.emoji : '📝';
            const duration = formatDuration(activityStats.duration);
            const overtime = formatDuration(activityStats.overtime);
            
            report += `   ${emoji} ${activity}:\n`;
            report += `     🔢 次數: ${activityStats.count} (ครั้ง)\n`;
            report += `     ⏱️ 時間: ${duration.zh} (${duration.th})\n`;
            if (activityStats.overtime > 0) {
                report += `     ⚠️ 超時: ${overtime.zh} (${overtime.th})\n`;
                report += `     ❌ 超時次數: ${activityStats.overtime_count} 次 (ครั้งที่เกินเวลา)\n`;
            }
        }
        report += "\n";
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
            const records = db.getStatistics(timeRange, chatId);
            const report = generateReport(records, timeRange);
            bot.sendMessage(chatId, report);
        }
        return;
    }
    
    // 檢查是否有進行中的活動
    const ongoingActivity = db.getOngoingActivity(userId, chatId);
    
    // 處理活動開始
    if (text.includes('上廁所') || text.includes('เข้าห้องน้ำ')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        db.startActivity(userId, chatId, '上廁所', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄上廁所時間/เริ่มบันทึกเวลาเข้าห้องน้ำ');
    }
    else if (text.includes('抽菸') || text.includes('สูบบุหรี่')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        db.startActivity(userId, chatId, '抽菸', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄抽菸時間/เริ่มบันทึกเวลาสูบบุหรี่');
    }
    else if (text.includes('大便 (10分鐘)') || text.includes('อึ10นาที')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        db.startActivity(userId, chatId, '大便10', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄大便時間/เริ่มบันทึกเวลาอึ');
    }
    else if (text.includes('大便 (15分鐘)') || text.includes('อึ15นาที')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        db.startActivity(userId, chatId, '大便15', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄大便時間/เริ่มบันทึกเวลาอึ');
    }
    else if (text.includes('使用手機') || text.includes('ใช้มือถือ')) {
        if (ongoingActivity) {
            bot.sendMessage(chatId, `⚠️ 您已經在進行 '${ongoingActivity.activity}' 活動了，請先結束。\nคุณมีกิจกรรม '${ongoingActivity.activity}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`);
            return;
        }
        db.startActivity(userId, chatId, '使用手機', userFullName);
        bot.sendMessage(chatId, '✅ 已開始記錄使用手機時間/เริ่มบันทึกเวลาใช้มือถือ');
    }
    else if (text.includes('我回來了') || text.includes('ฉันกลับมาแล้ว')) {
        const result = db.stopActivity(userId, chatId);
        if (result.success) {
            const duration = formatDuration(result.duration);
            const overtime = formatDuration(result.overtime);
            
            let response = `✅ 已記錄 ${result.activity} 時間/บันทึกเวลา ${result.activity}:\n`;
            response += `⏱ 總時間/รวมเวลา: ${duration.zh} (${duration.th})`;
            
            if (result.overtime > 0) {
                response += `\n⚠️ 超時/เกินเวลา: ${overtime.zh} (${overtime.th})`;
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
    console.log('🚀 正在啟動雙語活動追蹤機器人 (JSON版)...');
    
    if (config.token === 'YOUR_BOT_TOKEN_HERE') {
        console.log('⚠️  請設定 TELEGRAM_BOT_TOKEN');
    } else {
        console.log('✅ 雙語機器人已啟動！');
        console.log('🗣️  支援語言: 中文 + 泰文');
        console.log('📊 統計功能: 本日/昨日/本週/上週/本月/上月');
        console.log('⏰ 超時檢測: 已啟用');
        console.log('💾 資料儲存: JSON 檔案');
    }
}

// 啟動機器人
startBot();