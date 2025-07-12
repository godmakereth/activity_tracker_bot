/**
 * 自動 Excel 存檔管理器
 * 每日自動生成並保存各群組的 Excel 報告
 */
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const ExcelReportGenerator = require('../excel/ExcelReportGenerator');

class AutoExcelArchiver {
    constructor(activityRepository, chatRepository) {
        this.activityRepository = activityRepository;
        this.chatRepository = chatRepository;
        this.excelGenerator = new ExcelReportGenerator();
        this.archiveBasePath = './archives/excel';
        this.timezone = 'Asia/Taipei';
    }

    /**
     * 執行每日自動存檔
     */
    async executeDaily() {
        try {
            console.log('📅 開始執行每日 Excel 自動存檔...');
            
            // 確保存檔目錄存在
            await this.ensureArchiveDirectory();
            
            // 獲取今天的日期（晚上11點執行，存檔今天的數據）
            const today = moment().tz(this.timezone);
            const targetDate = today.format('YYYY-MM-DD');
            
            console.log(`📊 目標日期: ${targetDate}`);
            
            // 獲取所有群組
            const chats = await this.getAllChats();
            console.log(`👥 找到 ${chats.length} 個群組`);
            
            let successCount = 0;
            let failCount = 0;
            
            // 為每個群組生成 Excel 報告
            for (const chat of chats) {
                try {
                    await this.archiveChatData(chat, targetDate);
                    successCount++;
                    console.log(`✅ 群組 "${chat.chat_title}" 存檔成功`);
                } catch (error) {
                    failCount++;
                    console.error(`❌ 群組 "${chat.chat_title}" 存檔失敗:`, error.message);
                }
            }
            
            console.log(`📋 每日存檔完成: 成功 ${successCount} 個，失敗 ${failCount} 個`);
            
            // 執行舊檔案清理
            await this.cleanupOldFiles();
            
        } catch (error) {
            console.error('❌ 每日 Excel 存檔執行失敗:', error);
            throw error;
        }
    }

    /**
     * 為指定群組存檔數據
     */
    async archiveChatData(chat, targetDate) {
        const chatId = chat.chat_id;
        const chatTitle = this.sanitizeFileName(chat.chat_title);
        
        // 設置時間範圍（該日期的00:00到23:59）
        const startDate = moment.tz(targetDate, this.timezone).startOf('day').toDate();
        const endDate = moment.tz(targetDate, this.timezone).endOf('day').toDate();
        
        // 獲取統計數據
        const statsData = await this.getDetailedEmployeeStats(chatId, startDate, endDate);
        
        // 檢查是否有數據
        if (statsData.summary.totalActivities === 0) {
            console.log(`⚠️ 群組 "${chat.chat_title}" 在 ${targetDate} 無活動數據，跳過存檔`);
            return;
        }
        
        // 生成 Excel 報告
        const workbook = await this.excelGenerator.generateDetailedEmployeeReport(statsData, chat.chat_title);
        const buffer = await workbook.xlsx.writeBuffer();
        
        // 建立檔案路徑：./archives/excel/2025/07/RG主控制_自動推播_2025-07-11.xlsx
        const year = moment(targetDate).format('YYYY');
        const month = moment(targetDate).format('MM');
        const fileName = `${chatTitle}_${targetDate}.xlsx`;
        
        const yearDir = path.join(this.archiveBasePath, year);
        const monthDir = path.join(yearDir, month);
        const filePath = path.join(monthDir, fileName);
        
        // 確保目錄存在
        await fs.mkdir(monthDir, { recursive: true });
        
        // 寫入檔案
        await fs.writeFile(filePath, buffer);
        
        console.log(`💾 已保存: ${filePath} (${Math.round(buffer.length / 1024)} KB)`);
        
        // 記錄存檔資訊到日誌
        await this.logArchiveOperation(chat, targetDate, filePath, buffer.length, statsData.summary);
    }

    /**
     * 獲取所有群組
     */
    async getAllChats() {
        const dbData = this.activityRepository.db.data;
        return dbData.chat_settings || [];
    }

    /**
     * 獲取詳細員工統計（複製自 DetailedWebServer）
     */
    async getDetailedEmployeeStats(chatId, startDate, endDate) {
        const dbData = this.activityRepository.db.data;
        
        // 過濾活動數據
        const activities = dbData.activities.filter(activity => {
            const activityDate = new Date(activity.start_time);
            return activity.chat_id === chatId && 
                   activityDate >= startDate && 
                   activityDate <= endDate;
        });

        // 獲取正在進行的活動
        const ongoingActivities = dbData.ongoing_activities.filter(activity => 
            activity.chat_id === chatId
        ).map(activity => {
            const duration = Math.floor((Date.now() - new Date(activity.start_time)) / 1000);
            return {
                ...activity,
                duration
            };
        });

        // 統計數據
        const employees = {};
        let totalDuration = 0;
        let totalOvertime = 0;

        // 處理已完成的活動
        activities.forEach(activity => {
            const userId = activity.user_id;
            const userName = activity.user_full_name;
            const activityType = activity.activity_type;
            const duration = activity.duration || 0;
            const overtime = activity.overtime || 0;
            const startTime = new Date(activity.start_time);

            if (!employees[userId]) {
                employees[userId] = {
                    userId,
                    userName,
                    totalActivities: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    overtimeCount: 0,
                    activities: {},
                    hourlyBreakdown: new Array(24).fill(0),
                    dailyBreakdown: {},
                    attendanceDaysCount: 0
                };
            }

            const employee = employees[userId];
            employee.totalActivities++;
            employee.totalDuration += duration;
            employee.totalOvertime += overtime;
            if (overtime > 0) employee.overtimeCount++;

            // 活動類型統計
            if (!employee.activities[activityType]) {
                employee.activities[activityType] = {
                    count: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    overtimeCount: 0,
                    durations: []
                };
            }

            const activityStat = employee.activities[activityType];
            activityStat.count++;
            activityStat.totalDuration += duration;
            activityStat.totalOvertime += overtime;
            if (overtime > 0) activityStat.overtimeCount++;
            activityStat.durations.push(duration);

            // 計算平均、最大、最小時間
            activityStat.averageDuration = Math.round(activityStat.totalDuration / activityStat.count);
            activityStat.maxDuration = Math.max(...activityStat.durations);
            activityStat.minDuration = Math.min(...activityStat.durations);

            // 時段統計
            const hour = startTime.getHours();
            employee.hourlyBreakdown[hour]++;

            // 日期統計
            const dateKey = moment(startTime).format('YYYY-MM-DD');
            if (!employee.dailyBreakdown[dateKey]) {
                employee.dailyBreakdown[dateKey] = { activities: 0, duration: 0 };
            }
            employee.dailyBreakdown[dateKey].activities++;
            employee.dailyBreakdown[dateKey].duration += duration;

            totalDuration += duration;
            totalOvertime += overtime;
        });

        // 計算衍生數據
        Object.values(employees).forEach(employee => {
            employee.averageActivityTime = employee.totalActivities > 0 ? 
                Math.round(employee.totalDuration / employee.totalActivities) : 0;
            
            employee.efficiency = employee.totalActivities > 0 ? 
                Math.round((1 - employee.overtimeCount / employee.totalActivities) * 100) : 100;
            
            employee.attendanceDaysCount = Object.keys(employee.dailyBreakdown).length;
            
            // 找出最常用的活動
            let maxCount = 0;
            let mostUsedActivity = '';
            Object.entries(employee.activities).forEach(([activityType, stats]) => {
                if (stats.count > maxCount) {
                    maxCount = stats.count;
                    mostUsedActivity = activityType;
                }
            });
            employee.mostUsedActivity = mostUsedActivity;
        });

        return {
            period: { startDate, endDate },
            summary: {
                totalEmployees: Object.keys(employees).length,
                totalActivities: activities.length,
                totalDuration,
                totalOvertime,
                activeEmployees: ongoingActivities.length
            },
            employees,
            ongoingActivities
        };
    }

    /**
     * 確保存檔目錄存在
     */
    async ensureArchiveDirectory() {
        try {
            await fs.mkdir(this.archiveBasePath, { recursive: true });
            console.log(`📁 存檔目錄已準備: ${this.archiveBasePath}`);
        } catch (error) {
            console.error('❌ 創建存檔目錄失敗:', error);
            throw error;
        }
    }

    /**
     * 清理舊檔案（保留90天）
     */
    async cleanupOldFiles() {
        try {
            console.log('🧹 開始清理舊檔案...');
            
            const cutoffDate = moment().tz(this.timezone).subtract(90, 'days');
            let deletedCount = 0;
            
            // 掃描年份目錄
            const years = await this.getDirectories(this.archiveBasePath);
            
            for (const year of years) {
                const yearPath = path.join(this.archiveBasePath, year);
                const months = await this.getDirectories(yearPath);
                
                for (const month of months) {
                    const monthPath = path.join(yearPath, month);
                    const files = await fs.readdir(monthPath);
                    
                    for (const file of files) {
                        if (file.endsWith('.xlsx')) {
                            // 從檔名提取日期
                            const dateMatch = file.match(/_(\d{4}-\d{2}-\d{2})\.xlsx$/);
                            if (dateMatch) {
                                const fileDate = moment(dateMatch[1]);
                                if (fileDate.isBefore(cutoffDate)) {
                                    const filePath = path.join(monthPath, file);
                                    await fs.unlink(filePath);
                                    deletedCount++;
                                    console.log(`🗑️ 已刪除舊檔案: ${file}`);
                                }
                            }
                        }
                    }
                    
                    // 檢查月份目錄是否為空，如果是則刪除
                    const remainingFiles = await fs.readdir(monthPath);
                    if (remainingFiles.length === 0) {
                        await fs.rmdir(monthPath);
                        console.log(`📂 已刪除空月份目錄: ${monthPath}`);
                    }
                }
                
                // 檢查年份目錄是否為空
                const remainingMonths = await this.getDirectories(yearPath);
                if (remainingMonths.length === 0) {
                    await fs.rmdir(yearPath);
                    console.log(`📂 已刪除空年份目錄: ${yearPath}`);
                }
            }
            
            console.log(`🧹 清理完成: 刪除了 ${deletedCount} 個舊檔案`);
            
        } catch (error) {
            console.error('❌ 清理舊檔案失敗:', error);
        }
    }

    /**
     * 記錄存檔操作到日誌
     */
    async logArchiveOperation(chat, targetDate, filePath, fileSize, summary) {
        const logEntry = {
            timestamp: moment().tz(this.timezone).format('YYYY-MM-DD HH:mm:ss'),
            chatId: chat.chat_id,
            chatTitle: chat.chat_title,
            targetDate,
            filePath,
            fileSize,
            totalActivities: summary.totalActivities,
            totalEmployees: summary.totalEmployees,
            totalDuration: summary.totalDuration
        };

        const logFile = path.join(this.archiveBasePath, 'archive_log.json');
        
        try {
            let logs = [];
            try {
                const logData = await fs.readFile(logFile, 'utf8');
                logs = JSON.parse(logData);
            } catch (error) {
                // 檔案不存在或解析失敗，使用空陣列
            }
            
            logs.push(logEntry);
            
            // 只保留最近1000條記錄
            if (logs.length > 1000) {
                logs = logs.slice(-1000);
            }
            
            await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
            
        } catch (error) {
            console.error('❌ 寫入存檔日誌失敗:', error);
        }
    }

    /**
     * 清理檔案名稱中的非法字符
     */
    sanitizeFileName(fileName) {
        return fileName
            .replace(/[<>:"/\\|?*]/g, '_')  // 替換非法字符
            .replace(/\s+/g, '_')          // 空格替換為下劃線
            .trim();
    }

    /**
     * 獲取目錄下的所有子目錄
     */
    async getDirectories(dirPath) {
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            return items
                .filter(item => item.isDirectory())
                .map(item => item.name);
        } catch (error) {
            return [];
        }
    }

    /**
     * 手動觸發存檔（用於測試）
     */
    async manualArchive(chatId, targetDate = null) {
        try {
            const date = targetDate || moment().tz(this.timezone).subtract(1, 'day').format('YYYY-MM-DD');
            const chat = await this.getChatById(chatId);
            
            if (!chat) {
                throw new Error(`找不到群組 ID: ${chatId}`);
            }
            
            console.log(`📊 手動存檔群組 "${chat.chat_title}" 的 ${date} 數據...`);
            
            await this.ensureArchiveDirectory();
            await this.archiveChatData(chat, date);
            
            console.log('✅ 手動存檔完成');
            
        } catch (error) {
            console.error('❌ 手動存檔失敗:', error);
            throw error;
        }
    }

    /**
     * 根據 ID 獲取群組資訊
     */
    async getChatById(chatId) {
        const chats = await this.getAllChats();
        return chats.find(chat => chat.chat_id === chatId);
    }
}

module.exports = AutoExcelArchiver;