/**
 * Web 服務器模組 - 提供統計報告的網頁呈現
 */
const express = require('express');
const path = require('path');
const moment = require('moment-timezone');

class WebServer {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.server = null;
        this.activityRepository = null;
        this.chatRepository = null;
        this.reportGenerator = null;
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * 設置中間件
     */
    setupMiddleware() {
        // 靜態檔案服務
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
        
        // JSON 解析
        this.app.use(express.json());
        
        // 跨域支持
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
    }

    /**
     * 設置路由
     */
    setupRoutes() {
        // 主頁 - 統計報告首頁
        this.app.get('/', (req, res) => {
            res.send(this.generateIndexPage());
        });

        // 聊天室列表 API
        this.app.get('/api/chats', async (req, res) => {
            try {
                const chats = await this.chatRepository.findAll();
                res.json(chats);
            } catch (error) {
                console.error('獲取聊天室列表失敗:', error);
                res.status(500).json({ error: '獲取聊天室列表失敗' });
            }
        });

        // 統計數據 API
        this.app.get('/api/stats/:chatId', async (req, res) => {
            try {
                const { chatId } = req.params;
                const { period = 'today' } = req.query;
                
                const { startDate, endDate } = this.getPeriodDates(period);
                const statistics = await this.activityRepository.getStatistics(chatId, startDate, endDate);
                const chat = await this.chatRepository.findById(chatId);
                
                const report = {
                    chatId,
                    chatTitle: chat?.chatTitle || 'Unknown',
                    period,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    statistics: this.processStatistics(statistics),
                    summary: this.generateSummary(statistics)
                };
                
                res.json(report);
            } catch (error) {
                console.error('獲取統計數據失敗:', error);
                res.status(500).json({ error: '獲取統計數據失敗' });
            }
        });

        // 統計報告網頁
        this.app.get('/stats/:chatId', async (req, res) => {
            try {
                const { chatId } = req.params;
                const { period = 'today' } = req.query;
                
                const chat = await this.chatRepository.findById(chatId);
                if (!chat) {
                    return res.status(404).send('<h1>聊天室不存在</h1>');
                }
                
                res.send(this.generateStatsPage(chatId, chat.chatTitle, period));
            } catch (error) {
                console.error('生成統計頁面失敗:', error);
                res.status(500).send('<h1>生成統計頁面失敗</h1>');
            }
        });

        // 活動詳情 API (相容 SimpleDatabaseConnection)
        this.app.get('/api/activities/:chatId', async (req, res) => {
            try {
                const { chatId } = req.params;
                const { period = 'today' } = req.query;
                
                const { startDate, endDate } = this.getPeriodDates(period);
                
                // 直接讀取 JSON 數據
                const dbData = this.activityRepository.db.data;
                const activities = dbData.activities.filter(activity => {
                    const activityDate = new Date(activity.start_time);
                    return activity.chat_id === chatId && 
                           activityDate >= startDate && 
                           activityDate <= endDate;
                });
                
                res.json({
                    chatId,
                    period,
                    activities: activities.map(activity => ({
                        id: activity.id,
                        userId: activity.user_id,
                        userFullName: activity.user_full_name,
                        activityType: activity.activity_type,
                        startTime: activity.start_time,
                        endTime: activity.end_time,
                        duration: activity.duration,
                        overtime: activity.overtime,
                        status: activity.status
                    }))
                });
            } catch (error) {
                console.error('獲取活動詳情失敗:', error);
                res.status(500).json({ error: '獲取活動詳情失敗' });
            }
        });
    }

    /**
     * 設置依賴注入
     */
    setDependencies(activityRepository, chatRepository, reportGenerator) {
        this.activityRepository = activityRepository;
        this.chatRepository = chatRepository;
        this.reportGenerator = reportGenerator;
    }

    /**
     * 啟動服務器
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (err) => {
                if (err) {
                    console.error('Web 服務器啟動失敗:', err);
                    reject(err);
                } else {
                    console.log(`🌐 Web 服務器已啟動: http://localhost:${this.port}`);
                    resolve();
                }
            });
        });
    }

    /**
     * 停止服務器
     */
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('🛑 Web 服務器已停止');
                    resolve();
                });
            });
        }
    }

    /**
     * 根據時間範圍獲取日期
     */
    getPeriodDates(period) {
        const now = moment().tz('Asia/Taipei');
        let startDate, endDate;

        switch (period) {
            case 'today':
                startDate = now.clone().startOf('day').toDate();
                endDate = now.clone().endOf('day').toDate();
                break;
            case 'yesterday':
                startDate = now.clone().subtract(1, 'day').startOf('day').toDate();
                endDate = now.clone().subtract(1, 'day').endOf('day').toDate();
                break;
            case 'thisweek':
                startDate = now.clone().startOf('week').toDate();
                endDate = now.clone().endOf('week').toDate();
                break;
            case 'lastweek':
                startDate = now.clone().subtract(1, 'week').startOf('week').toDate();
                endDate = now.clone().subtract(1, 'week').endOf('week').toDate();
                break;
            case 'thismonth':
                startDate = now.clone().startOf('month').toDate();
                endDate = now.clone().endOf('month').toDate();
                break;
            case 'lastmonth':
                startDate = now.clone().subtract(1, 'month').startOf('month').toDate();
                endDate = now.clone().subtract(1, 'month').endOf('month').toDate();
                break;
            default:
                startDate = now.clone().startOf('day').toDate();
                endDate = now.clone().endOf('day').toDate();
        }

        return { startDate, endDate };
    }

    /**
     * 處理統計數據
     */
    processStatistics(statistics) {
        const userStats = {};
        const activityStats = {};

        statistics.forEach(stat => {
            // 按用戶分組
            if (!userStats[stat.userFullName]) {
                userStats[stat.userFullName] = {
                    totalCount: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    activities: {}
                };
            }
            
            const userStat = userStats[stat.userFullName];
            userStat.totalCount += stat.count;
            userStat.totalDuration += stat.totalDuration;
            userStat.totalOvertime += stat.totalOvertime;
            userStat.activities[stat.activityType] = {
                count: stat.count,
                totalDuration: stat.totalDuration,
                totalOvertime: stat.totalOvertime,
                overtimeCount: stat.overtimeCount
            };

            // 按活動分組
            if (!activityStats[stat.activityType]) {
                activityStats[stat.activityType] = {
                    totalCount: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    users: new Set()
                };
            }
            
            const activityStat = activityStats[stat.activityType];
            activityStat.totalCount += stat.count;
            activityStat.totalDuration += stat.totalDuration;
            activityStat.totalOvertime += stat.totalOvertime;
            activityStat.users.add(stat.userFullName);
        });

        // 轉換 Set 為數量
        Object.values(activityStats).forEach(stat => {
            stat.uniqueUsers = stat.users.size;
            delete stat.users;
        });

        return { userStats, activityStats };
    }

    /**
     * 生成摘要統計
     */
    generateSummary(statistics) {
        const summary = {
            totalActivities: 0,
            totalDuration: 0,
            totalOvertime: 0,
            uniqueUsers: new Set(),
            uniqueActivities: new Set()
        };

        statistics.forEach(stat => {
            summary.totalActivities += stat.count;
            summary.totalDuration += stat.totalDuration;
            summary.totalOvertime += stat.totalOvertime;
            summary.uniqueUsers.add(stat.userFullName);
            summary.uniqueActivities.add(stat.activityType);
        });

        return {
            totalActivities: summary.totalActivities,
            totalDuration: summary.totalDuration,
            totalOvertime: summary.totalOvertime,
            uniqueUsers: summary.uniqueUsers.size,
            uniqueActivities: summary.uniqueActivities.size
        };
    }

    /**
     * 生成首頁 HTML
     */
    generateIndexPage() {
        return `
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Activity Tracker - 統計報告</title>
            <style>
                body {
                    font-family: 'Microsoft JhengHei', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 10px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    color: #333;
                }
                .chat-list {
                    display: grid;
                    gap: 20px;
                    margin-top: 30px;
                }
                .chat-card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    background: #f9f9f9;
                    transition: transform 0.2s;
                }
                .chat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .chat-title {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #2c3e50;
                }
                .period-buttons {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .period-btn {
                    padding: 8px 16px;
                    background: #3498db;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    transition: background 0.2s;
                }
                .period-btn:hover {
                    background: #2980b9;
                }
                .loading {
                    text-align: center;
                    padding: 50px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Activity Tracker 統計報告</h1>
                    <p>選擇聊天室和時間範圍查看詳細統計</p>
                </div>
                
                <div id="chatList" class="loading">
                    <p>載入聊天室列表中...</p>
                </div>
            </div>

            <script>
                async function loadChats() {
                    try {
                        const response = await fetch('/api/chats');
                        const chats = await response.json();
                        
                        const chatListDiv = document.getElementById('chatList');
                        chatListDiv.innerHTML = '';
                        
                        if (chats.length === 0) {
                            chatListDiv.innerHTML = '<p>暫無聊天室數據</p>';
                            return;
                        }
                        
                        chats.forEach(chat => {
                            const chatCard = document.createElement('div');
                            chatCard.className = 'chat-card';
                            chatCard.innerHTML = \`
                                <div class="chat-title">\${chat.chatTitle}</div>
                                <div class="period-buttons">
                                    <a href="/stats/\${chat.chatId}?period=today" class="period-btn">📅 今日</a>
                                    <a href="/stats/\${chat.chatId}?period=yesterday" class="period-btn">📅 昨日</a>
                                    <a href="/stats/\${chat.chatId}?period=thisweek" class="period-btn">📅 本週</a>
                                    <a href="/stats/\${chat.chatId}?period=lastweek" class="period-btn">📅 上週</a>
                                    <a href="/stats/\${chat.chatId}?period=thismonth" class="period-btn">📅 本月</a>
                                    <a href="/stats/\${chat.chatId}?period=lastmonth" class="period-btn">📅 上月</a>
                                </div>
                            \`;
                            chatListDiv.appendChild(chatCard);
                        });
                    } catch (error) {
                        console.error('載入聊天室失敗:', error);
                        document.getElementById('chatList').innerHTML = '<p>載入聊天室失敗</p>';
                    }
                }
                
                loadChats();
            </script>
        </body>
        </html>
        `;
    }

    /**
     * 生成統計頁面 HTML
     */
    generateStatsPage(chatId, chatTitle, period) {
        const periodNames = {
            today: '今日',
            yesterday: '昨日', 
            thisweek: '本週',
            lastweek: '上週',
            thismonth: '本月',
            lastmonth: '上月'
        };

        return `
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${chatTitle} - ${periodNames[period]}統計</title>
            <style>
                body {
                    font-family: 'Microsoft JhengHei', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 10px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #3498db;
                }
                .back-btn {
                    display: inline-block;
                    margin-bottom: 20px;
                    padding: 10px 20px;
                    background: #95a5a6;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                }
                .back-btn:hover {
                    background: #7f8c8d;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .summary-card {
                    background: linear-gradient(135deg, #3498db, #2c3e50);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                }
                .summary-value {
                    font-size: 24px;
                    font-weight: bold;
                }
                .summary-label {
                    font-size: 14px;
                    opacity: 0.9;
                }
                .stats-section {
                    margin-bottom: 40px;
                }
                .section-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 20px;
                    color: #2c3e50;
                    border-left: 4px solid #3498db;
                    padding-left: 15px;
                }
                .user-card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    background: #f9f9f9;
                }
                .user-header {
                    background: #34495e;
                    color: white;
                    padding: 15px;
                    border-radius: 8px 8px 0 0;
                    font-weight: bold;
                }
                .user-stats {
                    padding: 20px;
                }
                .activity-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    margin: 5px 0;
                    background: white;
                    border-radius: 5px;
                    border-left: 4px solid #3498db;
                }
                .activity-name {
                    font-weight: bold;
                }
                .activity-stats {
                    color: #666;
                    font-size: 14px;
                }
                .overtime-warning {
                    background: #e74c3c !important;
                    color: white;
                }
                .loading {
                    text-align: center;
                    padding: 50px;
                    color: #666;
                }
                .chart-container {
                    height: 400px;
                    margin: 20px 0;
                }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <div class="container">
                <a href="/" class="back-btn">← 返回首頁</a>
                
                <div class="header">
                    <h1>📊 ${chatTitle}</h1>
                    <h2>${periodNames[period]}統計報告</h2>
                    <p id="dateRange">載入中...</p>
                </div>
                
                <div id="statsContent" class="loading">
                    <p>載入統計數據中...</p>
                </div>
            </div>

            <script>
                const chatId = '${chatId}';
                const period = '${period}';
                
                function formatDuration(seconds) {
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    return \`\${minutes} 分 \${remainingSeconds} 秒\`;
                }
                
                function getActivityEmoji(activityType) {
                    const emojis = {
                        toilet: '🚽',
                        smoking: '🚬',
                        poop_10: '💩',
                        poop_15: '💩', 
                        phone: '📱'
                    };
                    return emojis[activityType] || '📝';
                }
                
                function getActivityName(activityType) {
                    const names = {
                        toilet: '上廁所',
                        smoking: '抽菸',
                        poop_10: '大便 (10分鐘)',
                        poop_15: '大便 (15分鐘)',
                        phone: '使用手機'
                    };
                    return names[activityType] || activityType;
                }
                
                async function loadStats() {
                    try {
                        const response = await fetch(\`/api/stats/\${chatId}?period=\${period}\`);
                        const data = await response.json();
                        
                        displayStats(data);
                    } catch (error) {
                        console.error('載入統計失敗:', error);
                        document.getElementById('statsContent').innerHTML = '<p>載入統計失敗</p>';
                    }
                }
                
                function displayStats(data) {
                    // 更新日期範圍
                    const startDate = new Date(data.startDate).toLocaleDateString('zh-TW');
                    const endDate = new Date(data.endDate).toLocaleDateString('zh-TW');
                    document.getElementById('dateRange').textContent = \`\${startDate} - \${endDate}\`;
                    
                    let html = '';
                    
                    // 摘要統計
                    html += \`
                        <div class="summary-grid">
                            <div class="summary-card">
                                <div class="summary-value">\${data.summary.totalActivities}</div>
                                <div class="summary-label">總活動次數</div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-value">\${formatDuration(data.summary.totalDuration)}</div>
                                <div class="summary-label">總活動時間</div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-value">\${formatDuration(data.summary.totalOvertime)}</div>
                                <div class="summary-label">總超時時間</div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-value">\${data.summary.uniqueUsers}</div>
                                <div class="summary-label">參與人數</div>
                            </div>
                        </div>
                    \`;
                    
                    // 用戶統計
                    html += '<div class="stats-section"><div class="section-title">👥 用戶統計</div>';
                    
                    Object.entries(data.statistics.userStats).forEach(([userName, stats]) => {
                        html += \`
                            <div class="user-card">
                                <div class="user-header">👤 \${userName}</div>
                                <div class="user-stats">
                                    <div class="activity-item">
                                        <span class="activity-name">📈 總計</span>
                                        <span class="activity-stats">
                                            \${stats.totalCount} 次 | \${formatDuration(stats.totalDuration)}
                                            \${stats.totalOvertime > 0 ? ' | ⚠️ 超時 ' + formatDuration(stats.totalOvertime) : ''}
                                        </span>
                                    </div>
                        \`;
                        
                        Object.entries(stats.activities).forEach(([activityType, activityStats]) => {
                            const isOvertime = activityStats.totalOvertime > 0;
                            html += \`
                                <div class="activity-item \${isOvertime ? 'overtime-warning' : ''}">
                                    <span class="activity-name">
                                        \${getActivityEmoji(activityType)} \${getActivityName(activityType)}
                                    </span>
                                    <span class="activity-stats">
                                        \${activityStats.count} 次 | \${formatDuration(activityStats.totalDuration)}
                                        \${isOvertime ? ' | ⚠️ 超時 ' + formatDuration(activityStats.totalOvertime) : ''}
                                    </span>
                                </div>
                            \`;
                        });
                        
                        html += '</div></div>';
                    });
                    
                    html += '</div>';
                    
                    // 活動分析
                    html += '<div class="stats-section"><div class="section-title">📈 活動分析</div>';
                    
                    Object.entries(data.statistics.activityStats).forEach(([activityType, stats]) => {
                        const avgDuration = Math.round(stats.totalDuration / stats.totalCount);
                        html += \`
                            <div class="activity-item">
                                <span class="activity-name">
                                    \${getActivityEmoji(activityType)} \${getActivityName(activityType)}
                                </span>
                                <span class="activity-stats">
                                    \${stats.totalCount} 次 | \${formatDuration(stats.totalDuration)} | 
                                    平均 \${formatDuration(avgDuration)} | \${stats.uniqueUsers} 人參與
                                    \${stats.totalOvertime > 0 ? ' | ⚠️ 超時 ' + formatDuration(stats.totalOvertime) : ''}
                                </span>
                            </div>
                        \`;
                    });
                    
                    html += '</div>';
                    
                    document.getElementById('statsContent').innerHTML = html;
                }
                
                loadStats();
            </script>
        </body>
        </html>
        `;
    }
}

module.exports = WebServer;