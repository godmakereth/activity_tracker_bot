/**
 * 開始活動命令
 * 封裝開始活動的業務請求
 */

const ActivityType = require('../../domain/value-objects/ActivityType');
const ValidationException = require('../../shared/exceptions/ValidationException');

class StartActivityCommand {
    constructor(userId, userName, chatId, chatTitle, activityType) {
        this.userId = userId;
        this.userName = userName;
        this.chatId = chatId;
        this.chatTitle = chatTitle;
        this.activityType = activityType instanceof ActivityType ? activityType : new ActivityType(activityType);
        this.timestamp = new Date();

        this.validate();
    }

    /**
     * 驗證命令數據
     * @throws {ValidationException} 當數據無效時拋出異常
     */
    validate() {
        const errors = [];

        if (!this.userId) {
            errors.push('用戶ID不能為空');
        }

        if (!this.userName || typeof this.userName !== 'string' || this.userName.trim().length === 0) {
            errors.push('用戶名稱不能為空');
        }

        if (!this.chatId) {
            errors.push('聊天室ID不能為空');
        }

        if (!this.chatTitle || typeof this.chatTitle !== 'string' || this.chatTitle.trim().length === 0) {
            errors.push('聊天室標題不能為空');
        }

        if (errors.length > 0) {
            throw new ValidationException('開始活動命令驗證失敗', errors);
        }
    }

    /**
     * 獲取用戶ID
     * @returns {string} 用戶ID
     */
    getUserId() {
        return this.userId;
    }

    /**
     * 獲取用戶名稱
     * @returns {string} 用戶名稱
     */
    getUserName() {
        return this.userName;
    }

    /**
     * 獲取聊天室ID
     * @returns {string} 聊天室ID
     */
    getChatId() {
        return this.chatId;
    }

    /**
     * 獲取聊天室標題
     * @returns {string} 聊天室標題
     */
    getChatTitle() {
        return this.chatTitle;
    }

    /**
     * 獲取活動類型
     * @returns {ActivityType} 活動類型
     */
    getActivityType() {
        return this.activityType;
    }

    /**
     * 獲取命令時間戳
     * @returns {Date} 時間戳
     */
    getTimestamp() {
        return this.timestamp;
    }

    /**
     * 轉換為 JSON
     * @returns {Object} JSON 對象
     */
    toJSON() {
        return {
            userId: this.userId,
            userName: this.userName,
            chatId: this.chatId,
            chatTitle: this.chatTitle,
            activityType: this.activityType.toJSON(),
            timestamp: this.timestamp.toISOString()
        };
    }
}

module.exports = StartActivityCommand;