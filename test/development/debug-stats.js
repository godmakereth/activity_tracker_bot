// 調試統計功能
const moment = require('moment-timezone');

// 模擬讀取活動資料
const activities = [
    {
        "id": 31,
        "user_id": "6457224485",
        "chat_id": "-1002512140773",
        "activity_type": "smoking",
        "start_time": "2025-07-11T11:02:50.189Z",
        "end_time": "2025-07-11T11:13:02.505Z",
        "duration": 612,
        "overtime": 312,
        "user_full_name": "KING🦴",
        "chat_title": "RG主控制 自動推播",
        "status": "overtime",
        "created_at": "2025-07-11T11:13:02.505Z",
        "updated_at": "2025-07-11T11:13:02.505Z"
    }
];

const today = moment().tz('Asia/Taipei').format('YYYY-MM-DD');
console.log('今日日期:', today);

const todayActivities = activities.filter(activity => {
    console.log('活動開始時間:', activity.start_time);
    console.log('是否以今日開始:', activity.start_time.startsWith(today));
    console.log('活動狀態:', activity.status);
    return activity.chat_id === '-1002512140773' && 
           activity.start_time.startsWith(today) &&
           (activity.status === 'completed' || activity.status === 'overtime');
});

console.log('篩選後的活動:', todayActivities);
console.log('超時活動數量:', todayActivities.filter(a => a.overtime > 0).length);