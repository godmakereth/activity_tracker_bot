/**
 * 詳細 Web 服務器 - 員工數據面板
 */
const express = require('express');
const path = require('path');
const moment = require('moment-timezone');
const ExcelReportGenerator = require('../excel/ExcelReportGenerator');
const AutoExcelArchiver = require('../file-system/AutoExcelArchiver');

class DetailedWebServer {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.server = null;
        this.activityRepository = null;
        this.chatRepository = null;
        this.reportGenerator = null;
        this.excelGenerator = new ExcelReportGenerator();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
    }

    setupRoutes() {
        // 員工數據面板主頁
        this.app.get('/', (req, res) => {
            res.send(this.generateEmployeeDashboard());
        });

        // 聊天室列表 API
        this.app.get('/api/chats', async (req, res) => {
            try {
                const dbData = this.activityRepository.db.data;
                const chats = dbData.chat_settings || [];
                res.json(chats);
            } catch (error) {
                console.error('獲取聊天室列表失敗:', error);
                res.status(500).json({ error: '獲取聊天室列表失敗' });
            }
        });

        // 員工詳細數據 API
        this.app.get('/api/employee-stats/:chatId', async (req, res) => {
            try {
                const { chatId } = req.params;
                const { period = 'today' } = req.query;
                
                const { startDate, endDate } = this.getPeriodDates(period);
                const detailedStats = await this.getDetailedEmployeeStats(chatId, startDate, endDate);
                
                res.json(detailedStats);
            } catch (error) {
                console.error('獲取員工詳細數據失敗:', error);
                res.status(500).json({ error: '獲取員工詳細數據失敗' });
            }
        });

        // 員工個人頁面
        this.app.get('/employee/:chatId/:userId', async (req, res) => {
            try {
                const { chatId, userId } = req.params;
                const { period = 'today' } = req.query;
                
                res.send(this.generateEmployeePage(chatId, userId, period));
            } catch (error) {
                console.error('生成員工頁面失敗:', error);
                res.status(500).send('<h1>生成員工頁面失敗</h1>');
            }
        });

        // 員工個人數據 API
        this.app.get('/api/employee/:chatId/:userId', async (req, res) => {
            try {
                const { chatId, userId } = req.params;
                const { period = 'today' } = req.query;
                
                const { startDate, endDate } = this.getPeriodDates(period);
                const employeeData = await this.getEmployeePersonalData(chatId, userId, startDate, endDate);
                
                res.json(employeeData);
            } catch (error) {
                console.error('獲取員工個人數據失敗:', error);
                res.status(500).json({ error: '獲取員工個人數據失敗' });
            }
        });

        // 即時活動狀態 API
        this.app.get('/api/live-status/:chatId', async (req, res) => {
            try {
                const { chatId } = req.params;
                const liveStatus = await this.getLiveActivityStatus(chatId);
                res.json(liveStatus);
            } catch (error) {
                console.error('獲取即時狀態失敗:', error);
                res.status(500).json({ error: '獲取即時狀態失敗' });
            }
        });

        // 生成 TXT 報告
        this.app.get('/api/generate-txt/:chatId', async (req, res) => {
            try {
                const { chatId } = req.params;
                const { period = 'today' } = req.query;
                
                const { startDate, endDate } = this.getPeriodDates(period);
                const txtContent = await this.generateDetailedTxtReport(chatId, startDate, endDate);
                
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="employee-report-${period}-${moment().format('YYYY-MM-DD-HHmm')}.txt"`);
                res.send(txtContent);
            } catch (error) {
                console.error('生成 TXT 報告失敗:', error);
                res.status(500).json({ error: '生成 TXT 報告失敗' });
            }
        });

        // 生成 Excel 報告
        this.app.get('/api/generate-excel/:chatId', async (req, res) => {
            try {
                const { chatId } = req.params;
                const { period = 'today' } = req.query;
                
                const { startDate, endDate } = this.getPeriodDates(period);
                const excelBuffer = await this.generateDetailedExcelReport(chatId, startDate, endDate);
                
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="employee-report-${period}-${moment().format('YYYY-MM-DD-HHmm')}.xlsx"`);
                res.send(excelBuffer);
            } catch (error) {
                console.error('生成 Excel 報告失敗:', error);
                res.status(500).json({ error: '生成 Excel 報告失敗' });
            }
        });

        // 存檔管理 API
        this.app.get('/api/archive-logs', async (req, res) => {
            try {
                const logs = await this.getArchiveLogs();
                res.json(logs);
            } catch (error) {
                console.error('獲取存檔日誌失敗:', error);
                res.status(500).json({ error: '獲取存檔日誌失敗' });
            }
        });

        // 手動觸發存檔
        this.app.post('/api/manual-archive/:chatId', async (req, res) => {
            try {
                const { chatId } = req.params;
                const { targetDate } = req.body;
                
                await this.triggerManualArchive(chatId, targetDate);
                res.json({ success: true, message: '手動存檔已觸發' });
            } catch (error) {
                console.error('手動存檔失敗:', error);
                res.status(500).json({ error: '手動存檔失敗: ' + error.message });
            }
        });
    }

    setDependencies(activityRepository, chatRepository, reportGenerator) {
        this.activityRepository = activityRepository;
        this.chatRepository = chatRepository;
        this.reportGenerator = reportGenerator;
        this.autoExcelArchiver = new AutoExcelArchiver(activityRepository, chatRepository);
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (err) => {
                if (err) {
                    console.error('Web 服務器啟動失敗:', err);
                    reject(err);
                } else {
                    console.log(`🌐 詳細員工數據面板已啟動: http://localhost:${this.port}`);
                    resolve();
                }
            });
        });
    }

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

    async getDetailedEmployeeStats(chatId, startDate, endDate) {
        const dbData = this.activityRepository.db.data;
        
        // 過濾活動數據
        const activities = dbData.activities.filter(activity => {
            const activityDate = new Date(activity.start_time);
            return activity.chat_id === chatId && 
                   activityDate >= startDate && 
                   activityDate <= endDate &&
                   (activity.status === 'completed' || activity.status === 'overtime');
        });

        // 獲取正在進行的活動
        const ongoingActivities = dbData.ongoing_activities.filter(activity => 
            activity.chat_id === chatId
        );

        // 按員工分組統計
        const employeeStats = {};
        
        activities.forEach(activity => {
            const userName = activity.user_full_name;
            const userId = activity.user_id;
            
            if (!employeeStats[userId]) {
                employeeStats[userId] = {
                    userId,
                    userName,
                    totalActivities: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    overtimeCount: 0,
                    activities: {},
                    dailyBreakdown: {},
                    hourlyBreakdown: Array(24).fill(0),
                    efficiency: 0,
                    averageActivityTime: 0,
                    longestActivity: 0,
                    shortestActivity: Infinity,
                    mostUsedActivity: '',
                    attendanceDays: new Set()
                };
            }

            const userStat = employeeStats[userId];
            const activityType = activity.activity_type;
            const duration = activity.duration || 0;
            const overtime = activity.overtime || 0;
            const activityDate = moment(activity.start_time).format('YYYY-MM-DD');
            const hour = moment(activity.start_time).hour();

            // 基本統計
            userStat.totalActivities++;
            userStat.totalDuration += duration;
            userStat.totalOvertime += overtime;
            if (overtime > 0) userStat.overtimeCount++;

            // 每日分解
            if (!userStat.dailyBreakdown[activityDate]) {
                userStat.dailyBreakdown[activityDate] = {
                    activities: 0,
                    duration: 0,
                    overtime: 0
                };
            }
            userStat.dailyBreakdown[activityDate].activities++;
            userStat.dailyBreakdown[activityDate].duration += duration;
            userStat.dailyBreakdown[activityDate].overtime += overtime;

            // 小時分解
            userStat.hourlyBreakdown[hour]++;

            // 活動類型統計
            if (!userStat.activities[activityType]) {
                userStat.activities[activityType] = {
                    count: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    overtimeCount: 0,
                    averageDuration: 0,
                    maxDuration: 0,
                    minDuration: Infinity
                };
            }

            const activityStat = userStat.activities[activityType];
            activityStat.count++;
            activityStat.totalDuration += duration;
            activityStat.totalOvertime += overtime;
            if (overtime > 0) activityStat.overtimeCount++;
            activityStat.maxDuration = Math.max(activityStat.maxDuration, duration);
            activityStat.minDuration = Math.min(activityStat.minDuration, duration);

            // 記錄出勤日
            userStat.attendanceDays.add(activityDate);

            // 更新最長/最短活動時間
            userStat.longestActivity = Math.max(userStat.longestActivity, duration);
            userStat.shortestActivity = Math.min(userStat.shortestActivity, duration);
        });

        // 計算衍生統計
        Object.values(employeeStats).forEach(userStat => {
            // 平均活動時間
            userStat.averageActivityTime = userStat.totalActivities > 0 ? 
                Math.round(userStat.totalDuration / userStat.totalActivities) : 0;

            // 效率評分 (基於超時比例)
            userStat.efficiency = userStat.totalActivities > 0 ? 
                Math.round((1 - userStat.overtimeCount / userStat.totalActivities) * 100) : 100;

            // 最常用活動
            let maxCount = 0;
            Object.entries(userStat.activities).forEach(([activityType, stats]) => {
                stats.averageDuration = stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0;
                if (stats.minDuration === Infinity) stats.minDuration = 0;
                
                if (stats.count > maxCount) {
                    maxCount = stats.count;
                    userStat.mostUsedActivity = activityType;
                }
            });

            // 轉換出勤日 Set 為數量
            userStat.attendanceDaysCount = userStat.attendanceDays.size;
            delete userStat.attendanceDays;

            if (userStat.shortestActivity === Infinity) userStat.shortestActivity = 0;
        });

        return {
            chatId,
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            },
            employees: employeeStats,
            ongoingActivities: ongoingActivities.map(activity => ({
                userId: activity.user_id,
                userName: activity.user_full_name,
                activityType: activity.activity_type,
                startTime: activity.start_time,
                duration: Math.floor((Date.now() - new Date(activity.start_time)) / 1000)
            })),
            summary: {
                totalEmployees: Object.keys(employeeStats).length,
                totalActivities: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalActivities, 0),
                totalDuration: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalDuration, 0),
                totalOvertime: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalOvertime, 0),
                activeEmployees: ongoingActivities.length
            }
        };
    }

    async getEmployeePersonalData(chatId, userId, startDate, endDate) {
        const dbData = this.activityRepository.db.data;
        
        const activities = dbData.activities.filter(activity => {
            const activityDate = new Date(activity.start_time);
            return activity.chat_id === chatId && 
                   activity.user_id === userId &&
                   activityDate >= startDate && 
                   activityDate <= endDate;
        });

        const ongoingActivity = dbData.ongoing_activities.find(activity => 
            activity.chat_id === chatId && activity.user_id === userId
        );

        return {
            userId,
            userName: activities.length > 0 ? activities[0].user_full_name : 'Unknown',
            activities,
            ongoingActivity,
            timeline: activities.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        };
    }

    async getLiveActivityStatus(chatId) {
        const dbData = this.activityRepository.db.data;
        
        const ongoingActivities = dbData.ongoing_activities.filter(activity => 
            activity.chat_id === chatId
        );

        return {
            activeCount: ongoingActivities.length,
            activities: ongoingActivities.map(activity => ({
                userId: activity.user_id,
                userName: activity.user_full_name,
                activityType: activity.activity_type,
                startTime: activity.start_time,
                duration: Math.floor((Date.now() - new Date(activity.start_time)) / 1000),
                status: this.getActivityStatus(activity.activity_type, Math.floor((Date.now() - new Date(activity.start_time)) / 1000))
            }))
        };
    }

    getActivityStatus(activityType, duration) {
        const limits = {
            toilet: 6 * 60,
            smoking: 5 * 60,
            poop_10: 10 * 60,
            poop_15: 15 * 60,
            phone: 10 * 60
        };

        const limit = limits[activityType] || 5 * 60;
        const percentage = (duration / limit) * 100;

        if (percentage < 70) return 'normal';
        if (percentage < 100) return 'warning';
        return 'overtime';
    }

    async generateDetailedTxtReport(chatId, startDate, endDate) {
        const stats = await this.getDetailedEmployeeStats(chatId, startDate, endDate);
        const chat = this.activityRepository.db.data.chat_settings.find(c => c.chat_id === chatId);
        const chatTitle = chat ? chat.chat_title : 'Unknown Chat';
        
        const lines = [];
        const now = moment().tz('Asia/Taipei');
        
        // 標題
        lines.push('================================================================');
        lines.push(`📊 ${chatTitle} - 詳細員工活動報告`);
        lines.push(`📅 報告期間: ${moment(startDate).format('YYYY-MM-DD')} 至 ${moment(endDate).format('YYYY-MM-DD')}`);
        lines.push(`🕐 生成時間: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
        lines.push('================================================================');
        lines.push('');

        // 總覽
        lines.push('📋 總覽統計');
        lines.push('----------------------------------------------------------------');
        lines.push(`👥 總員工數: ${stats.summary.totalEmployees} 人`);
        lines.push(`📊 總活動次數: ${stats.summary.totalActivities} 次`);
        lines.push(`⏱️ 總活動時間: ${this.formatDuration(stats.summary.totalDuration)}`);
        lines.push(`⚠️ 總超時時間: ${this.formatDuration(stats.summary.totalOvertime)}`);
        lines.push(`🔴 目前活動中: ${stats.summary.activeEmployees} 人`);
        lines.push('');

        // 即時狀態
        if (stats.ongoingActivities.length > 0) {
            lines.push('🔴 目前活動中員工');
            lines.push('----------------------------------------------------------------');
            stats.ongoingActivities.forEach(activity => {
                const status = this.getActivityStatus(activity.activityType, activity.duration);
                const statusText = status === 'overtime' ? '🚨 超時' : 
                                 status === 'warning' ? '⚠️ 接近超時' : '✅ 正常';
                lines.push(`👤 ${activity.userName} - ${this.getActivityName(activity.activityType)} (${this.formatDuration(activity.duration)}) ${statusText}`);
            });
            lines.push('');
        }

        // 員工詳細統計
        lines.push('👥 員工詳細統計');
        lines.push('================================================================');
        
        Object.values(stats.employees).forEach((employee, index) => {
            lines.push(`${index + 1}. 👤 ${employee.userName} (ID: ${employee.userId})`);
            lines.push('----------------------------------------------------------------');
            
            // 基本統計
            lines.push(`📈 總體表現:`);
            lines.push(`   🔢 總活動次數: ${employee.totalActivities} 次`);
            lines.push(`   ⏱️ 總活動時間: ${this.formatDuration(employee.totalDuration)}`);
            lines.push(`   📊 平均活動時間: ${this.formatDuration(employee.averageActivityTime)}`);
            lines.push(`   ⚠️ 總超時時間: ${this.formatDuration(employee.totalOvertime)}`);
            lines.push(`   ❌ 超時次數: ${employee.overtimeCount} 次`);
            lines.push(`   🎯 效率評分: ${employee.efficiency}%`);
            lines.push(`   📅 出勤天數: ${employee.attendanceDaysCount} 天`);
            lines.push(`   🏆 最常用活動: ${this.getActivityName(employee.mostUsedActivity)}`);
            lines.push(`   ⏰ 最長活動: ${this.formatDuration(employee.longestActivity)}`);
            lines.push(`   ⚡ 最短活動: ${this.formatDuration(employee.shortestActivity)}`);
            lines.push('');

            // 活動明細
            lines.push(`📊 活動明細:`);
            Object.entries(employee.activities).forEach(([activityType, activityStats]) => {
                const activityName = this.getActivityName(activityType);
                const emoji = this.getActivityEmoji(activityType);
                lines.push(`   ${emoji} ${activityName}:`);
                lines.push(`     🔢 次數: ${activityStats.count} 次`);
                lines.push(`     ⏱️ 總時間: ${this.formatDuration(activityStats.totalDuration)}`);
                lines.push(`     📊 平均時間: ${this.formatDuration(activityStats.averageDuration)}`);
                lines.push(`     📈 最長時間: ${this.formatDuration(activityStats.maxDuration)}`);
                lines.push(`     📉 最短時間: ${this.formatDuration(activityStats.minDuration)}`);
                if (activityStats.totalOvertime > 0) {
                    lines.push(`     ⚠️ 超時時間: ${this.formatDuration(activityStats.totalOvertime)}`);
                    lines.push(`     ❌ 超時次數: ${activityStats.overtimeCount} 次`);
                }
            });
            lines.push('');

            // 每日分解
            lines.push(`📅 每日活動分解:`);
            Object.entries(employee.dailyBreakdown).forEach(([date, dayStats]) => {
                lines.push(`   📅 ${date}:`);
                lines.push(`     🔢 活動次數: ${dayStats.activities} 次`);
                lines.push(`     ⏱️ 活動時間: ${this.formatDuration(dayStats.duration)}`);
                if (dayStats.overtime > 0) {
                    lines.push(`     ⚠️ 超時時間: ${this.formatDuration(dayStats.overtime)}`);
                }
            });
            lines.push('');

            // 時段分析
            lines.push(`🕐 活動時段分析:`);
            employee.hourlyBreakdown.forEach((count, hour) => {
                if (count > 0) {
                    lines.push(`   ${hour.toString().padStart(2, '0')}:00 - ${count} 次活動`);
                }
            });
            lines.push('');
            lines.push('================================================================');
            lines.push('');
        });

        // 報告結尾
        lines.push('----------------------------------------------------------------');
        lines.push('🤖 此報告由 Activity Tracker Bot 自動生成');
        lines.push(`📅 生成時間: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
        lines.push('================================================================');

        return lines.join('\n');
    }

    async generateDetailedExcelReport(chatId, startDate, endDate) {
        const stats = await this.getDetailedEmployeeStats(chatId, startDate, endDate);
        const chat = this.activityRepository.db.data.chat_settings.find(c => c.chat_id === chatId);
        const chatTitle = chat ? chat.chat_title : 'Unknown Chat';
        
        // 使用 Excel 生成器生成報告
        const workbook = await this.excelGenerator.generateDetailedEmployeeReport(stats, chatTitle);
        
        // 轉換為 Buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }

    /**
     * 獲取存檔日誌
     */
    async getArchiveLogs() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const logFile = path.join('./archives/excel', 'archive_log.json');
            
            const logData = await fs.readFile(logFile, 'utf8');
            const logs = JSON.parse(logData);
            
            // 返回最新的20條記錄
            return logs.slice(-20).reverse();
        } catch (error) {
            return [];
        }
    }

    /**
     * 手動觸發存檔
     */
    async triggerManualArchive(chatId, targetDate) {
        if (!this.autoExcelArchiver) {
            throw new Error('自動存檔器未初始化');
        }
        
        await this.autoExcelArchiver.manualArchive(chatId, targetDate);
    }

    formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0 分 0 秒';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes} 分 ${remainingSeconds} 秒`;
    }

    getActivityName(activityType) {
        const names = {
            toilet: '上廁所',
            smoking: '抽菸',
            poop_10: '大便 (10分鐘)',
            poop_15: '大便 (15分鐘)',
            phone: '使用手機'
        };
        return names[activityType] || activityType;
    }

    getActivityEmoji(activityType) {
        const emojis = {
            toilet: '🚽',
            smoking: '🚬',
            poop_10: '💩',
            poop_15: '💩',
            phone: '📱'
        };
        return emojis[activityType] || '📝';
    }

    generateEmployeeDashboard() {
        return `
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>員工活動數據面板</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Microsoft JhengHei', Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .dashboard {
                    max-width: 1400px;
                    margin: 0 auto;
                }
                
                .header {
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    margin-bottom: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    text-align: center;
                }
                
                .header h1 {
                    color: #2c3e50;
                    font-size: 2.5em;
                    margin-bottom: 10px;
                    background: linear-gradient(45deg, #3498db, #e74c3c);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .header p {
                    color: #7f8c8d;
                    font-size: 1.2em;
                }
                
                .controls {
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    margin-bottom: 30px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                }
                
                .control-group {
                    display: flex;
                    gap: 20px;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 20px;
                }
                
                .control-group label {
                    font-weight: bold;
                    color: #2c3e50;
                    min-width: 80px;
                }
                
                select, button {
                    padding: 12px 20px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 16px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                select:hover, button:hover {
                    border-color: #3498db;
                    transform: translateY(-2px);
                }
                
                .btn-primary {
                    background: linear-gradient(45deg, #3498db, #2980b9);
                    color: white;
                    border: none;
                    font-weight: bold;
                }
                
                .btn-success {
                    background: linear-gradient(45deg, #27ae60, #229954);
                    color: white;
                    border: none;
                    font-weight: bold;
                }
                
                .btn-warning {
                    background: linear-gradient(45deg, #f39c12, #e67e22);
                    color: white;
                    border: none;
                    font-weight: bold;
                }
                
                .btn-info {
                    background: linear-gradient(45deg, #17a2b8, #138496);
                    color: white;
                    border: none;
                    font-weight: bold;
                }
                
                .summary-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .summary-card {
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    text-align: center;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                    transition: transform 0.3s;
                }
                
                .summary-card:hover {
                    transform: translateY(-5px);
                }
                
                .summary-card.active {
                    background: linear-gradient(45deg, #e74c3c, #c0392b);
                    color: white;
                }
                
                .summary-card.warning {
                    background: linear-gradient(45deg, #f39c12, #e67e22);
                    color: white;
                }
                
                .summary-card.success {
                    background: linear-gradient(45deg, #27ae60, #229954);
                    color: white;
                }
                
                .summary-value {
                    font-size: 2.5em;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                
                .summary-label {
                    font-size: 1.1em;
                    opacity: 0.9;
                }
                
                .employee-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 25px;
                    margin-bottom: 30px;
                }
                
                .employee-card {
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                    transition: transform 0.3s;
                }
                
                .employee-card:hover {
                    transform: translateY(-3px);
                }
                
                .employee-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #ecf0f1;
                }
                
                .employee-name {
                    font-size: 1.4em;
                    font-weight: bold;
                    color: #2c3e50;
                }
                
                .efficiency-badge {
                    padding: 5px 15px;
                    border-radius: 20px;
                    color: white;
                    font-weight: bold;
                }
                
                .efficiency-high {
                    background: linear-gradient(45deg, #27ae60, #229954);
                }
                
                .efficiency-medium {
                    background: linear-gradient(45deg, #f39c12, #e67e22);
                }
                
                .efficiency-low {
                    background: linear-gradient(45deg, #e74c3c, #c0392b);
                }
                
                .employee-stats {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                
                .stat-item {
                    text-align: center;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 10px;
                }
                
                .stat-value {
                    font-size: 1.3em;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                
                .stat-label {
                    font-size: 0.9em;
                    color: #7f8c8d;
                }
                
                .live-status {
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    margin-bottom: 30px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                }
                
                .live-status h3 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-size: 1.5em;
                }
                
                .live-activity {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 10px;
                    background: #f8f9fa;
                }
                
                .live-activity.normal {
                    border-left: 5px solid #27ae60;
                }
                
                .live-activity.warning {
                    border-left: 5px solid #f39c12;
                    background: #fef9e7;
                }
                
                .live-activity.overtime {
                    border-left: 5px solid #e74c3c;
                    background: #ffebee;
                }
                
                .loading {
                    text-align: center;
                    padding: 50px;
                    color: white;
                    font-size: 1.2em;
                }
                
                .activity-timeline {
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    margin-bottom: 30px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                }
                
                .timeline-item {
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    margin: 5px 0;
                    border-radius: 8px;
                    background: #f8f9fa;
                }
                
                .timeline-time {
                    font-weight: bold;
                    color: #3498db;
                    min-width: 80px;
                }
                
                .auto-refresh {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(255,255,255,0.9);
                    padding: 10px 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <div class="dashboard">
                <div class="header">
                    <h1>📊 員工活動數據面板</h1>
                    <p>即時監控員工活動狀況 | 詳細統計分析 | 智能報告生成</p>
                </div>
                
                <div class="auto-refresh">
                    🔄 自動更新: <span id="refreshCounter">30</span>s
                </div>
                
                <div class="controls">
                    <div class="control-group">
                        <label>聊天室:</label>
                        <select id="chatSelect">
                            <option value="">載入中...</option>
                        </select>
                        
                        <label>時間範圍:</label>
                        <select id="periodSelect">
                            <option value="today">今日</option>
                            <option value="yesterday">昨日</option>
                            <option value="thisweek">本週</option>
                            <option value="lastweek">上週</option>
                            <option value="thismonth">本月</option>
                            <option value="lastmonth">上月</option>
                        </select>
                        
                        <button class="btn-primary" onclick="loadData()">📊 載入數據</button>
                        <button class="btn-success" onclick="downloadTxtReport()">📄 下載 TXT 報告</button>
                        <button class="btn-warning" onclick="downloadExcelReport()">📊 下載 Excel 報告</button>
                        <button class="btn-info" onclick="printReport()">🖨️ 列印報告</button>
                    </div>
                </div>
                
                <div id="summaryCards" class="summary-cards">
                    <div class="summary-card">
                        <div class="summary-value" id="totalEmployees">-</div>
                        <div class="summary-label">👥 總員工數</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="totalActivities">-</div>
                        <div class="summary-label">📊 總活動次數</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="totalDuration">-</div>
                        <div class="summary-label">⏱️ 總活動時間</div>
                    </div>
                    <div class="summary-card active">
                        <div class="summary-value" id="activeEmployees">-</div>
                        <div class="summary-label">🔴 目前活動中</div>
                    </div>
                </div>
                
                <div id="liveStatus" class="live-status" style="display: none;">
                    <h3>🔴 即時活動狀況</h3>
                    <div id="liveActivities"></div>
                </div>
                
                <div id="employeeGrid" class="employee-grid">
                    <div class="loading">
                        <p>請選擇聊天室和時間範圍來載入員工數據</p>
                    </div>
                </div>
            </div>

            <script>
                let currentChatId = '';
                let currentPeriod = 'today';
                let refreshInterval;
                let refreshCounter = 30;

                // 頁面載入時初始化
                document.addEventListener('DOMContentLoaded', function() {
                    loadChats();
                    startAutoRefresh();
                });

                // 載入聊天室列表
                async function loadChats() {
                    try {
                        const response = await fetch('/api/chats');
                        const chats = await response.json();
                        
                        const chatSelect = document.getElementById('chatSelect');
                        chatSelect.innerHTML = '<option value="">請選擇聊天室</option>';
                        
                        chats.forEach(chat => {
                            const option = document.createElement('option');
                            option.value = chat.chat_id;
                            option.textContent = chat.chat_title;
                            chatSelect.appendChild(option);
                        });
                    } catch (error) {
                        console.error('載入聊天室失敗:', error);
                    }
                }

                // 載入數據
                async function loadData() {
                    const chatId = document.getElementById('chatSelect').value;
                    const period = document.getElementById('periodSelect').value;
                    
                    if (!chatId) {
                        alert('請選擇聊天室');
                        return;
                    }

                    currentChatId = chatId;
                    currentPeriod = period;

                    try {
                        // 載入員工統計
                        const statsResponse = await fetch(\`/api/employee-stats/\${chatId}?period=\${period}\`);
                        const stats = await statsResponse.json();
                        
                        displaySummary(stats.summary);
                        displayEmployees(stats.employees);
                        
                        // 載入即時狀態
                        const liveResponse = await fetch(\`/api/live-status/\${chatId}\`);
                        const liveStatus = await liveResponse.json();
                        
                        displayLiveStatus(liveStatus);
                        
                    } catch (error) {
                        console.error('載入數據失敗:', error);
                        alert('載入數據失敗');
                    }
                }

                // 顯示摘要統計
                function displaySummary(summary) {
                    document.getElementById('totalEmployees').textContent = summary.totalEmployees;
                    document.getElementById('totalActivities').textContent = summary.totalActivities;
                    document.getElementById('totalDuration').textContent = formatDuration(summary.totalDuration);
                    document.getElementById('activeEmployees').textContent = summary.activeEmployees;
                }

                // 顯示員工列表
                function displayEmployees(employees) {
                    const grid = document.getElementById('employeeGrid');
                    grid.innerHTML = '';

                    Object.values(employees).forEach(employee => {
                        const card = createEmployeeCard(employee);
                        grid.appendChild(card);
                    });
                }

                // 創建員工卡片
                function createEmployeeCard(employee) {
                    const card = document.createElement('div');
                    card.className = 'employee-card';
                    
                    const efficiencyClass = employee.efficiency >= 80 ? 'efficiency-high' :
                                          employee.efficiency >= 60 ? 'efficiency-medium' : 'efficiency-low';
                    
                    card.innerHTML = \`
                        <div class="employee-header">
                            <div class="employee-name">👤 \${employee.userName}</div>
                            <div class="efficiency-badge \${efficiencyClass}">\${employee.efficiency}% 效率</div>
                        </div>
                        <div class="employee-stats">
                            <div class="stat-item">
                                <div class="stat-value">\${employee.totalActivities}</div>
                                <div class="stat-label">總活動次數</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">\${formatDuration(employee.totalDuration)}</div>
                                <div class="stat-label">總活動時間</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">\${formatDuration(employee.averageActivityTime)}</div>
                                <div class="stat-label">平均活動時間</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">\${employee.overtimeCount}</div>
                                <div class="stat-label">超時次數</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">\${employee.attendanceDaysCount}</div>
                                <div class="stat-label">出勤天數</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">\${getActivityName(employee.mostUsedActivity)}</div>
                                <div class="stat-label">最常用活動</div>
                            </div>
                        </div>
                        <div style="margin-top: 15px; text-align: center;">
                            <button class="btn-info" onclick="viewEmployeeDetail('\${employee.userId}')">📋 查看詳細</button>
                        </div>
                    \`;
                    
                    return card;
                }

                // 顯示即時狀態
                function displayLiveStatus(liveStatus) {
                    const liveDiv = document.getElementById('liveStatus');
                    const activitiesDiv = document.getElementById('liveActivities');
                    
                    if (liveStatus.activeCount === 0) {
                        liveDiv.style.display = 'none';
                        return;
                    }
                    
                    liveDiv.style.display = 'block';
                    activitiesDiv.innerHTML = '';
                    
                    liveStatus.activities.forEach(activity => {
                        const div = document.createElement('div');
                        div.className = \`live-activity \${activity.status}\`;
                        
                        const statusText = activity.status === 'overtime' ? '🚨 超時' :
                                         activity.status === 'warning' ? '⚠️ 接近超時' : '✅ 正常';
                        
                        div.innerHTML = \`
                            <div>
                                <strong>\${activity.userName}</strong> - \${getActivityName(activity.activityType)}
                            </div>
                            <div>
                                \${formatDuration(activity.duration)} \${statusText}
                            </div>
                        \`;
                        
                        activitiesDiv.appendChild(div);
                    });
                }

                // 查看員工詳細
                function viewEmployeeDetail(userId) {
                    if (!currentChatId) return;
                    
                    const url = \`/employee/\${currentChatId}/\${userId}?period=\${currentPeriod}\`;
                    window.open(url, '_blank');
                }

                // 下載 TXT 報告
                function downloadTxtReport() {
                    if (!currentChatId) {
                        alert('請先載入數據');
                        return;
                    }
                    
                    const url = \`/api/generate-txt/\${currentChatId}?period=\${currentPeriod}\`;
                    window.open(url, '_blank');
                }

                // 下載 Excel 報告
                function downloadExcelReport() {
                    if (!currentChatId) {
                        alert('請先載入數據');
                        return;
                    }
                    
                    const url = \`/api/generate-excel/\${currentChatId}?period=\${currentPeriod}\`;
                    window.open(url, '_blank');
                }

                // 列印報告
                function printReport() {
                    window.print();
                }

                // 開始自動更新
                function startAutoRefresh() {
                    refreshInterval = setInterval(() => {
                        refreshCounter--;
                        document.getElementById('refreshCounter').textContent = refreshCounter;
                        
                        if (refreshCounter <= 0) {
                            refreshCounter = 30;
                            if (currentChatId) {
                                loadData();
                            }
                        }
                    }, 1000);
                }

                // 格式化時間
                function formatDuration(seconds) {
                    if (!seconds || seconds < 0) return '0分0秒';
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    return \`\${minutes}分\${remainingSeconds}秒\`;
                }

                // 獲取活動名稱
                function getActivityName(activityType) {
                    const names = {
                        toilet: '上廁所',
                        smoking: '抽菸',
                        poop_10: '大便(10分)',
                        poop_15: '大便(15分)',
                        phone: '使用手機'
                    };
                    return names[activityType] || activityType;
                }

                // 頁面隱藏時停止自動更新
                document.addEventListener('visibilitychange', function() {
                    if (document.hidden) {
                        clearInterval(refreshInterval);
                    } else {
                        startAutoRefresh();
                    }
                });
            </script>
        </body>
        </html>
        `;
    }

    generateEmployeePage(chatId, userId, period) {
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
            <title>員工個人詳細報告</title>
            <style>
                body {
                    font-family: 'Microsoft JhengHei', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                }
                
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #3498db;
                }
                
                .back-btn {
                    display: inline-block;
                    margin-bottom: 20px;
                    padding: 12px 24px;
                    background: linear-gradient(45deg, #95a5a6, #7f8c8d);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    transition: transform 0.3s;
                }
                
                .back-btn:hover {
                    transform: translateY(-2px);
                }
                
                .employee-info {
                    background: linear-gradient(45deg, #3498db, #2980b9);
                    color: white;
                    padding: 25px;
                    border-radius: 10px;
                    margin-bottom: 30px;
                    text-align: center;
                }
                
                .timeline {
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 25px;
                    margin-bottom: 30px;
                }
                
                .timeline-item {
                    display: flex;
                    align-items: center;
                    padding: 15px;
                    margin: 10px 0;
                    background: white;
                    border-radius: 8px;
                    border-left: 5px solid #3498db;
                }
                
                .timeline-item.overtime {
                    border-left-color: #e74c3c;
                    background: #ffebee;
                }
                
                .timeline-time {
                    font-weight: bold;
                    color: #3498db;
                    min-width: 150px;
                }
                
                .timeline-activity {
                    flex: 1;
                    margin-left: 15px;
                }
                
                .timeline-duration {
                    font-weight: bold;
                    color: #2c3e50;
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
                <a href="/" class="back-btn">← 返回數據面板</a>
                
                <div class="header">
                    <h1>👤 員工個人詳細報告</h1>
                    <h2>${periodNames[period]}數據分析</h2>
                </div>
                
                <div id="employeeInfo" class="employee-info">
                    <div class="loading">載入員工資料中...</div>
                </div>
                
                <div class="timeline">
                    <h3>📅 活動時間軸</h3>
                    <div id="timeline" class="loading">載入活動記錄中...</div>
                </div>
            </div>

            <script>
                const chatId = '${chatId}';
                const userId = '${userId}';
                const period = '${period}';
                
                async function loadEmployeeData() {
                    try {
                        const response = await fetch(\`/api/employee/\${chatId}/\${userId}?period=\${period}\`);
                        const data = await response.json();
                        
                        displayEmployeeInfo(data);
                        displayTimeline(data.timeline);
                    } catch (error) {
                        console.error('載入員工資料失敗:', error);
                        document.getElementById('employeeInfo').innerHTML = '<p>載入失敗</p>';
                        document.getElementById('timeline').innerHTML = '<p>載入失敗</p>';
                    }
                }
                
                function displayEmployeeInfo(data) {
                    const infoDiv = document.getElementById('employeeInfo');
                    
                    const totalActivities = data.activities.length;
                    const totalDuration = data.activities.reduce((sum, act) => sum + (act.duration || 0), 0);
                    const totalOvertime = data.activities.reduce((sum, act) => sum + (act.overtime || 0), 0);
                    
                    infoDiv.innerHTML = \`
                        <h2>📋 \${data.userName}</h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                            <div>
                                <div style="font-size: 2em; font-weight: bold;">\${totalActivities}</div>
                                <div>總活動次數</div>
                            </div>
                            <div>
                                <div style="font-size: 2em; font-weight: bold;">\${formatDuration(totalDuration)}</div>
                                <div>總活動時間</div>
                            </div>
                            <div>
                                <div style="font-size: 2em; font-weight: bold;">\${formatDuration(totalOvertime)}</div>
                                <div>總超時時間</div>
                            </div>
                        </div>
                    \`;
                }
                
                function displayTimeline(timeline) {
                    const timelineDiv = document.getElementById('timeline');
                    
                    if (timeline.length === 0) {
                        timelineDiv.innerHTML = '<p>此期間無活動記錄</p>';
                        return;
                    }
                    
                    timelineDiv.innerHTML = '';
                    
                    timeline.forEach(activity => {
                        const div = document.createElement('div');
                        div.className = \`timeline-item \${activity.overtime > 0 ? 'overtime' : ''}\`;
                        
                        const startTime = new Date(activity.start_time).toLocaleString('zh-TW');
                        const endTime = activity.end_time ? new Date(activity.end_time).toLocaleString('zh-TW') : '進行中';
                        
                        div.innerHTML = \`
                            <div class="timeline-time">
                                \${startTime}
                            </div>
                            <div class="timeline-activity">
                                <div style="font-weight: bold; margin-bottom: 5px;">
                                    \${getActivityEmoji(activity.activity_type)} \${getActivityName(activity.activity_type)}
                                </div>
                                <div style="color: #666;">結束時間: \${endTime}</div>
                            </div>
                            <div class="timeline-duration">
                                \${formatDuration(activity.duration || 0)}
                                \${activity.overtime > 0 ? '<br><span style="color: #e74c3c;">超時: ' + formatDuration(activity.overtime) + '</span>' : ''}
                            </div>
                        \`;
                        
                        timelineDiv.appendChild(div);
                    });
                }
                
                function formatDuration(seconds) {
                    if (!seconds || seconds < 0) return '0分0秒';
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    return \`\${minutes}分\${remainingSeconds}秒\`;
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
                
                loadEmployeeData();
            </script>
        </body>
        </html>
        `;
    }
}

module.exports = DetailedWebServer;