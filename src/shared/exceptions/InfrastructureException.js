/**
 * 基礎設施異常類
 * 用於處理資料庫、檔案系統等基礎設施相關的錯誤
 */

class InfrastructureException extends Error {
    constructor(message, originalError = null, code = 'INFRASTRUCTURE_ERROR') {
        super(message);
        this.name = 'InfrastructureException';
        this.code = code;
        this.originalError = originalError;
        this.timestamp = new Date();
        
        // 保持堆疊追蹤
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InfrastructureException);
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
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message
            } : null,
            stack: this.stack
        };
    }
}

module.exports = InfrastructureException;