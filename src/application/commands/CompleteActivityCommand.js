/**
 * 完成活動命令
 * 封裝完成活動的業務請求
 */

const ValidationException = require('../../shared/exceptions/ValidationException');

class CompleteActivityCommand {
    constructor(userId, chatId, endTime = null) {
        this.userId = userId;
        this.chatId = chatId;
        this.endTime = endTime ? (endTime instanceof Date ? endTime : new Date(endTime)) : new Date();
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

        if (!this.chatId) {
            errors.push('聊天室ID不能為空');
        }

        if (!this.endTime || !(this.endTime instanceof Date)) {
            errors.push('結束時間必須是有效的日期');
        }

        if (errors.length > 0) {
            throw new ValidationException('完成活動命令驗證失敗', errors);
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
     * 獲取聊天室ID
     * @returns {string} 聊天室ID
     */
    getChatId() {
        return this.chatId;
    }

    /**
     * 獲取結束時間
     * @returns {Date} 結束時間
     */
    getEndTime() {
        return this.endTime;
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
            chatId: this.chatId,
            endTime: this.endTime.toISOString(),
            timestamp: this.timestamp.toISOString()
        };
    }
}

module.exports = CompleteActivityCommand;