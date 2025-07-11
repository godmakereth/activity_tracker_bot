/**
 * 完成活動用例
 * 封裝完成活動的業務邏輯
 */

const { ActivityTypeHelper } = require('../../shared/constants/ActivityTypes');
const DomainException = require('../../shared/exceptions/DomainException');
const ValidationException = require('../../shared/exceptions/ValidationException');

class CompleteActivityUseCase {
    constructor(activityRepository) {
        this.activityRepository = activityRepository;
    }

    /**
     * 執行完成活動用例
     * @param {Object} command 完成活動命令
     * @returns {Promise<Object>} 執行結果
     */
    async execute(command) {
        try {
            // 1. 驗證輸入參數
            this.validateCommand(command);

            const { userId, chatId } = command;

            // 2. 檢查是否有正在進行的活動
            const ongoingActivity = await this.activityRepository.findOngoingByUser(userId, chatId);

            if (!ongoingActivity) {
                return {
                    success: false,
                    message: '❌ 沒有進行中的活動\nไม่มีกิจกรรมที่กำลังดำเนินอยู่'
                };
            }

            // 3. 計算活動時間和超時
            const endTime = new Date();
            const startTime = ongoingActivity.startTime;
            const duration = Math.floor((endTime - startTime) / 1000); // 秒

            const overtimeInfo = ActivityTypeHelper.checkOvertime(ongoingActivity.activityType, duration);
            const overtime = overtimeInfo.overtime;

            // 4. 完成活動
            const completedActivity = await this.activityRepository.completeActivity(userId, chatId, overtime);

            if (!completedActivity) {
                return {
                    success: false,
                    message: '❌ 完成活動失敗，請重試'
                };
            }

            // 5. 生成回應訊息
            const activityConfig = ActivityTypeHelper.getConfig(completedActivity.activityType);
            const activityName = activityConfig ? activityConfig.name : completedActivity.activityType;

            let message = `✅ 已記錄 ${activityName} 時間\n✅ บันทึกเวลา${activityName}แล้ว\n`;
            message += `⏱ 總時間: ${Math.floor(duration / 60)} 分 ${duration % 60} 秒`;
            message += ` (รวม: ${Math.floor(duration / 60)} นาที ${duration % 60} วินาที)`;

            if (overtime > 0) {
                message += `\n⚠️ 超時: ${Math.floor(overtime / 60)} 分 ${overtime % 60} 秒`;
                message += ` (เกินเวลา: ${Math.floor(overtime / 60)} นาที ${overtime % 60} วินาที)`;
            }

            // 6. 返回成功結果
            return {
                success: true,
                activity: completedActivity,
                message: message,
                data: {
                    activityType: completedActivity.activityType,
                    activityName: activityName,
                    emoji: activityConfig ? activityConfig.emoji : '📝',
                    startTime: completedActivity.startTime,
                    endTime: completedActivity.endTime,
                    duration: duration,
                    overtime: overtime,
                    isOvertime: overtime > 0,
                    userFullName: completedActivity.userFullName,
                    chatTitle: completedActivity.chatTitle,
                    status: completedActivity.status
                }
            };

        } catch (error) {
            console.error('完成活動用例執行失敗:', error);
            
            // 重新拋出已知異常
            if (error instanceof DomainException || error instanceof ValidationException) {
                return {
                    success: false,
                    message: error.message,
                    error: error.message
                };
            }

            // 包裝未知異常
            return {
                success: false,
                message: '完成活動時發生系統錯誤',
                error: error.message
            };
        }
    }

    /**
     * 驗證命令參數
     * @param {Object} command 命令物件
     */
    validateCommand(command) {
        if (!command) {
            throw new ValidationException('命令參數不能為空');
        }

        const { userId, chatId } = command;

        if (!userId) {
            throw new ValidationException('用戶ID不能為空');
        }

        if (!chatId) {
            throw new ValidationException('聊天室ID不能為空');
        }
    }

    /**
     * 獲取當前活動的剩餘時間
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {Promise<Object|null>} 剩餘時間資訊
     */
    async getRemainingTime(userId, chatId) {
        try {
            const ongoingActivity = await this.activityRepository.findOngoingByUser(userId, chatId);
            
            if (!ongoingActivity) {
                return null;
            }

            const currentTime = new Date();
            const duration = Math.floor((currentTime - ongoingActivity.startTime) / 1000);
            const maxDuration = ActivityTypeHelper.getMaxDuration(ongoingActivity.activityType);
            const remaining = Math.max(0, maxDuration - duration);

            return {
                activityType: ongoingActivity.activityType,
                activityName: ActivityTypeHelper.getName(ongoingActivity.activityType),
                currentDuration: duration,
                maxDuration: maxDuration,
                remaining: remaining,
                isOvertime: duration > maxDuration,
                overtime: Math.max(0, duration - maxDuration)
            };
        } catch (error) {
            console.error('獲取剩餘時間失敗:', error);
            return null;
        }
    }

    /**
     * 強制完成活動（管理員功能）
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @param {string} reason 強制完成的原因
     * @returns {Promise<Object>} 執行結果
     */
    async forceComplete(userId, chatId, reason = '管理員強制完成') {
        try {
            const ongoingActivity = await this.activityRepository.findOngoingByUser(userId, chatId);

            if (!ongoingActivity) {
                return {
                    success: false,
                    message: '沒有需要強制完成的活動'
                };
            }

            // 計算當前時間
            const endTime = new Date();
            const duration = Math.floor((endTime - ongoingActivity.startTime) / 1000);
            const overtimeInfo = ActivityTypeHelper.checkOvertime(ongoingActivity.activityType, duration);

            // 強制完成活動
            const completedActivity = await this.activityRepository.completeActivity(userId, chatId, overtimeInfo.overtime);

            return {
                success: true,
                activity: completedActivity,
                message: `🔧 活動已強制完成 (${reason})`,
                isForced: true,
                reason: reason
            };

        } catch (error) {
            console.error('強制完成活動失敗:', error);
            return {
                success: false,
                message: '強制完成活動時發生錯誤',
                error: error.message
            };
        }
    }

    /**
     * 檢查活動是否可以完成
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {Promise<boolean>} 是否可以完成
     */
    async canCompleteActivity(userId, chatId) {
        try {
            const ongoingActivity = await this.activityRepository.findOngoingByUser(userId, chatId);
            return !!ongoingActivity;
        } catch (error) {
            console.error('檢查活動完成狀態失敗:', error);
            return false;
        }
    }

    /**
     * 獲取活動統計摘要
     * @param {Object} completedActivity 已完成的活動
     * @returns {Object} 統計摘要
     */
    getActivitySummary(completedActivity) {
        const activityConfig = ActivityTypeHelper.getConfig(completedActivity.activityType);
        const duration = completedActivity.duration;
        const overtime = completedActivity.overtime;

        return {
            activityType: completedActivity.activityType,
            activityName: activityConfig ? activityConfig.name : completedActivity.activityType,
            emoji: activityConfig ? activityConfig.emoji : '📝',
            duration: {
                total: duration,
                minutes: Math.floor(duration / 60),
                seconds: duration % 60,
                formatted: `${Math.floor(duration / 60)} 分 ${duration % 60} 秒`
            },
            overtime: {
                total: overtime,
                minutes: Math.floor(overtime / 60),
                seconds: overtime % 60,
                formatted: overtime > 0 ? `${Math.floor(overtime / 60)} 分 ${overtime % 60} 秒` : '無',
                hasOvertime: overtime > 0
            },
            efficiency: {
                isOnTime: overtime === 0,
                score: Math.max(0, 100 - Math.floor((overtime / duration) * 100))
            },
            timestamps: {
                start: completedActivity.startTime,
                end: completedActivity.endTime,
                startFormatted: completedActivity.startTime.toLocaleString('zh-TW'),
                endFormatted: completedActivity.endTime.toLocaleString('zh-TW')
            }
        };
    }
}

module.exports = CompleteActivityUseCase;