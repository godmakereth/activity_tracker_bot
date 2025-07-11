/**
 * 演示腳本 - 不需要真實 Telegram Bot Token
 * 測試核心功能和資料庫操作
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 測試配置
const config = {
    dbPath: 'demo_activities.db',
    reportsDir: 'demo_reports'
};

// 初始化演示資料庫
function initDemoDatabase() {
    const db = new sqlite3.Database(config.dbPath);
    
    db.serialize(() => {
        // 創建表
        db.run(`CREATE TABLE IF NOT EXISTS activities (
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
        
        db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
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
    });
    
    console.log('✅ 演示資料庫初始化完成');
    return db;
}

// 創建測試數據
function createTestData(db) {
    console.log('📝 正在創建測試數據...');
    
    // 測試使用者和聊天室
    const users = [
        { id: 'user001', name: '張小明' },
        { id: 'user002', name: '李小華' },
        { id: 'user003', name: '王小美' },
        { id: 'user004', name: '陳大雄' }
    ];
    
    const chats = [
        { id: 'chat001', title: '辦公室' },
        { id: 'chat002', title: '開發團隊' }
    ];
    
    const activityTypes = ['toilet', 'smoke', 'phone', 'break'];
    
    // 生成今日活動數據
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let activityId = 1;
    
    // 為每個聊天室生成活動
    chats.forEach(chat => {
        users.forEach(user => {
            // 每個使用者隨機生成 2-5 個活動
            const numActivities = Math.floor(Math.random() * 4) + 2;
            
            for (let i = 0; i < numActivities; i++) {
                const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
                
                // 隨機時間 (今天 8:00 - 18:00)
                const hour = Math.floor(Math.random() * 10) + 8;
                const minute = Math.floor(Math.random() * 60);
                
                const startTime = new Date(today);
                startTime.setHours(hour, minute, 0, 0);
                
                // 隨機持續時間 (30秒 - 20分鐘)
                const duration = Math.floor(Math.random() * 1200) + 30;
                
                const endTime = new Date(startTime.getTime() + duration * 1000);
                
                // 插入活動記錄
                db.run(`
                    INSERT INTO activities 
                    (user_id, user_name, chat_id, chat_title, activity_type, start_time, end_time, duration, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
                `, [user.id, user.name, chat.id, chat.title, activityType, 
                    startTime.toISOString(), endTime.toISOString(), duration]);
                
                activityId++;
            }
        });
    });
    
    console.log(`✅ 創建了 ${activityId - 1} 個測試活動`);
}

// 生成演示報告
async function generateDemoReport(db, chatId) {
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
                resolve(null);
                return;
            }
            
            const report = formatDemoReport(rows, today);
            saveDemoReportToFile(chatId, today, report, rows[0].chat_title);
            resolve(report);
        });
    });
}

// 格式化演示報告
function formatDemoReport(data, date) {
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
    const activityNames = {
        'toilet': '上廁所',
        'smoke': '抽菸',
        'phone': '使用手機',
        'break': '休息'
    };
    
    data.forEach(row => {
        const activityName = activityNames[row.activity_type] || row.activity_type;
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
        
        const activityName = activityNames[row.activity_type] || row.activity_type;
        userStats[row.user_name].activities[activityName] = row.count;
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
            const productivityScore = stats.totalCount * 10;
            report += `${medal} ${userName}\n`;
            report += `   - 活動次數: ${stats.totalCount}\n`;
            report += `   - 總時間: ${formatDuration(stats.totalDuration)}\n`;
            report += `   - 生產力評分: ${productivityScore}\n\n`;
        });
    
    // 結語
    report += '='.repeat(60) + '\n';
    report += `📝 報告生成時間: ${new Date().toLocaleString('zh-TW')}\n`;
    report += '🤖 由 Node.js 活動追蹤機器人自動生成\n';
    
    return report;
}

// 格式化時間
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0秒';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (hours > 0) result += `${hours}小時`;
    if (minutes > 0) result += `${minutes}分鐘`;
    if (secs > 0 || result === '') result += `${secs}秒`;
    
    return result;
}

// 保存演示報告到文件
function saveDemoReportToFile(chatId, date, report, chatTitle) {
    const chatDir = path.join(config.reportsDir, chatTitle || chatId);
    
    // 確保目錄存在
    if (!fs.existsSync(chatDir)) {
        fs.mkdirSync(chatDir, { recursive: true });
    }
    
    const filename = `${date}_daily_report.txt`;
    const filepath = path.join(chatDir, filename);
    
    fs.writeFileSync(filepath, report, 'utf8');
    console.log(`📄 演示報告已保存: ${filepath}`);
}

// 主演示函數
async function runDemo() {
    console.log('🎭 Node.js 活動追蹤機器人演示');
    console.log('='.repeat(60));
    console.log('💡 這個演示展示了核心功能，不需要真實的 Telegram Bot Token');
    console.log();
    
    try {
        // 初始化資料庫
        const db = initDemoDatabase();
        
        // 創建測試數據
        createTestData(db);
        
        // 等待數據插入完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 生成報告
        console.log('\n📊 正在生成演示報告...');
        
        const chatIds = ['chat001', 'chat002'];
        const reports = [];
        
        for (const chatId of chatIds) {
            const report = await generateDemoReport(db, chatId);
            if (report) {
                reports.push({ chatId, report });
            }
        }
        
        // 顯示報告
        console.log('\n📋 報告生成完成！');
        console.log(`✅ 共生成 ${reports.length} 個聊天室的報告`);
        
        // 顯示第一個報告的預覽
        if (reports.length > 0) {
            console.log('\n📄 報告內容預覽 (第一個聊天室):');
            console.log('='.repeat(60));
            const preview = reports[0].report.substring(0, 800);
            console.log(preview + (reports[0].report.length > 800 ? '...' : ''));
            console.log('='.repeat(60));
        }
        
        // 檢查文件結構
        console.log('\n📁 檢查文件結構:');
        if (fs.existsSync(config.reportsDir)) {
            const chatDirs = fs.readdirSync(config.reportsDir);
            chatDirs.forEach(chatDir => {
                const chatPath = path.join(config.reportsDir, chatDir);
                if (fs.statSync(chatPath).isDirectory()) {
                    console.log(`📂 ${chatDir}/`);
                    const files = fs.readdirSync(chatPath);
                    files.forEach(file => {
                        const filePath = path.join(chatPath, file);
                        const stats = fs.statSync(filePath);
                        console.log(`   📄 ${file} (${stats.size} bytes)`);
                    });
                }
            });
        }
        
        // 資料庫統計
        console.log('\n📊 資料庫統計:');
        db.get('SELECT COUNT(*) as count FROM activities', (err, row) => {
            if (!err) {
                console.log(`   • 總活動記錄: ${row.count} 筆`);
            }
        });
        
        db.get('SELECT COUNT(DISTINCT user_name) as count FROM activities', (err, row) => {
            if (!err) {
                console.log(`   • 活躍使用者: ${row.count} 人`);
            }
        });
        
        db.get('SELECT COUNT(DISTINCT chat_id) as count FROM activities', (err, row) => {
            if (!err) {
                console.log(`   • 聊天室數量: ${row.count} 個`);
            }
        });
        
        console.log('\n🎯 功能展示完成！');
        console.log('\n💡 接下來您可以：');
        console.log('1. 檢查 demo_reports/ 目錄中的生成文件');
        console.log('2. 查看 demo_activities.db 資料庫');
        console.log('3. 設定真實的 Bot Token 來運行完整功能');
        console.log('4. 使用 npm start 啟動機器人');
        
        // 關閉資料庫
        db.close();
        
    } catch (error) {
        console.error('❌ 演示失敗:', error);
    }
}

// 如果直接運行此文件
if (require.main === module) {
    runDemo();
}

module.exports = { runDemo };