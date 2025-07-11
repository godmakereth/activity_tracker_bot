/**
 * 持續時間值對象
 * 負責時間計算和格式化
 */

class Duration {
    constructor(milliseconds) {
        if (typeof milliseconds !== 'number' || milliseconds < 0) {
            throw new Error('持續時間必須是非負數');
        }
        this.milliseconds = milliseconds;
    }

    /**
     * 從秒數創建持續時間
     * @param {number} seconds 秒數
     * @returns {Duration} 持續時間對象
     */
    static fromSeconds(seconds) {
        return new Duration(seconds * 1000);
    }

    /**
     * 從分鐘創建持續時間
     * @param {number} minutes 分鐘數
     * @returns {Duration} 持續時間對象
     */
    static fromMinutes(minutes) {
        return new Duration(minutes * 60 * 1000);
    }

    /**
     * 從小時創建持續時間
     * @param {number} hours 小時數
     * @returns {Duration} 持續時間對象
     */
    static fromHours(hours) {
        return new Duration(hours * 60 * 60 * 1000);
    }

    /**
     * 從兩個時間點計算持續時間
     * @param {Date} startTime 開始時間
     * @param {Date} endTime 結束時間
     * @returns {Duration} 持續時間對象
     */
    static between(startTime, endTime) {
        if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
            throw new Error('參數必須是 Date 對象');
        }
        
        const diff = endTime.getTime() - startTime.getTime();
        if (diff < 0) {
            throw new Error('結束時間不能早於開始時間');
        }
        
        return new Duration(diff);
    }

    /**
     * 獲取毫秒數
     * @returns {number} 毫秒數
     */
    getMilliseconds() {
        return this.milliseconds;
    }

    /**
     * 獲取秒數
     * @returns {number} 秒數
     */
    getSeconds() {
        return Math.floor(this.milliseconds / 1000);
    }

    /**
     * 獲取分鐘數
     * @returns {number} 分鐘數
     */
    getMinutes() {
        return Math.floor(this.milliseconds / (1000 * 60));
    }

    /**
     * 獲取小時數
     * @returns {number} 小時數
     */
    getHours() {
        return Math.floor(this.milliseconds / (1000 * 60 * 60));
    }

    /**
     * 格式化為可讀字符串
     * @returns {string} 格式化的時間字符串
     */
    format() {
        const hours = this.getHours();
        const minutes = Math.floor((this.milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((this.milliseconds % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${hours}小時${minutes}分鐘`;
        } else if (minutes > 0) {
            return `${minutes}分鐘${seconds > 0 ? `${seconds}秒` : ''}`;
        } else {
            return `${seconds}秒`;
        }
    }

    /**
     * 格式化為簡短字符串
     * @returns {string} 簡短格式的時間字符串
     */
    formatShort() {
        const hours = this.getHours();
        const minutes = Math.floor((this.milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((this.milliseconds % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * 比較兩個持續時間
     * @param {Duration} other 另一個持續時間
     * @returns {number} 比較結果 (-1, 0, 1)
     */
    compareTo(other) {
        if (!(other instanceof Duration)) {
            throw new Error('參數必須是 Duration 對象');
        }
        
        if (this.milliseconds < other.milliseconds) return -1;
        if (this.milliseconds > other.milliseconds) return 1;
        return 0;
    }

    /**
     * 檢查是否相等
     * @param {Duration} other 另一個持續時間
     * @returns {boolean} 是否相等
     */
    equals(other) {
        return other instanceof Duration && this.milliseconds === other.milliseconds;
    }

    /**
     * 添加持續時間
     * @param {Duration} other 要添加的持續時間
     * @returns {Duration} 新的持續時間對象
     */
    add(other) {
        if (!(other instanceof Duration)) {
            throw new Error('參數必須是 Duration 對象');
        }
        return new Duration(this.milliseconds + other.milliseconds);
    }

    /**
     * 檢查是否超過指定時間
     * @param {Duration} limit 時間限制
     * @returns {boolean} 是否超過
     */
    isGreaterThan(limit) {
        return this.compareTo(limit) > 0;
    }

    /**
     * 轉換為 JSON
     * @returns {Object} JSON 對象
     */
    toJSON() {
        return {
            milliseconds: this.milliseconds,
            seconds: this.getSeconds(),
            minutes: this.getMinutes(),
            hours: this.getHours(),
            formatted: this.format()
        };
    }
}

module.exports = Duration;