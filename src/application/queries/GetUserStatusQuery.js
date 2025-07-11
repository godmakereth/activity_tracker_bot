/**
 * 獲取用戶狀態查詢
 * 封裝獲取用戶當前狀態的請求
 */

const ValidationException = require('../../shared/exceptions/ValidationException');

class GetUserStatusQuery {
    constructor(userId, chatId) {
        this.userId = userId;
        this.chatId = chatId;
        this.timestamp = new Date();

        this.validate();
    }

    /**
     * 驗證查詢數據
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

        if (errors.length > 0) {
            throw new ValidationException('獲取用戶狀態查詢驗證失敗', errors);
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
     * 獲取查詢時間戳
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
            timestamp: this.timestamp.toISOString()
        };
    }
}

module.exports = GetUserStatusQuery;