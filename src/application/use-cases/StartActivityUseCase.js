/**
 * 開始活動用例
 * 封裝開始活動的業務邏輯
 */

const { ActivityTypeHelper } = require('../../shared/constants/ActivityTypes');
const DomainException = require('../../shared/exceptions/DomainException');
const ValidationException = require('../../shared/exceptions/ValidationException');

class StartActivityUseCase {
    constructor(activityRepository, userRepository, chatRepository) {
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
        this.chatRepository = chatRepository;
    }

    /**
     * 執行開始活動用例
     * @param {Object} command 開始活動命令
     * @returns {Promise<Object>} 執行結果
     */
    async execute(command) {
        try {
            // 1. 驗證輸入參數
            this.validateCommand(command);

            const { userId, chatId, activityType, userFullName, chatTitle } = command;

            // 2. 更新聊天室資訊
            await this.chatRepository.updateChatInfo(chatId, chatTitle);

            // 3. 檢查用戶是否已有進行中的活動
            const ongoingActivity = await this.activityRepository.findOngoingByUser(userId, chatId);

            if (ongoingActivity) {
                const activityName = ActivityTypeHelper.getName(ongoingActivity.activityType);
                return {
                    success: false,
                    message: `⚠️ 您已經在進行 '${activityName}' 活動了，請先結束。\nคุณมีกิจกรรม '${activityName}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน`,
                    ongoingActivity: ongoingActivity
                };
            }

            // 4. 創建新活動
            const newActivity = {
                userId,
                chatId,
                activityType,
                userFullName,
                chatTitle
            };

            // 5. 保存活動
            const savedActivity = await this.activityRepository.startActivity(newActivity);

            // 6. 返回成功結果
            const activityConfig = ActivityTypeHelper.getConfig(activityType);
            
            return {
                success: true,
                activity: savedActivity,
                message: `✅ 已開始記錄${activityConfig.name}時間\n✅ เริ่มบันทึกเวลา${activityConfig.name}`,
                data: {
                    activityType: savedActivity.activityType,
                    activityName: activityConfig.name,
                    emoji: activityConfig.emoji,
                    startTime: savedActivity.startTime,
                    maxDuration: activityConfig.maxDuration,
                    userFullName: savedActivity.userFullName,
                    chatTitle: savedActivity.chatTitle
                }
            };

        } catch (error) {
            console.error('開始活動用例執行失敗:', error);
            
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
                message: '開始活動時發生系統錯誤',
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

        const { userId, chatId, activityType, userFullName, chatTitle } = command;

        if (!userId) {
            throw new ValidationException('用戶ID不能為空');
        }

        if (!chatId) {
            throw new ValidationException('聊天室ID不能為空');
        }

        if (!activityType) {
            throw new ValidationException('活動類型不能為空');
        }

        if (!ActivityTypeHelper.isValid(activityType)) {
            throw new ValidationException(`無效的活動類型: ${activityType}`);
        }

        if (!userFullName) {
            throw new ValidationException('用戶姓名不能為空');
        }

        if (!chatTitle) {
            throw new ValidationException('聊天室標題不能為空');
        }
    }

    /**
     * 驗證活動是否可以開始
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {Promise<boolean>} 是否可以開始
     */
    async canStartActivity(userId, chatId) {
        try {
            const ongoingActivity = await this.activityRepository.findOngoingByUser(userId, chatId);
            return !ongoingActivity;
        } catch (error) {
            console.error('檢查活動狀態失敗:', error);
            return false;
        }
    }

    /**
     * 獲取用戶當前活動狀態
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {Promise<Object|null>} 當前活動狀態
     */
    async getCurrentActivityStatus(userId, chatId) {
        try {
            const ongoingActivity = await this.activityRepository.findOngoingByUser(userId, chatId);
            
            if (!ongoingActivity) {
                return {
                    hasOngoingActivity: false,
                    activity: null
                };
            }

            const currentTime = new Date();
            const duration = Math.floor((currentTime - ongoingActivity.startTime) / 1000);
            const overtimeInfo = ActivityTypeHelper.checkOvertime(ongoingActivity.activityType, duration);

            return {
                hasOngoingActivity: true,
                activity: ongoingActivity,
                currentDuration: duration,
                isOvertime: overtimeInfo.isOvertime,
                overtime: overtimeInfo.overtime,
                maxDuration: overtimeInfo.maxDuration,
                activityName: ActivityTypeHelper.getName(ongoingActivity.activityType),
                emoji: ActivityTypeHelper.getEmoji(ongoingActivity.activityType)
            };
        } catch (error) {
            console.error('獲取活動狀態失敗:', error);
            return null;
        }
    }

    /**
     * 檢查是否需要超時警告
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {Promise<Object|null>} 警告資訊
     */
    async checkTimeoutWarning(userId, chatId) {
        try {
            const status = await this.getCurrentActivityStatus(userId, chatId);
            
            if (!status || !status.hasOngoingActivity) {
                return null;
            }

            if (status.isOvertime) {
                return {
                    needsWarning: true,
                    type: 'overtime',
                    message: `⚠️ ${status.activityName} 已超時 ${Math.floor(status.overtime / 60)} 分 ${status.overtime % 60} 秒`,
                    overtime: status.overtime,
                    activityName: status.activityName
                };
            }

            // 檢查是否接近最大時間 (90%)
            const warningThreshold = status.maxDuration * 0.9;
            if (status.currentDuration >= warningThreshold) {
                const remaining = status.maxDuration - status.currentDuration;
                return {
                    needsWarning: true,
                    type: 'approaching_limit',
                    message: `⏰ ${status.activityName} 即將超時，剩餘 ${Math.floor(remaining / 60)} 分 ${remaining % 60} 秒`,
                    remaining: remaining,
                    activityName: status.activityName
                };
            }

            return null;
        } catch (error) {
            console.error('檢查超時警告失敗:', error);
            return null;
        }
    }
}

module.exports = StartActivityUseCase;