/**
 * 領域異常類
 * 用於處理業務邏輯相關的錯誤
 */

class DomainException extends Error {
    constructor(message, code = 'DOMAIN_ERROR') {
        super(message);
        this.name = 'DomainException';
        this.code = code;
        this.timestamp = new Date();
        
        // 保持堆疊追蹤
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DomainException);
        }
    }

    /**
     * 轉換為可序列化的對象
     * @returns {Object} 序列化的錯誤信息
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

module.exports = DomainException;