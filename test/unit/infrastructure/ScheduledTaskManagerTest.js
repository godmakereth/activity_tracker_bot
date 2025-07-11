/**
 * ScheduledTaskManager 測試
 */
const assert = require('assert');
const ScheduledTaskManager = require('../../../src/infrastructure/scheduling/ScheduledTaskManager');

describe('ScheduledTaskManager Tests', () => {
    let taskManager;

    beforeEach(() => {
        taskManager = new ScheduledTaskManager();
    });

    afterEach(() => {
        if (taskManager && taskManager.isRunning) {
            taskManager.shutdown();
        }
    });

    describe('Initialization', () => {
        it('should initialize successfully', () => {
            taskManager.initialize();
            assert.strictEqual(taskManager.isRunning, true);
        });

        it('should set up default tasks', () => {
            taskManager.initialize();
            
            const status = taskManager.getStatus();
            assert.ok(status.taskCount > 0);
            
            // 檢查默認任務是否存在
            const taskStatus = taskManager.getTaskStatus('daily-report');
            assert.ok(taskStatus);
            assert.strictEqual(taskStatus.name, 'daily-report');
            assert.strictEqual(taskStatus.cronExpression, '0 23 * * *');
        });
    });

    describe('Task Management', () => {
        beforeEach(() => {
            taskManager.initialize();
        });

        it('should schedule task successfully', () => {
            let executed = false;
            
            taskManager.scheduleTask('test-task', '0 0 * * *', async () => {
                executed = true;
            });

            const taskStatus = taskManager.getTaskStatus('test-task');
            assert.ok(taskStatus);
            assert.strictEqual(taskStatus.name, 'test-task');
            assert.strictEqual(taskStatus.cronExpression, '0 0 * * *');
        });

        it('should cancel task successfully', () => {
            taskManager.scheduleTask('test-task', '0 0 * * *', async () => {});
            
            assert.ok(taskManager.getTaskStatus('test-task'));
            
            taskManager.cancelTask('test-task');
            
            assert.strictEqual(taskManager.getTaskStatus('test-task'), null);
        });

        it('should replace existing task', () => {
            let firstExecuted = false;
            let secondExecuted = false;

            taskManager.scheduleTask('test-task', '0 0 * * *', async () => {
                firstExecuted = true;
            });

            taskManager.scheduleTask('test-task', '0 1 * * *', async () => {
                secondExecuted = true;
            });

            const taskStatus = taskManager.getTaskStatus('test-task');
            assert.strictEqual(taskStatus.cronExpression, '0 1 * * *');
        });

        it('should execute task manually', async () => {
            let executed = false;
            let executionData = null;

            taskManager.scheduleTask('test-task', '0 0 * * *', async () => {
                executed = true;
                executionData = { timestamp: Date.now() };
            });

            await taskManager.executeTask('test-task');

            assert.strictEqual(executed, true);
            assert.ok(executionData);
        });

        it('should handle task execution errors', async () => {
            taskManager.scheduleTask('error-task', '0 0 * * *', async () => {
                throw new Error('Task execution error');
            });

            // 應該不會拋出異常
            try {
                await taskManager.executeTask('error-task');
                assert.ok(true, 'Task execution should handle errors gracefully');
            } catch (error) {
                assert.fail('Task execution should not throw unhandled errors');
            }
        });
    });

    describe('Daily Report Time Setting', () => {
        beforeEach(() => {
            taskManager.initialize();
        });

        it('should set daily report time correctly', () => {
            taskManager.setDailyReportTime('09:30');
            
            const taskStatus = taskManager.getTaskStatus('daily-report');
            assert.strictEqual(taskStatus.cronExpression, '30 9 * * *');
        });

        it('should handle different time formats', () => {
            const testCases = [
                { input: '00:00', expected: '0 0 * * *' },
                { input: '12:30', expected: '30 12 * * *' },
                { input: '23:59', expected: '59 23 * * *' }
            ];

            for (const testCase of testCases) {
                taskManager.setDailyReportTime(testCase.input);
                
                const taskStatus = taskManager.getTaskStatus('daily-report');
                assert.strictEqual(taskStatus.cronExpression, testCase.expected);
            }
        });
    });

    describe('Task Status', () => {
        beforeEach(() => {
            taskManager.initialize();
        });

        it('should return correct task status', () => {
            const status = taskManager.getTaskStatus('daily-report');
            
            assert.ok(status);
            assert.strictEqual(status.name, 'daily-report');
            assert.strictEqual(status.cronExpression, '0 23 * * *');
            assert.ok(status.createdAt instanceof Date);
            assert.strictEqual(status.executionCount, 0);
            assert.strictEqual(status.lastExecution, null);
        });

        it('should return null for non-existent task', () => {
            const status = taskManager.getTaskStatus('non-existent');
            assert.strictEqual(status, null);
        });

        it('should return all tasks status', () => {
            const allStatus = taskManager.getAllTasksStatus();
            
            assert.ok(Array.isArray(allStatus));
            assert.ok(allStatus.length > 0);
            
            const dailyReport = allStatus.find(task => task.name === 'daily-report');
            assert.ok(dailyReport);
        });
    });

    describe('Manager Status', () => {
        it('should return correct manager status', () => {
            const status = taskManager.getStatus();
            
            assert.strictEqual(status.isRunning, false);
            assert.strictEqual(status.timezone, 'Asia/Taipei');
            assert.strictEqual(status.taskCount, 0);
            assert.ok(Array.isArray(status.tasks));
        });

        it('should update status after initialization', () => {
            taskManager.initialize();
            
            const status = taskManager.getStatus();
            
            assert.strictEqual(status.isRunning, true);
            assert.ok(status.taskCount > 0);
            assert.ok(status.tasks.length > 0);
        });
    });

    describe('Shutdown', () => {
        it('should shutdown gracefully', () => {
            taskManager.initialize();
            
            assert.strictEqual(taskManager.isRunning, true);
            
            taskManager.shutdown();
            
            assert.strictEqual(taskManager.isRunning, false);
            assert.strictEqual(taskManager.getStatus().taskCount, 0);
        });
    });

    describe('Cron Expression Validation', () => {
        it('should validate correct cron expressions', () => {
            const validExpressions = [
                '0 0 * * *',    // daily at midnight
                '0 */2 * * *',  // every 2 hours
                '30 14 * * 0',  // every Sunday at 2:30 PM
                '0 0 1 * *',    // first day of month
                '0 0 1 1 *'     // January 1st
            ];

            for (const expression of validExpressions) {
                const isValid = taskManager.validateCronExpression(expression);
                assert.strictEqual(isValid, true, `Expression should be valid: ${expression}`);
            }
        });

        it('should reject invalid cron expressions', () => {
            const invalidExpressions = [
                '',
                '* * * *',      // too few fields
                '0 0 * * * *',  // too many fields
                '60 0 * * *',   // invalid minute
                '0 25 * * *',   // invalid hour
                '0 0 32 * *',   // invalid day
                '0 0 * 13 *'    // invalid month
            ];

            for (const expression of invalidExpressions) {
                const isValid = taskManager.validateCronExpression(expression);
                assert.strictEqual(isValid, false, `Expression should be invalid: ${expression}`);
            }
        });
    });
});