/**
 * 功能完整的雙語活動追蹤機器人
 * 重構版本，保持與 Python 版本相同的功能
 */

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');

// 檢查 Token
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN 環境變數未設置');
    process.exit(1);
}

console.log('🚀 啟動功能完整的雙語活動追蹤機器人...');
console.log('✅ 支援中文+泰文雙語');
console.log('✅ 完整統計功能');
console.log('✅ 超時檢測');
console.log('✅ 歷史記錄');

// 初始化 Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// 活動限制時間（秒）
const ACTIVITY_LIMITS = {
    '上廁所': 6 * 60,
    '抽菸': 5 * 60,
    '大便10': 10 * 60,
    '大便15': 15 * 60,
    '使用手機': 10 * 60
};

// 活動類型映射（雙語）
const ACTIVITY_MAPPING = {
    '🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)': '上廁所',
    '🚬 抽菸 (5分鐘)/สูบบุหรี่': '抽菸',
    '💩 大便 (10分鐘)/อึ10นาที': '大便10',
    '💩 大便 (15分鐘)/อึ15นาที': '大便15',
    '📱 使用手機 (10分鐘)/ใช้มือถือ': '使用手機'
};

// 活動表情符號
const ACTIVITY_EMOJIS = {
    '上廁所': '🚽',
    '抽菸': '🚬',
    '大便10': '💩',
    '大便15': '💩',
    '使用手機': '📱'
};

// 內存存儲
const activities = new Map(); // 已完成的活動
const ongoing = new Map();    // 進行中的活動

// 時間格式化（雙語）
function formatDurationBilingual(totalSeconds) {
    if (!totalSeconds || totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const chi_format = `${minutes} 分 ${seconds} 秒`;
    const tha_format = `${minutes} นาที ${seconds} วินาที`;
    return { chinese: chi_format, thai: tha_format };
}

// 生成主選單鍵盤
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

// 生成統計選單鍵盤
function getStatsKeyboard() {
    return {
        keyboard: [
            [{ text: "📅 本日紀錄/บันทึกวันนี้" }],
            [{ text: "📅 昨日紀錄/บันทึกเมื่อวาน" }],
            [{ text: "📅 本週紀錄/บันทึกสัปดาห์นี้" }],
            [{ text: "📅 上週紀錄/บันทึกสัปดาห์ที่แล้ว" }],
            [{ text: "📅 本月紀錄/บันทึกเดือนนี้" }],
            [{ text: "📅 上月紀錄/บันทึกเดือนที่แล้ว" }],
            [{ text: "🔙 返回主選單/กลับเมนูหลัก" }]
        ],
        resize_keyboard: true
    };
}

// 開始活動
async function startActivity(userId, userName, userFullName, chatId, activityType) {
    const userKey = `${userId}_${chatId}`;
    
    // 檢查是否已有進行中的活動
    if (ongoing.has(userKey)) {
        const current = ongoing.get(userKey);
        const duration = Math.floor((Date.now() - current.startTime) / 1000);
        const formatted = formatDurationBilingual(duration);
        
        return {
            success: false,
            message: `⚠️ 您已有進行中的活動：${ACTIVITY_EMOJIS[current.activity]} ${current.activity}\n` +
                    `已進行時間：${formatted.chinese}\n` +
                    `กิจกรรมที่กำลังดำเนินการ: ${ACTIVITY_EMOJIS[current.activity]} ${current.activity}\n` +
                    `เวลาที่ใช้ไป: ${formatted.thai}\n\n` +
                    `請先完成目前的活動/กรุณาทำกิจกรรมปัจจุบันให้เสร็จก่อน`
        };
    }
    
    // 開始新活動
    const activityData = {
        userId,
        userName,
        userFullName,
        chatId,
        activity: activityType,
        startTime: Date.now(),
        createdAt: new Date()
    };
    
    ongoing.set(userKey, activityData);
    
    const limit = ACTIVITY_LIMITS[activityType];
    const limitFormatted = formatDurationBilingual(limit);
    
    return {
        success: true,
        message: `✅ 開始 ${ACTIVITY_EMOJIS[activityType]} ${activityType}\n` +
                `預期時間：${limitFormatted.chinese}\n` +
                `開始時間：${new Date().toLocaleTimeString()}\n\n` +
                `เริ่มต้น ${ACTIVITY_EMOJIS[activityType]} ${activityType}\n` +
                `เวลาที่คาดหวัง: ${limitFormatted.thai}\n` +
                `เวลาเริ่มต้น: ${new Date().toLocaleTimeString()}\n\n` +
                `💡 使用「我回來了」完成活動\n💡 ใช้ "ฉันกลับมาแล้ว" เพื่อทำกิจกรรมให้เสร็จ`
    };
}

// 完成活動
async function completeActivity(userId, chatId) {
    const userKey = `${userId}_${chatId}`;
    
    if (!ongoing.has(userKey)) {
        return {
            success: false,
            message: `❌ 您沒有進行中的活動\n❌ คุณไม่มีกิจกรรมที่กำลังดำเนินการ`
        };
    }
    
    const current = ongoing.get(userKey);
    const endTime = Date.now();
    const duration = Math.floor((endTime - current.startTime) / 1000);
    const limit = ACTIVITY_LIMITS[current.activity];
    const overtime = Math.max(0, duration - limit);
    
    // 移到已完成活動
    const activityKey = `${userId}_${chatId}_${Date.now()}`;
    activities.set(activityKey, {
        ...current,
        endTime,
        duration,
        overtime,
        overtimeFlag: overtime > 0
    });
    
    ongoing.delete(userKey);
    
    const durationFormatted = formatDurationBilingual(duration);
    const limitFormatted = formatDurationBilingual(limit);
    
    let message = `🎉 完成 ${ACTIVITY_EMOJIS[current.activity]} ${current.activity}！\n` +
                 `用時：${durationFormatted.chinese}\n` +
                 `預期：${limitFormatted.chinese}\n\n` +
                 `เสร็จสิ้น ${ACTIVITY_EMOJIS[current.activity]} ${current.activity}!\n` +
                 `เวลาที่ใช้: ${durationFormatted.thai}\n` +
                 `เวลาที่คาดหวัง: ${limitFormatted.thai}\n`;
    
    if (overtime > 0) {
        const overtimeFormatted = formatDurationBilingual(overtime);
        message += `\n⚠️ 超時：${overtimeFormatted.chinese}\n` +
                  `เกินเวลา: ${overtimeFormatted.thai}`;
    } else {
        message += `\n✅ 在時間內完成！\nเสร็จในเวลาที่กำหนด!`;
    }
    
    return {
        success: true,
        message
    };
}

// 獲取統計數據
async function getStatistics(chatId, timeRange = 'today') {
    const now = new Date();
    let startTime, endTime;
    
    switch (timeRange) {
        case 'today':
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'yesterday':
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'this_week':
            const dayOfWeek = now.getDay();
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
            endTime = new Date();
            break;
        case 'last_week':
            const lastWeekDay = now.getDay();
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay - 7);
            endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay);
            break;
        case 'this_month':
            startTime = new Date(now.getFullYear(), now.getMonth(), 1);
            endTime = new Date();
            break;
        case 'last_month':
            startTime = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endTime = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        default:
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endTime = new Date();
    }
    
    // 過濾指定時間範圍和聊天室的活動
    const filteredActivities = Array.from(activities.values()).filter(activity => {
        const activityTime = new Date(activity.endTime);
        return activity.chatId == chatId && 
               activityTime >= startTime && 
               activityTime < endTime;
    });
    
    if (filteredActivities.length === 0) {
        return {
            hasData: false,
            message: "📊 該時段沒有記錄\nไม่มีข้อมูลในช่วงเวลานี้"
        };
    }
    
    // 按用戶分組統計
    const userStats = {};
    
    filteredActivities.forEach(activity => {
        const userName = activity.userFullName || activity.userName;
        if (!userStats[userName]) {
            userStats[userName] = {
                totalCount: 0,
                totalDuration: 0,
                totalOvertime: 0,
                totalOvertimeCount: 0,
                activities: {}
            };
        }
        
        const stats = userStats[userName];
        const activityType = activity.activity;
        
        // 更新總計
        stats.totalCount++;
        stats.totalDuration += activity.duration;
        stats.totalOvertime += activity.overtime;
        if (activity.overtime > 0) stats.totalOvertimeCount++;
        
        // 更新活動統計
        if (!stats.activities[activityType]) {
            stats.activities[activityType] = {
                count: 0,
                duration: 0,
                overtime: 0,
                overtimeCount: 0
            };
        }
        
        const activityStats = stats.activities[activityType];
        activityStats.count++;
        activityStats.duration += activity.duration;
        activityStats.overtime += activity.overtime;
        if (activity.overtime > 0) activityStats.overtimeCount++;
    });
    
    // 構建報告
    let report = "📊 群組統計報告/รายงานสถิติกลุ่ม\n\n";
    
    for (const [userName, stats] of Object.entries(userStats)) {
        report += `👤 ${userName}\n`;
        report += `📈 總計/รวม:\n`;
        report += `   🔢 總次數: ${stats.totalCount} (ครั้ง)\n`;
        
        const totalDurationFormatted = formatDurationBilingual(stats.totalDuration);
        report += `   ⏱️ 總時間: ${totalDurationFormatted.chinese} (รวม: ${totalDurationFormatted.thai})\n`;
        
        if (stats.totalOvertime > 0) {
            const totalOvertimeFormatted = formatDurationBilingual(stats.totalOvertime);
            report += `   ⚠️ 總超時: ${totalOvertimeFormatted.chinese} (เกินเวลา: ${totalOvertimeFormatted.thai})\n`;
            report += `   ❌ 超時次數: ${stats.totalOvertimeCount} 次 (ครั้งที่เกินเวลา)\n`;
        }
        
        report += `\n📊 活動明細/รายละเอียดกิจกรรม:\n`;
        
        for (const [activityType, activityStats] of Object.entries(stats.activities)) {
            const emoji = ACTIVITY_EMOJIS[activityType] || '📝';
            report += `   ${emoji} ${activityType}:\n`;
            report += `     🔢 次數: ${activityStats.count} (ครั้ง)\n`;
            
            const durationFormatted = formatDurationBilingual(activityStats.duration);
            report += `     ⏱️ 時間: ${durationFormatted.chinese} (รวม: ${durationFormatted.thai})\n`;
            
            if (activityStats.overtime > 0) {
                const overtimeFormatted = formatDurationBilingual(activityStats.overtime);
                report += `     ⚠️ 超時: ${overtimeFormatted.chinese} (เกินเวลา: ${overtimeFormatted.thai})\n`;
                report += `     ❌ 超時次數: ${activityStats.overtimeCount} 次 (ครั้งที่เกินเวลา)\n`;
            }
            report += `\n`;
        }
        report += `\n`;
    }
    
    return {
        hasData: true,
        message: report
    };
}

// 處理 /start 命令
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    const welcomeMessage = `👋 歡迎使用活動追蹤機器人！
請選擇您要開始的活動，或查看統計數據。

ยินดีต้อนรับสู่บอทติดตามกิจกรรม!
กรุณาเลือกกิจกรรมที่ต้องการเริ่มต้น หรือดูสถิติ

🎯 **重構版本特點：**
✅ 雙語支援 (中文+泰文)
✅ 完整統計功能
✅ 超時檢測和警告
✅ 歷史記錄查詢
✅ 安全的環境變數管理`;
    
    await bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: getMainKeyboard(),
        parse_mode: 'Markdown'
    });
});

// 處理文字訊息
bot.on('message', async (msg) => {
    if (!msg.text) return;
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || msg.from.username || 'Unknown';
    const userFullName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || userName;
    const text = msg.text;
    
    try {
        // 活動開始
        if (ACTIVITY_MAPPING[text]) {
            const activityType = ACTIVITY_MAPPING[text];
            const result = await startActivity(userId, userName, userFullName, chatId, activityType);
            await bot.sendMessage(chatId, result.message);
            
        // 完成活動
        } else if (text === '✅ 我回來了/ฉันกลับมาแล้ว') {
            const result = await completeActivity(userId, chatId);
            await bot.sendMessage(chatId, result.message);
            
        // 統計選單
        } else if (text === '📊 統計數據/สถิติ') {
            await bot.sendMessage(chatId, '📊 請選擇要查看的統計時間範圍/เลือกช่วงเวลาที่ต้องการดูสถิติ', {
                reply_markup: getStatsKeyboard()
            });
            
        // 返回主選單
        } else if (text === '🔙 返回主選單/กลับเมนูหลัก') {
            await bot.sendMessage(chatId, '🏠 返回主選單/กลับสู่เมนูหลัก', {
                reply_markup: getMainKeyboard()
            });
            
        // 統計查詢
        } else if (text.startsWith('📅')) {
            let timeRange = 'today';
            
            if (text.includes('本日') || text.includes('วันนี้')) {
                timeRange = 'today';
            } else if (text.includes('昨日') || text.includes('เมื่อวาน')) {
                timeRange = 'yesterday';
            } else if (text.includes('本週') || text.includes('สัปดาห์นี้')) {
                timeRange = 'this_week';
            } else if (text.includes('上週') || text.includes('สัปดาห์ที่แล้ว')) {
                timeRange = 'last_week';
            } else if (text.includes('本月') || text.includes('เดือนนี้')) {
                timeRange = 'this_month';
            } else if (text.includes('上月') || text.includes('เดือนที่แล้ว')) {
                timeRange = 'last_month';
            }
            
            const stats = await getStatistics(chatId, timeRange);
            await bot.sendMessage(chatId, stats.message);
        }
        
    } catch (error) {
        console.error('處理訊息錯誤:', error);
        await bot.sendMessage(chatId, 
            '❌ 處理請求時發生錯誤\n❌ เกิดข้อผิดพลาดในการประมวลผลคำขอ'
        );
    }
});

// 錯誤處理
bot.on('error', (error) => {
    console.error('Bot 錯誤:', error);
});

bot.on('polling_error', (error) => {
    console.error('Polling 錯誤:', error.message);
});

// 優雅退出
process.on('SIGINT', () => {
    console.log('\n🛑 收到退出信號，正在關閉機器人...');
    bot.stopPolling();
    console.log('✅ 機器人已停止');
    process.exit(0);
});

console.log('🤖 雙語活動追蹤機器人已啟動！');
console.log('📋 發送 /start 開始使用');
console.log('🌏 支援中文+泰文雙語界面');
console.log('📊 具備完整統計功能');
console.log('⏰ 支援超時檢測');
console.log('');
console.log('✅ 功能完整版本運行中！');