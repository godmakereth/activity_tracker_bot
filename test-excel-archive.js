/**
 * 測試 Excel 自動存檔功能
 */
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// 載入資料
const dataPath = './data/activities.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('📊 測試 Excel 存檔功能');
console.log('===============================');

// 獲取今天的日期
const today = moment().tz('Asia/Taipei');
const targetDate = today.format('YYYY-MM-DD');
console.log(`📅 目標日期: ${targetDate}`);

// 設置時間範圍
const startDate = moment.tz(targetDate, 'Asia/Taipei').startOf('day').toDate();
const endDate = moment.tz(targetDate, 'Asia/Taipei').endOf('day').toDate();
console.log(`⏰ 時間範圍: ${startDate.toISOString()} 到 ${endDate.toISOString()}`);

console.log('\n📋 群組清單:');
data.chat_settings.forEach((chat, index) => {
    console.log(`${index + 1}. ${chat.chat_title} (ID: ${chat.chat_id})`);
});

console.log('\n📊 各群組今日活動統計:');
data.chat_settings.forEach(chat => {
    const chatId = chat.chat_id;
    const chatTitle = chat.chat_title;
    
    // 過濾今日該群組的活動
    const todayActivities = data.activities.filter(activity => {
        const activityDate = new Date(activity.start_time);
        return activity.chat_id === chatId && 
               activityDate >= startDate && 
               activityDate <= endDate;
    });
    
    console.log(`\n🏢 ${chatTitle} (${chatId}):`);
    console.log(`   📈 活動數量: ${todayActivities.length}`);
    
    if (todayActivities.length > 0) {
        const users = [...new Set(todayActivities.map(a => a.user_full_name))];
        console.log(`   👥 參與用戶: ${users.join(', ')}`);
        console.log(`   ✅ 應該產生檔案`);
    } else {
        console.log(`   ⚠️  無活動數據，會跳過存檔`);
    }
});

console.log('\n📁 檢查現有存檔:');
const archivePath = './archives/excel';
if (fs.existsSync(archivePath)) {
    const year = today.format('YYYY');
    const month = today.format('MM');
    const yearPath = path.join(archivePath, year);
    const monthPath = path.join(yearPath, month);
    
    if (fs.existsSync(monthPath)) {
        const files = fs.readdirSync(monthPath);
        console.log(`📄 ${monthPath} 中的檔案:`);
        files.forEach(file => {
            if (file.includes(targetDate)) {
                console.log(`   ✅ ${file}`);
            }
        });
    } else {
        console.log(`📁 目錄不存在: ${monthPath}`);
    }
} else {
    console.log(`📁 存檔目錄不存在: ${archivePath}`);
}