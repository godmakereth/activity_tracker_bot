/**
 * 獲取每日報告查詢
 * 封裝獲取每日活動報告的請求
 */

const ValidationException = require('../../shared/exceptions/ValidationException');

class GetDailyReportQuery {
    constructor(chatId, date = null) {
        this.chatId = chatId;
        this.date = date ? (date instanceof Date ? date : new Date(date)) : new Date();
        this.timestamp = new Date();

        this.validate();
    }

    /**
     * 驗證查詢數據
     * @throws {ValidationException} 當數據無效時拋出異常
     */
    validate() {
        const errors = [];

        if (!this.chatId) {
            errors.push('聊天室ID不能為空');
        }

        if (!this.date || !(this.date instanceof Date) || isNaN(this.date.getTime())) {
            errors.push('日期必須是有效的日期');
        }

        if (errors.length > 0) {
            throw new ValidationException('獲取每日報告查詢驗證失敗', errors);
        }
    }

    /**
     * 獲取聊天室ID
     * @returns {string} 聊天室ID
     */
    getChatId() {
        return this.chatId;
    }

    /**
     * 獲取查詢日期
     * @returns {Date} 查詢日期
     */
    getDate() {
        return this.date;
    }

    /**
     * 獲取日期字符串 (YYYY-MM-DD 格式)
     * @returns {string} 日期字符串
     */
    getDateString() {
        return this.date.toISOString().split('T')[0];
    }

    /**
     * 獲取查詢時間戳
     * @returns {Date} 時間戳
     */
    getTimestamp() {
        return this.timestamp;
    }

    /**
     * 檢查是否為今日查詢
     * @returns {boolean} 是否為今日
     */
    isToday() {
        const today = new Date();
        return this.getDateString() === today.toISOString().split('T')[0];
    }

    /**
     * 獲取查詢時間範圍
     * @returns {Object} 時間範圍對象
     */
    getTimeRange() {
        const startOfDay = new Date(this.date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(this.date);
        endOfDay.setHours(23, 59, 59, 999);

        return {
            start: startOfDay,
            end: endOfDay
        };
    }

    /**
     * 轉換為 JSON
     * @returns {Object} JSON 對象
     */
    toJSON() {
        return {
            chatId: this.chatId,
            date: this.date.toISOString(),
            dateString: this.getDateString(),
            isToday: this.isToday(),
            timeRange: {
                start: this.getTimeRange().start.toISOString(),
                end: this.getTimeRange().end.toISOString()
            },
            timestamp: this.timestamp.toISOString()
        };
    }
}

module.exports = GetDailyReportQuery;