/**
 * 定時任務管理器
 */
const cron = require('node-cron');
const moment = require('moment-timezone');
const AutoExcelArchiver = require('../file-system/AutoExcelArchiver');

class ScheduledTaskManager {
    constructor() {
        this.tasks = new Map();
        this.isRunning = false;
        this.timezone = 'Asia/Taipei';
        this.activityRepository = null;
        this.chatRepository = null;
        this.reportGenerator = null;
        this.autoExcelArchiver = null;
    }

    /**
     * 設置依賴
     */
    setDependencies(activityRepository, chatRepository, reportGenerator) {
        this.activityRepository = activityRepository;
        this.chatRepository = chatRepository;
        this.reportGenerator = reportGenerator;
        this.autoExcelArchiver = new AutoExcelArchiver(activityRepository, chatRepository);
    }

    /**
     * 初始化定時任務管理器
     */
    initialize() {
        console.log('✅ 定時任務管理器已初始化');
        this.isRunning = true;
        
        // 設定默認任務
        this.setupDefaultTasks();
    }

    /**
     * 設定默認任務
     */
    setupDefaultTasks() {
        // 每日報告任務 (23:00)
        this.scheduleTask('daily-report', '0 23 * * *', async () => {
            await this.executeDailyReportTask();
        });

        // Excel 自動存檔任務 (23:00 - 與每日報告同時執行)
        this.scheduleTask('daily-excel-archive', '0 23 * * *', async () => {
            await this.executeExcelArchiveTask();
        });

        // 清理過期資料任務 (02:00)
        this.scheduleTask('cleanup-stale-data', '0 2 * * *', async () => {
            await this.executeCleanupTask();
        });

        // 健康檢查任務 (每小時)
        this.scheduleTask('health-check', '0 * * * *', async () => {
            await this.executeHealthCheckTask();
        });
    }

    /**
     * 調度任務
     * @param {string} name 任務名稱
     * @param {string} cronExpression Cron 表達式
     * @param {Function} handler 任務處理函數
     * @param {Object} options 選項
     */
    scheduleTask(name, cronExpression, handler, options = {}) {
        try {
            if (this.tasks.has(name)) {
                console.log(`⚠️ 任務 ${name} 已存在，將覆蓋舊任務`);
                this.cancelTask(name);
            }

            const task = cron.schedule(cronExpression, async () => {
                const startTime = Date.now();
                console.log(`⏰ 開始執行定時任務: ${name}`);
                
                try {
                    await handler();
                    const duration = Date.now() - startTime;
                    console.log(`✅ 任務 ${name} 執行完成，耗時 ${duration}ms`);
                } catch (error) {
                    console.error(`❌ 任務 ${name} 執行失敗:`, error);
                }
            }, {
                scheduled: options.autoStart !== false,
                timezone: options.timezone || this.timezone
            });

            this.tasks.set(name, {
                task,
                cronExpression,
                handler,
                options,
                createdAt: new Date(),
                lastExecution: null,
                executionCount: 0
            });

            console.log(`✅ 定時任務 ${name} 已調度 (${cronExpression})`);
        } catch (error) {
            console.error(`❌ 調度任務 ${name} 失敗:`, error);
            throw error;
        }
    }

    /**
     * 取消任務
     * @param {string} name 任務名稱
     */
    cancelTask(name) {
        if (this.tasks.has(name)) {
            const taskInfo = this.tasks.get(name);
            taskInfo.task.stop();
            this.tasks.delete(name);
            console.log(`✅ 任務 ${name} 已取消`);
        } else {
            console.log(`⚠️ 任務 ${name} 不存在`);
        }
    }

    /**
     * 啟動所有任務
     */
    startAllTasks() {
        this.tasks.forEach((taskInfo, name) => {
            taskInfo.task.start();
            console.log(`✅ 任務 ${name} 已啟動`);
        });
    }

    /**
     * 停止所有任務
     */
    stopAllTasks() {
        this.tasks.forEach((taskInfo, name) => {
            taskInfo.task.stop();
            console.log(`⏸️ 任務 ${name} 已停止`);
        });
    }

    /**
     * 獲取任務狀態
     * @param {string} name 任務名稱
     * @returns {Object|null} 任務狀態
     */
    getTaskStatus(name) {
        if (!this.tasks.has(name)) {
            return null;
        }

        const taskInfo = this.tasks.get(name);
        return {
            name,
            cronExpression: taskInfo.cronExpression,
            isRunning: taskInfo.task.running,
            createdAt: taskInfo.createdAt,
            lastExecution: taskInfo.lastExecution,
            executionCount: taskInfo.executionCount
        };
    }

    /**
     * 獲取所有任務狀態
     * @returns {Array} 所有任務狀態
     */
    getAllTasksStatus() {
        return Array.from(this.tasks.keys()).map(name => this.getTaskStatus(name));
    }

    /**
     * 立即執行任務
     * @param {string} name 任務名稱
     */
    async executeTask(name) {
        if (!this.tasks.has(name)) {
            throw new Error(`任務 ${name} 不存在`);
        }

        const taskInfo = this.tasks.get(name);
        console.log(`🚀 手動執行任務: ${name}`);
        
        const startTime = Date.now();
        try {
            await taskInfo.handler();
            const duration = Date.now() - startTime;
            
            // 更新執行記錄
            taskInfo.lastExecution = new Date();
            taskInfo.executionCount++;
            
            console.log(`✅ 任務 ${name} 手動執行完成，耗時 ${duration}ms`);
        } catch (error) {
            console.error(`❌ 任務 ${name} 手動執行失敗:`, error);
            throw error;
        }
    }

    /**
     * 執行每日報告任務
     */
    async executeDailyReportTask() {
        try {
            // 需要從依賴注入容器獲取相關服務
            const { container } = require('../../shared/DependencyContainer');
            const generateReportUseCase = container.get('generateReportUseCase');
            
            if (!generateReportUseCase) {
                console.log('⚠️ 報告生成用例未註冊，跳過每日報告任務');
                return;
            }

            const yesterday = moment().tz(this.timezone).subtract(1, 'day').toDate();
            await generateReportUseCase.generateDailyReportsForAllChats(yesterday);
            
            console.log('✅ 每日報告任務執行完成');
        } catch (error) {
            console.error('❌ 每日報告任務執行失敗:', error);
        }
    }

    /**
     * 執行清理過期資料任務
     */
    async executeCleanupTask() {
        try {
            const { container } = require('../../shared/DependencyContainer');
            const activityRepository = container.get('activityRepository');
            
            if (!activityRepository) {
                console.log('⚠️ 活動倉庫未註冊，跳過清理任務');
                return;
            }

            // 清理過期的正在進行活動
            const cleanedCount = await activityRepository.cleanupStaleOngoingActivities();
            console.log(`✅ 清理任務完成，清理了 ${cleanedCount} 條過期記錄`);
        } catch (error) {
            console.error('❌ 清理任務執行失敗:', error);
        }
    }

    /**
     * 執行健康檢查任務
     */
    async executeHealthCheckTask() {
        try {
            const { container } = require('../../shared/DependencyContainer');
            const databaseConnection = container.get('databaseConnection');
            
            if (!databaseConnection) {
                console.log('⚠️ 資料庫連接未註冊，跳過健康檢查');
                return;
            }

            const isHealthy = databaseConnection.isHealthy();
            if (!isHealthy) {
                console.error('❌ 資料庫健康檢查失敗');
                // 可以在這裡加入通知邏輯
            } else {
                console.log('✅ 系統健康檢查通過');
            }
        } catch (error) {
            console.error('❌ 健康檢查任務執行失敗:', error);
        }
    }

    /**
     * 執行 Excel 自動存檔任務
     */
    async executeExcelArchiveTask() {
        try {
            if (!this.autoExcelArchiver) {
                console.log('⚠️ Excel 存檔器未初始化，跳過存檔任務');
                return;
            }

            console.log('🗃️ 開始執行 Excel 自動存檔任務...');
            await this.autoExcelArchiver.executeDaily();
            console.log('✅ Excel 自動存檔任務執行完成');
        } catch (error) {
            console.error('❌ Excel 自動存檔任務執行失敗:', error);
        }
    }

    /**
     * 設定每日報告時間
     * @param {string} time 時間格式 HH:mm
     */
    setDailyReportTime(time) {
        const [hour, minute] = time.split(':');
        const cronExpression = `${minute || '0'} ${hour || '23'} * * *`;
        
        this.scheduleTask('daily-report', cronExpression, async () => {
            await this.executeDailyReportTask();
        });
        
        console.log(`✅ 每日報告時間已設定為 ${time}`);
    }

    /**
     * 獲取下次執行時間
     * @param {string} cronExpression Cron 表達式
     * @returns {Date|null} 下次執行時間
     */
    getNextExecutionTime(cronExpression) {
        try {
            const task = cron.schedule(cronExpression, () => {}, {
                scheduled: false,
                timezone: this.timezone
            });
            
            // 這裡需要使用 node-cron 的內部方法，實際實現可能需要調整
            return null; // 簡化實現
        } catch (error) {
            console.error('獲取下次執行時間失敗:', error);
            return null;
        }
    }

    /**
     * 驗證 Cron 表達式
     * @param {string} cronExpression Cron 表達式
     * @returns {boolean} 是否有效
     */
    validateCronExpression(cronExpression) {
        return cron.validate(cronExpression);
    }

    /**
     * 關閉定時任務管理器
     */
    shutdown() {
        console.log('🛑 正在關閉定時任務管理器...');
        this.stopAllTasks();
        this.tasks.clear();
        this.isRunning = false;
        console.log('✅ 定時任務管理器已關閉');
    }

    /**
     * 獲取管理器狀態
     * @returns {Object} 管理器狀態
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            timezone: this.timezone,
            taskCount: this.tasks.size,
            tasks: this.getAllTasksStatus()
        };
    }
}

module.exports = ScheduledTaskManager;