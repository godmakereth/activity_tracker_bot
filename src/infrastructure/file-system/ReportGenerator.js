/**
 * 報告生成器
 */
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { ActivityTypeHelper } = require('../../shared/constants/ActivityTypes');

class ReportGenerator {
    constructor(config) {
        this.baseDir = config.baseDir || './statistics';
        this.timezone = config.timezone || 'Asia/Taipei';
        this.encoding = config.encoding || 'utf8';
        
        // 確保基礎目錄存在
        this.ensureBaseDirectory();
    }

    /**
     * 確保基礎目錄存在
     */
    ensureBaseDirectory() {
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
            console.log(`✅ 創建報告目錄: ${this.baseDir}`);
        }
    }

    /**
     * 生成日報檔案
     * @param {string} chatId 聊天室ID
     * @param {string} chatTitle 聊天室標題
     * @param {Date} date 日期
     * @param {Array} statistics 統計資料
     * @returns {string} 生成的檔案路徑
     */
    async generateDailyReport(chatId, chatTitle, date, statistics) {
        try {
            // 格式化日期
            const dateStr = moment(date).tz(this.timezone).format('YYYY-MM-DD');
            
            // 生成報告內容
            const reportContent = this.generateReportContent(chatTitle, dateStr, statistics);
            
            // 確保聊天室目錄存在
            const chatDir = path.join(this.baseDir, this.sanitizeChatTitle(chatTitle));
            if (!fs.existsSync(chatDir)) {
                fs.mkdirSync(chatDir, { recursive: true });
            }
            
            // 生成檔案路徑
            const filePath = path.join(chatDir, `${dateStr}.txt`);
            
            // 寫入檔案
            fs.writeFileSync(filePath, reportContent, this.encoding);
            
            console.log(`✅ 生成日報: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('生成日報失敗:', error);
            throw error;
        }
    }

    /**
     * 生成報告內容
     * @param {string} chatTitle 聊天室標題
     * @param {string} dateStr 日期字串
     * @param {Array} statistics 統計資料
     * @returns {string} 報告內容
     */
    generateReportContent(chatTitle, dateStr, statistics) {
        const lines = [];
        
        // 標題
        lines.push(`📊 ${chatTitle} - ${dateStr} 活動統計報告`);
        lines.push('======================================');
        lines.push('');
        
        if (statistics.length === 0) {
            lines.push('📋 本日無活動記錄');
            lines.push('');
            return lines.join('\n');
        }
        
        // 按用戶分組統計
        const userStats = this.groupStatisticsByUser(statistics);
        
        // 總覽
        const overview = this.generateOverview(statistics);
        lines.push('📋 總覽');
        lines.push(`- 總活動次數: ${overview.totalCount}`);
        lines.push(`- 總活動時間: ${this.formatDuration(overview.totalDuration)}`);
        lines.push(`- 總超時時間: ${this.formatDuration(overview.totalOvertime)}`);
        lines.push(`- 總超時次數: ${overview.totalOvertimeCount}`);
        lines.push(`- 參與人數: ${Object.keys(userStats).length}`);
        lines.push('');
        
        // 用戶統計
        lines.push('👥 用戶統計');
        lines.push('--------------------------------------');
        
        Object.entries(userStats).forEach(([userName, stats]) => {
            lines.push(`👤 ${userName}`);
            lines.push(`📈 總計:`);
            lines.push(`   🔢 總次數: ${stats.totalCount} 次`);
            lines.push(`   ⏱️ 總時間: ${this.formatDuration(stats.totalDuration)}`);
            lines.push(`   ⚠️ 總超時: ${this.formatDuration(stats.totalOvertime)}`);
            lines.push(`   ❌ 超時次數: ${stats.totalOvertimeCount} 次`);
            lines.push('');
            
            lines.push('📊 活動明細:');
            Object.entries(stats.activities).forEach(([activityType, activityStats]) => {
                const config = ActivityTypeHelper.getConfig(activityType);
                const emoji = config ? config.emoji : '📝';
                const name = config ? config.name : activityType;
                
                lines.push(`   ${emoji} ${name}:`);
                lines.push(`     🔢 次數: ${activityStats.count} 次`);
                lines.push(`     ⏱️ 時間: ${this.formatDuration(activityStats.totalDuration)}`);
                lines.push(`     📊 平均: ${this.formatDuration(activityStats.avgDuration)}`);
                
                if (activityStats.totalOvertime > 0) {
                    lines.push(`     ⚠️ 超時: ${this.formatDuration(activityStats.totalOvertime)}`);
                    lines.push(`     ❌ 超時次數: ${activityStats.overtimeCount} 次`);
                }
            });
            lines.push('');
        });
        
        // 活動分析
        lines.push('📈 活動分析');
        lines.push('--------------------------------------');
        const activityAnalysis = this.generateActivityAnalysis(statistics);
        
        Object.entries(activityAnalysis).forEach(([activityType, analysis]) => {
            const config = ActivityTypeHelper.getConfig(activityType);
            const emoji = config ? config.emoji : '📝';
            const name = config ? config.name : activityType;
            
            lines.push(`${emoji} ${name}:`);
            lines.push(`   📊 總次數: ${analysis.totalCount} 次`);
            lines.push(`   ⏱️ 總時間: ${this.formatDuration(analysis.totalDuration)}`);
            lines.push(`   📊 平均時間: ${this.formatDuration(analysis.avgDuration)}`);
            lines.push(`   👥 參與人數: ${analysis.uniqueUsers} 人`);
            
            if (analysis.totalOvertime > 0) {
                lines.push(`   ⚠️ 超時情況: ${analysis.overtimeCount} 次 (${this.formatDuration(analysis.totalOvertime)})`);
            }
            lines.push('');
        });
        
        // 超時警告
        const overtimeWarnings = this.generateOvertimeWarnings(statistics);
        if (overtimeWarnings.length > 0) {
            lines.push('⚠️ 超時警告');
            lines.push('--------------------------------------');
            overtimeWarnings.forEach(warning => {
                lines.push(`❌ ${warning.userName} - ${warning.activityName}: 超時 ${this.formatDuration(warning.overtime)}`);
            });
            lines.push('');
        }
        
        // 生成時間戳記
        lines.push('--------------------------------------');
        lines.push(`📅 報告生成時間: ${moment().tz(this.timezone).format('YYYY-MM-DD HH:mm:ss')}`);
        lines.push('🤖 由 Activity Tracker Bot 自動生成');
        
        return lines.join('\n');
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
                    totalCount: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    totalOvertimeCount: 0,
                    activities: {}
                };
            }
            
            const userStat = userStats[userName];
            userStat.totalCount += stat.count;
            userStat.totalDuration += stat.totalDuration;
            userStat.totalOvertime += stat.totalOvertime;
            userStat.totalOvertimeCount += stat.overtimeCount;
            
            userStat.activities[stat.activityType] = {
                count: stat.count,
                totalDuration: stat.totalDuration,
                avgDuration: Math.round(stat.totalDuration / stat.count),
                totalOvertime: stat.totalOvertime,
                overtimeCount: stat.overtimeCount
            };
        });
        
        return userStats;
    }

    /**
     * 生成總覽統計
     * @param {Array} statistics 統計資料
     * @returns {Object} 總覽統計
     */
    generateOverview(statistics) {
        const overview = {
            totalCount: 0,
            totalDuration: 0,
            totalOvertime: 0,
            totalOvertimeCount: 0
        };
        
        statistics.forEach(stat => {
            overview.totalCount += stat.count;
            overview.totalDuration += stat.totalDuration;
            overview.totalOvertime += stat.totalOvertime;
            overview.totalOvertimeCount += stat.overtimeCount;
        });
        
        return overview;
    }

    /**
     * 生成活動分析
     * @param {Array} statistics 統計資料
     * @returns {Object} 活動分析
     */
    generateActivityAnalysis(statistics) {
        const analysis = {};
        
        statistics.forEach(stat => {
            const activityType = stat.activityType;
            
            if (!analysis[activityType]) {
                analysis[activityType] = {
                    totalCount: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    overtimeCount: 0,
                    uniqueUsers: new Set()
                };
            }
            
            const activityAnalysis = analysis[activityType];
            activityAnalysis.totalCount += stat.count;
            activityAnalysis.totalDuration += stat.totalDuration;
            activityAnalysis.totalOvertime += stat.totalOvertime;
            activityAnalysis.overtimeCount += stat.overtimeCount;
            activityAnalysis.uniqueUsers.add(stat.userFullName);
        });
        
        // 計算平均時間並轉換 Set 為數量
        Object.values(analysis).forEach(activityAnalysis => {
            activityAnalysis.avgDuration = Math.round(activityAnalysis.totalDuration / activityAnalysis.totalCount);
            activityAnalysis.uniqueUsers = activityAnalysis.uniqueUsers.size;
        });
        
        return analysis;
    }

    /**
     * 生成超時警告
     * @param {Array} statistics 統計資料
     * @returns {Array} 超時警告列表
     */
    generateOvertimeWarnings(statistics) {
        const warnings = [];
        
        statistics.forEach(stat => {
            if (stat.totalOvertime > 0) {
                const config = ActivityTypeHelper.getConfig(stat.activityType);
                const activityName = config ? config.name : stat.activityType;
                
                warnings.push({
                    userName: stat.userFullName,
                    activityName: activityName,
                    overtime: stat.totalOvertime,
                    overtimeCount: stat.overtimeCount
                });
            }
        });
        
        return warnings.sort((a, b) => b.overtime - a.overtime);
    }

    /**
     * 格式化時間
     * @param {number} seconds 秒數
     * @returns {string} 格式化的時間字串
     */
    formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0 分 0 秒';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes} 分 ${remainingSeconds} 秒`;
    }

    /**
     * 清理聊天室標題，用於檔案目錄名稱
     * @param {string} chatTitle 聊天室標題
     * @returns {string} 清理後的標題
     */
    sanitizeChatTitle(chatTitle) {
        // 移除不適合作為檔案名稱的字符
        return chatTitle
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50); // 限制長度
    }

    /**
     * 獲取報告檔案路徑
     * @param {string} chatTitle 聊天室標題
     * @param {Date} date 日期
     * @returns {string} 報告檔案路徑
     */
    getReportFilePath(chatTitle, date) {
        const dateStr = moment(date).tz(this.timezone).format('YYYY-MM-DD');
        const chatDir = this.sanitizeChatTitle(chatTitle);
        return path.join(this.baseDir, chatDir, `${dateStr}.txt`);
    }

    /**
     * 檢查報告檔案是否存在
     * @param {string} chatTitle 聊天室標題
     * @param {Date} date 日期
     * @returns {boolean} 是否存在
     */
    reportExists(chatTitle, date) {
        const filePath = this.getReportFilePath(chatTitle, date);
        return fs.existsSync(filePath);
    }

    /**
     * 讀取報告檔案
     * @param {string} chatTitle 聊天室標題
     * @param {Date} date 日期
     * @returns {string|null} 報告內容
     */
    readReport(chatTitle, date) {
        try {
            const filePath = this.getReportFilePath(chatTitle, date);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            return fs.readFileSync(filePath, this.encoding);
        } catch (error) {
            console.error('讀取報告檔案失敗:', error);
            return null;
        }
    }

    /**
     * 刪除報告檔案
     * @param {string} chatTitle 聊天室標題
     * @param {Date} date 日期
     * @returns {boolean} 是否成功刪除
     */
    deleteReport(chatTitle, date) {
        try {
            const filePath = this.getReportFilePath(chatTitle, date);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('刪除報告檔案失敗:', error);
            return false;
        }
    }

    /**
     * 獲取聊天室的所有報告檔案
     * @param {string} chatTitle 聊天室標題
     * @returns {Array} 報告檔案列表
     */
    getChatReports(chatTitle) {
        try {
            const chatDir = path.join(this.baseDir, this.sanitizeChatTitle(chatTitle));
            if (!fs.existsSync(chatDir)) {
                return [];
            }
            
            const files = fs.readdirSync(chatDir);
            return files
                .filter(file => file.endsWith('.txt'))
                .map(file => {
                    const filePath = path.join(chatDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        filename: file,
                        path: filePath,
                        date: file.replace('.txt', ''),
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime
                    };
                })
                .sort((a, b) => b.date.localeCompare(a.date));
        } catch (error) {
            console.error('獲取聊天室報告檔案失敗:', error);
            return [];
        }
    }
}

module.exports = ReportGenerator;