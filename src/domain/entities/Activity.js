/**
 * 活動實體
 * 代表系統中的核心業務實體
 */

const ActivityType = require('../value-objects/ActivityType');
const Duration = require('../value-objects/Duration');
const DomainException = require('../../shared/exceptions/DomainException');
const ValidationException = require('../../shared/exceptions/ValidationException');

class Activity {
    constructor(id, userId, userName, chatId, chatTitle, activityType, startTime, endTime = null) {
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.chatId = chatId;
        this.chatTitle = chatTitle;
        this.activityType = activityType instanceof ActivityType ? activityType : new ActivityType(activityType);
        this.startTime = startTime instanceof Date ? startTime : new Date(startTime);
        this.endTime = endTime ? (endTime instanceof Date ? endTime : new Date(endTime)) : null;
        this.createdAt = new Date();
        this.updatedAt = new Date();

        this.validate();
    }

    /**
     * 驗證活動數據
     * @throws {ValidationException} 當數據無效時拋出異常
     */
    validate() {
        const errors = [];

        if (!this.userId) {
            errors.push('用戶ID不能為空');
        }

        if (!this.userName) {
            errors.push('用戶名稱不能為空');
        }

        if (!this.chatId) {
            errors.push('聊天室ID不能為空');
        }

        if (!this.startTime) {
            errors.push('開始時間不能為空');
        }

        if (this.endTime && this.endTime <= this.startTime) {
            errors.push('結束時間必須晚於開始時間');
        }

        if (errors.length > 0) {
            throw new ValidationException('活動數據驗證失敗', errors);
        }
    }

    /**
     * 完成活動
     * @param {Date} endTime 結束時間（可選，預設為當前時間）
     * @throws {DomainException} 當活動已完成時拋出異常
     */
    complete(endTime = new Date()) {
        if (this.isCompleted()) {
            throw new DomainException('活動已經完成，無法重複完成');
        }

        if (endTime <= this.startTime) {
            throw new DomainException('結束時間必須晚於開始時間');
        }

        this.endTime = endTime;
        this.updatedAt = new Date();
    }

    /**
     * 檢查活動是否已完成
     * @returns {boolean} 是否已完成
     */
    isCompleted() {
        return this.endTime !== null;
    }

    /**
     * 檢查活動是否正在進行中
     * @returns {boolean} 是否正在進行中
     */
    isOngoing() {
        return this.endTime === null;
    }

    /**
     * 獲取活動持續時間
     * @returns {Duration|null} 持續時間對象，如果活動未完成則返回null
     */
    getDuration() {
        if (!this.isCompleted()) {
            return null;
        }
        return Duration.between(this.startTime, this.endTime);
    }

    /**
     * 獲取當前進行時間（即使未完成）
     * @returns {Duration} 當前進行時間
     */
    getCurrentDuration() {
        const endTime = this.endTime || new Date();
        return Duration.between(this.startTime, endTime);
    }

    /**
     * 檢查活動是否超時
     * @returns {boolean} 是否超時
     */
    isOvertime() {
        const currentDuration = this.getCurrentDuration();
        const maxDuration = Duration.fromSeconds(this.activityType.getMaxDuration());
        return currentDuration.isGreaterThan(maxDuration);
    }

    /**
     * 檢查是否需要超時警告
     * @returns {boolean} 是否需要警告
     */
    needsTimeoutWarning() {
        if (this.isCompleted()) {
            return false;
        }

        const currentDuration = this.getCurrentDuration();
        const warningDuration = Duration.fromSeconds(this.activityType.getTimeoutWarningDuration());
        return currentDuration.isGreaterThan(warningDuration);
    }

    /**
     * 獲取活動狀態
     * @returns {string} 活動狀態
     */
    getStatus() {
        if (this.isCompleted()) {
            return 'completed';
        } else if (this.isOvertime()) {
            return 'overtime';
        } else if (this.needsTimeoutWarning()) {
            return 'warning';
        } else {
            return 'ongoing';
        }
    }

    /**
     * 獲取活動摘要信息
     * @returns {string} 活動摘要
     */
    getSummary() {
        const duration = this.getDuration();
        const durationText = duration ? duration.format() : '進行中';
        return `${this.activityType.getDisplayText()} - ${durationText}`;
    }

    /**
     * 獲取詳細信息
     * @returns {Object} 詳細信息對象
     */
    getDetails() {
        return {
            id: this.id,
            user: {
                id: this.userId,
                name: this.userName
            },
            chat: {
                id: this.chatId,
                title: this.chatTitle
            },
            activity: {
                type: this.activityType.getType(),
                name: this.activityType.getName(),
                emoji: this.activityType.getEmoji(),
                displayText: this.activityType.getDisplayText()
            },
            time: {
                startTime: this.startTime,
                endTime: this.endTime,
                duration: this.getDuration(),
                currentDuration: this.getCurrentDuration(),
                isCompleted: this.isCompleted(),
                isOvertime: this.isOvertime()
            },
            status: this.getStatus(),
            summary: this.getSummary()
        };
    }

    /**
     * 檢查活動是否屬於指定用戶
     * @param {string} userId 用戶ID
     * @returns {boolean} 是否屬於指定用戶
     */
    belongsToUser(userId) {
        return this.userId === userId;
    }

    /**
     * 檢查活動是否屬於指定聊天室
     * @param {string} chatId 聊天室ID
     * @returns {boolean} 是否屬於指定聊天室
     */
    belongsToChat(chatId) {
        return this.chatId === chatId;
    }

    /**
     * 檢查是否相等
     * @param {Activity} other 另一個活動
     * @returns {boolean} 是否相等
     */
    equals(other) {
        return other instanceof Activity && this.id === other.id;
    }

    /**
     * 更新活動信息
     * @param {Object} updates 更新的字段
     */
    update(updates) {
        if (updates.userName) this.userName = updates.userName;
        if (updates.chatTitle) this.chatTitle = updates.chatTitle;
        this.updatedAt = new Date();
    }

    /**
     * 轉換為 JSON
     * @returns {Object} JSON 對象
     */
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            userName: this.userName,
            chatId: this.chatId,
            chatTitle: this.chatTitle,
            activityType: this.activityType.toJSON(),
            startTime: this.startTime.toISOString(),
            endTime: this.endTime ? this.endTime.toISOString() : null,
            duration: this.getDuration()?.toJSON() || null,
            currentDuration: this.getCurrentDuration().toJSON(),
            status: this.getStatus(),
            isCompleted: this.isCompleted(),
            isOvertime: this.isOvertime(),
            summary: this.getSummary(),
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    /**
     * 從原始數據創建活動實體
     * @param {Object} data 原始數據
     * @returns {Activity} 活動實體
     */
    static fromData(data) {
        return new Activity(
            data.id,
            data.user_id || data.userId,
            data.user_name || data.userName,
            data.chat_id || data.chatId,
            data.chat_title || data.chatTitle,
            data.activity_type || data.activityType,
            data.start_time || data.startTime,
            data.end_time || data.endTime
        );
    }
}

module.exports = Activity;