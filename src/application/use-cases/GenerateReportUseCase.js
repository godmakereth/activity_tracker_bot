/**
 * 報告生成用例
 */
const moment = require('moment-timezone');

class GenerateReportUseCase {
    constructor(activityRepository, chatRepository, reportGenerator) {
        this.activityRepository = activityRepository;
        this.chatRepository = chatRepository;
        this.reportGenerator = reportGenerator;
        this.timezone = 'Asia/Taipei';
    }

    /**
     * 生成單一聊天室的日報
     * @param {string} chatId 聊天室ID
     * @param {Date} date 日期
     * @returns {Object} 生成結果
     */
    async generateDailyReport(chatId, date) {
        try {
            // 獲取聊天室資訊
            const chat = await this.chatRepository.findById(chatId);
            if (!chat) {
                throw new Error(`聊天室 ${chatId} 不存在`);
            }

            // 檢查是否啟用報告功能
            if (!chat.reportEnabled) {
                return {
                    success: false,
                    message: '聊天室未啟用報告功能',
                    chatId,
                    date
                };
            }

            // 獲取當日統計資料
            const startDate = moment(date).tz(this.timezone).startOf('day').toDate();
            const endDate = moment(date).tz(this.timezone).endOf('day').toDate();
            
            const statistics = await this.activityRepository.getStatistics(chatId, startDate, endDate);

            // 生成報告檔案
            const reportPath = await this.reportGenerator.generateDailyReport(
                chatId,
                chat.chatTitle,
                date,
                statistics
            );

            return {
                success: true,
                message: '報告生成成功',
                chatId,
                chatTitle: chat.chatTitle,
                date,
                reportPath,
                statistics: this.summarizeStatistics(statistics)
            };
        } catch (error) {
            console.error(`生成聊天室 ${chatId} 日報失敗:`, error);
            return {
                success: false,
                message: error.message,
                chatId,
                date,
                error: error.message
            };
        }
    }

    /**
     * 為所有聊天室生成日報
     * @param {Date} date 日期
     * @returns {Array} 生成結果列表
     */
    async generateDailyReportsForAllChats(date) {
        try {
            // 獲取所有啟用報告功能的聊天室
            const chats = await this.chatRepository.findReportEnabledChats();
            
            if (chats.length === 0) {
                console.log('⚠️ 沒有啟用報告功能的聊天室');
                return [];
            }

            console.log(`📊 開始為 ${chats.length} 個聊天室生成日報`);

            // 為每個聊天室生成報告
            const results = [];
            for (const chat of chats) {
                const result = await this.generateDailyReport(chat.chatId, date);
                results.push(result);
                
                // 添加延遲避免過快執行
                await this.delay(100);
            }

            // 統計生成結果
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;

            console.log(`📊 日報生成完成: 成功 ${successCount}，失敗 ${failureCount}`);

            return results;
        } catch (error) {
            console.error('批量生成日報失敗:', error);
            throw error;
        }
    }

    /**
     * 生成指定時間範圍的統計報告
     * @param {string} chatId 聊天室ID
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     * @returns {Object} 統計報告
     */
    async generateStatisticsReport(chatId, startDate, endDate) {
        try {
            // 獲取聊天室資訊
            const chat = await this.chatRepository.findById(chatId);
            if (!chat) {
                throw new Error(`聊天室 ${chatId} 不存在`);
            }

            // 獲取統計資料
            const statistics = await this.activityRepository.getStatistics(chatId, startDate, endDate);

            // 生成報告內容
            const report = {
                chatId,
                chatTitle: chat.chatTitle,
                startDate,
                endDate,
                period: this.calculatePeriod(startDate, endDate),
                summary: this.summarizeStatistics(statistics),
                userStatistics: this.groupStatisticsByUser(statistics),
                activityStatistics: this.groupStatisticsByActivity(statistics),
                generatedAt: new Date()
            };

            return report;
        } catch (error) {
            console.error(`生成統計報告失敗:`, error);
            throw error;
        }
    }

    /**
     * 生成今日實時報告
     * @param {string} chatId 聊天室ID
     * @returns {Object} 實時報告
     */
    async generateTodayReport(chatId) {
        const today = moment().tz(this.timezone).startOf('day').toDate();
        const now = moment().tz(this.timezone).toDate();
        
        return await this.generateStatisticsReport(chatId, today, now);
    }

    /**
     * 生成週報
     * @param {string} chatId 聊天室ID
     * @param {Date} weekStart 週開始日期
     * @returns {Object} 週報
     */
    async generateWeeklyReport(chatId, weekStart) {
        const weekEnd = moment(weekStart).tz(this.timezone).add(6, 'days').endOf('day').toDate();
        
        const report = await this.generateStatisticsReport(chatId, weekStart, weekEnd);
        report.reportType = 'weekly';
        
        return report;
    }

    /**
     * 生成月報
     * @param {string} chatId 聊天室ID
     * @param {Date} monthStart 月開始日期
     * @returns {Object} 月報
     */
    async generateMonthlyReport(chatId, monthStart) {
        const monthEnd = moment(monthStart).tz(this.timezone).endOf('month').toDate();
        
        const report = await this.generateStatisticsReport(chatId, monthStart, monthEnd);
        report.reportType = 'monthly';
        
        return report;
    }

    /**
     * 檢查是否需要生成報告
     * @param {string} chatId 聊天室ID
     * @param {Date} date 日期
     * @returns {boolean} 是否需要生成
     */
    async shouldGenerateReport(chatId, date) {
        try {
            const chat = await this.chatRepository.findById(chatId);
            if (!chat || !chat.reportEnabled) {
                return false;
            }

            // 檢查是否已經生成過報告
            const reportExists = this.reportGenerator.reportExists(chat.chatTitle, date);
            if (reportExists) {
                return false;
            }

            // 檢查是否有活動資料
            const startDate = moment(date).tz(this.timezone).startOf('day').toDate();
            const endDate = moment(date).tz(this.timezone).endOf('day').toDate();
            const statistics = await this.activityRepository.getStatistics(chatId, startDate, endDate);
            
            return statistics.length > 0;
        } catch (error) {
            console.error('檢查報告生成條件失敗:', error);
            return false;
        }
    }

    /**
     * 重新生成報告
     * @param {string} chatId 聊天室ID
     * @param {Date} date 日期
     * @returns {Object} 生成結果
     */
    async regenerateReport(chatId, date) {
        try {
            const chat = await this.chatRepository.findById(chatId);
            if (!chat) {
                throw new Error(`聊天室 ${chatId} 不存在`);
            }

            // 刪除舊報告
            this.reportGenerator.deleteReport(chat.chatTitle, date);
            
            // 重新生成報告
            return await this.generateDailyReport(chatId, date);
        } catch (error) {
            console.error('重新生成報告失敗:', error);
            throw error;
        }
    }

    /**
     * 彙總統計資料
     * @param {Array} statistics 統計資料
     * @returns {Object} 彙總結果
     */
    summarizeStatistics(statistics) {
        const summary = {
            totalActivities: 0,
            totalDuration: 0,
            totalOvertime: 0,
            totalOvertimeCount: 0,
            uniqueUsers: new Set(),
            uniqueActivityTypes: new Set()
        };

        statistics.forEach(stat => {
            summary.totalActivities += stat.count;
            summary.totalDuration += stat.totalDuration;
            summary.totalOvertime += stat.totalOvertime;
            summary.totalOvertimeCount += stat.overtimeCount;
            summary.uniqueUsers.add(stat.userFullName);
            summary.uniqueActivityTypes.add(stat.activityType);
        });

        return {
            totalActivities: summary.totalActivities,
            totalDuration: summary.totalDuration,
            totalOvertime: summary.totalOvertime,
            totalOvertimeCount: summary.totalOvertimeCount,
            uniqueUsers: summary.uniqueUsers.size,
            uniqueActivityTypes: summary.uniqueActivityTypes.size,
            averageDuration: summary.totalActivities > 0 ? Math.round(summary.totalDuration / summary.totalActivities) : 0
        };
    }

    /**
     * 按用戶分組統計
     * @param {Array} statistics 統計資料
     * @returns {Object} 按用戶分組的統計
     */
    groupStatisticsByUser(statistics) {
        const userStats = {};
        
        statistics.forEach(stat => {
            const userName = stat.userFullName;
            
            if (!userStats[userName]) {
                userStats[userName] = {
                    totalActivities: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    totalOvertimeCount: 0,
                    activities: {}
                };
            }
            
            const userStat = userStats[userName];
            userStat.totalActivities += stat.count;
            userStat.totalDuration += stat.totalDuration;
            userStat.totalOvertime += stat.totalOvertime;
            userStat.totalOvertimeCount += stat.overtimeCount;
            
            userStat.activities[stat.activityType] = {
                count: stat.count,
                totalDuration: stat.totalDuration,
                totalOvertime: stat.totalOvertime,
                overtimeCount: stat.overtimeCount
            };
        });
        
        return userStats;
    }

    /**
     * 按活動類型分組統計
     * @param {Array} statistics 統計資料
     * @returns {Object} 按活動類型分組的統計
     */
    groupStatisticsByActivity(statistics) {
        const activityStats = {};
        
        statistics.forEach(stat => {
            const activityType = stat.activityType;
            
            if (!activityStats[activityType]) {
                activityStats[activityType] = {
                    totalActivities: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    totalOvertimeCount: 0,
                    uniqueUsers: new Set()
                };
            }
            
            const activityStat = activityStats[activityType];
            activityStat.totalActivities += stat.count;
            activityStat.totalDuration += stat.totalDuration;
            activityStat.totalOvertime += stat.totalOvertime;
            activityStat.totalOvertimeCount += stat.overtimeCount;
            activityStat.uniqueUsers.add(stat.userFullName);
        });
        
        // 轉換 Set 為數量
        Object.values(activityStats).forEach(stat => {
            stat.uniqueUsers = stat.uniqueUsers.size;
        });
        
        return activityStats;
    }

    /**
     * 計算時間期間
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     * @returns {Object} 期間資訊
     */
    calculatePeriod(startDate, endDate) {
        const start = moment(startDate).tz(this.timezone);
        const end = moment(endDate).tz(this.timezone);
        const duration = moment.duration(end.diff(start));
        
        return {
            startDate: start.format('YYYY-MM-DD'),
            endDate: end.format('YYYY-MM-DD'),
            days: Math.ceil(duration.asDays()),
            hours: Math.ceil(duration.asHours()),
            isToday: start.isSame(moment().tz(this.timezone), 'day'),
            isThisWeek: start.isSame(moment().tz(this.timezone), 'week'),
            isThisMonth: start.isSame(moment().tz(this.timezone), 'month')
        };
    }

    /**
     * 延遲函數
     * @param {number} ms 毫秒數
     * @returns {Promise} Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = GenerateReportUseCase;