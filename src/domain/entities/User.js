/**
 * 用戶實體
 * 代表系統中的用戶
 */

const ValidationException = require('../../shared/exceptions/ValidationException');

class User {
    constructor(id, name, firstName = null, lastName = null, username = null) {
        this.id = id;
        this.name = name;
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.createdAt = new Date();
        this.updatedAt = new Date();

        this.validate();
    }

    /**
     * 驗證用戶數據
     * @throws {ValidationException} 當數據無效時拋出異常
     */
    validate() {
        const errors = [];

        if (!this.id) {
            errors.push('用戶ID不能為空');
        }

        if (!this.name) {
            errors.push('用戶名稱不能為空');
        }

        if (typeof this.name !== 'string' || this.name.trim().length === 0) {
            errors.push('用戶名稱必須是非空字符串');
        }

        if (errors.length > 0) {
            throw new ValidationException('用戶數據驗證失敗', errors);
        }
    }

    /**
     * 獲取用戶ID
     * @returns {string} 用戶ID
     */
    getId() {
        return this.id;
    }

    /**
     * 獲取顯示名稱
     * @returns {string} 顯示名稱
     */
    getDisplayName() {
        if (this.firstName && this.lastName) {
            return `${this.firstName} ${this.lastName}`;
        } else if (this.firstName) {
            return this.firstName;
        } else if (this.username) {
            return `@${this.username}`;
        } else {
            return this.name;
        }
    }

    /**
     * 獲取完整名稱信息
     * @returns {string} 完整名稱
     */
    getFullName() {
        const parts = [];
        
        if (this.firstName) parts.push(this.firstName);
        if (this.lastName) parts.push(this.lastName);
        
        if (parts.length > 0) {
            let fullName = parts.join(' ');
            if (this.username) {
                fullName += ` (@${this.username})`;
            }
            return fullName;
        }
        
        return this.getDisplayName();
    }

    /**
     * 更新用戶信息
     * @param {Object} updates 更新的字段
     */
    update(updates) {
        if (updates.name) {
            this.name = updates.name;
        }
        if (updates.firstName !== undefined) {
            this.firstName = updates.firstName;
        }
        if (updates.lastName !== undefined) {
            this.lastName = updates.lastName;
        }
        if (updates.username !== undefined) {
            this.username = updates.username;
        }
        
        this.updatedAt = new Date();
        this.validate();
    }

    /**
     * 檢查是否有用戶名
     * @returns {boolean} 是否有用戶名
     */
    hasUsername() {
        return this.username && this.username.trim().length > 0;
    }

    /**
     * 檢查是否有真實姓名
     * @returns {boolean} 是否有真實姓名
     */
    hasRealName() {
        return (this.firstName && this.firstName.trim().length > 0) ||
               (this.lastName && this.lastName.trim().length > 0);
    }

    /**
     * 獲取用戶摘要信息
     * @returns {Object} 用戶摘要
     */
    getSummary() {
        return {
            id: this.id,
            displayName: this.getDisplayName(),
            fullName: this.getFullName(),
            hasUsername: this.hasUsername(),
            hasRealName: this.hasRealName()
        };
    }

    /**
     * 檢查是否相等
     * @param {User} other 另一個用戶
     * @returns {boolean} 是否相等
     */
    equals(other) {
        return other instanceof User && this.id === other.id;
    }

    /**
     * 轉換為 JSON
     * @returns {Object} JSON 對象
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            firstName: this.firstName,
            lastName: this.lastName,
            username: this.username,
            displayName: this.getDisplayName(),
            fullName: this.getFullName(),
            hasUsername: this.hasUsername(),
            hasRealName: this.hasRealName(),
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    /**
     * 從 Telegram 用戶對象創建用戶實體
     * @param {Object} telegramUser Telegram 用戶對象
     * @returns {User} 用戶實體
     */
    static fromTelegramUser(telegramUser) {
        const displayName = telegramUser.first_name || 
                           telegramUser.username || 
                           telegramUser.id.toString();

        return new User(
            telegramUser.id.toString(),
            displayName,
            telegramUser.first_name,
            telegramUser.last_name,
            telegramUser.username
        );
    }

    /**
     * 從原始數據創建用戶實體
     * @param {Object} data 原始數據
     * @returns {User} 用戶實體
     */
    static fromData(data) {
        return new User(
            data.id || data.user_id,
            data.name || data.user_name,
            data.firstName || data.first_name,
            data.lastName || data.last_name,
            data.username
        );
    }
}

module.exports = User;