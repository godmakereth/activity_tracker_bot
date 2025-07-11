/**
 * 活動類型值對象
 * 封裝活動類型的業務邏輯
 */

const ActivityTypes = require('../../shared/constants/ActivityTypes');
const ValidationException = require('../../shared/exceptions/ValidationException');

class ActivityType {
    constructor(type) {
        this.validateType(type);
        this.type = type;
        this.config = ActivityTypes.getConfig(type);
    }

    /**
     * 驗證活動類型
     * @param {string} type 活動類型
     * @throws {ValidationException} 當類型無效時拋出異常
     */
    validateType(type) {
        if (!type) {
            throw new ValidationException('活動類型不能為空');
        }

        if (typeof type !== 'string') {
            throw new ValidationException('活動類型必須是字符串');
        }

        if (!ActivityTypes.isValid(type)) {
            throw new ValidationException(
                `無效的活動類型: ${type}。有效類型: ${ActivityTypes.getAllTypes().join(', ')}`
            );
        }
    }

    /**
     * 獲取活動類型代碼
     * @returns {string} 活動類型代碼
     */
    getType() {
        return this.type;
    }

    /**
     * 獲取活動名稱
     * @returns {string} 活動名稱
     */
    getName() {
        return this.config.name;
    }

    /**
     * 獲取活動表情符號
     * @returns {string} 表情符號
     */
    getEmoji() {
        return this.config.emoji;
    }

    /**
     * 獲取預設持續時間（秒）
     * @returns {number} 預設持續時間
     */
    getDefaultDuration() {
        return this.config.defaultDuration;
    }

    /**
     * 獲取最大持續時間（秒）
     * @returns {number} 最大持續時間
     */
    getMaxDuration() {
        return this.config.maxDuration;
    }

    /**
     * 獲取顯示文字（包含表情符號）
     * @returns {string} 顯示文字
     */
    getDisplayText() {
        return `${this.config.emoji} ${this.config.name}`;
    }

    /**
     * 檢查持續時間是否在合理範圍內
     * @param {number} durationSeconds 持續時間（秒）
     * @returns {boolean} 是否合理
     */
    isReasonableDuration(durationSeconds) {
        return durationSeconds > 0 && durationSeconds <= this.config.maxDuration;
    }

    /**
     * 檢查是否為廁所相關活動
     * @returns {boolean} 是否為廁所活動
     */
    isToiletActivity() {
        return this.type === ActivityTypes.TYPES.TOILET || 
               this.type === ActivityTypes.TYPES.DEFECATE_10 || 
               this.type === ActivityTypes.TYPES.DEFECATE_15;
    }

    /**
     * 檢查是否為休息相關活動
     * @returns {boolean} 是否為休息活動
     */
    isBreakActivity() {
        return this.type === ActivityTypes.TYPES.BREAK || 
               this.type === ActivityTypes.TYPES.PHONE;
    }

    /**
     * 檢查是否相等
     * @param {ActivityType} other 另一個活動類型
     * @returns {boolean} 是否相等
     */
    equals(other) {
        return other instanceof ActivityType && this.type === other.type;
    }

    /**
     * 獲取建議的超時警告時間（秒）
     * @returns {number} 超時警告時間
     */
    getTimeoutWarningDuration() {
        // 在最大時間的80%時發出警告
        return Math.floor(this.config.maxDuration * 0.8);
    }

    /**
     * 創建 Telegram 按鈕配置
     * @param {string} action 動作前綴
     * @returns {Object} 按鈕配置
     */
    createButton(action = 'start') {
        return {
            text: this.getDisplayText(),
            callback_data: `${action}_${this.type}`
        };
    }

    /**
     * 轉換為字符串
     * @returns {string} 字符串表示
     */
    toString() {
        return this.type;
    }

    /**
     * 轉換為 JSON
     * @returns {Object} JSON 對象
     */
    toJSON() {
        return {
            type: this.type,
            name: this.config.name,
            emoji: this.config.emoji,
            defaultDuration: this.config.defaultDuration,
            maxDuration: this.config.maxDuration,
            displayText: this.getDisplayText()
        };
    }
}

module.exports = ActivityType;