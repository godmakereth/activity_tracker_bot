/**
 * 驗證異常類
 * 用於處理輸入驗證相關的錯誤
 */

const DomainException = require('./DomainException');

class ValidationException extends DomainException {
    constructor(message, errors = []) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationException';
        this.errors = Array.isArray(errors) ? errors : [errors];
    }

    /**
     * 添加驗證錯誤
     * @param {string} error 錯誤信息
     */
    addError(error) {
        this.errors.push(error);
    }

    /**
     * 獲取所有錯誤信息
     * @returns {Array} 錯誤信息陣列
     */
    getErrors() {
        return this.errors;
    }

    /**
     * 檢查是否有錯誤
     * @returns {boolean} 是否有錯誤
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * 轉換為可序列化的對象
     * @returns {Object} 序列化的錯誤信息
     */
    toJSON() {
        return {
            ...super.toJSON(),
            errors: this.errors
        };
    }
}

module.exports = ValidationException;