/**
 * 聊天室實體
 * 代表系統中的聊天室
 */

const ValidationException = require('../../shared/exceptions/ValidationException');

class Chat {
    constructor(id, title, type = 'private') {
        this.id = id;
        this.title = title;
        this.type = type;
        this.createdAt = new Date();
        this.updatedAt = new Date();

        this.validate();
    }

    /**
     * 驗證聊天室數據
     * @throws {ValidationException} 當數據無效時拋出異常
     */
    validate() {
        const errors = [];

        if (!this.id) {
            errors.push('聊天室ID不能為空');
        }

        if (!this.title) {
            errors.push('聊天室標題不能為空');
        }

        if (typeof this.title !== 'string' || this.title.trim().length === 0) {
            errors.push('聊天室標題必須是非空字符串');
        }

        const validTypes = ['private', 'group', 'supergroup', 'channel'];
        if (!validTypes.includes(this.type)) {
            errors.push(`無效的聊天室類型: ${this.type}。有效類型: ${validTypes.join(', ')}`);
        }

        if (errors.length > 0) {
            throw new ValidationException('聊天室數據驗證失敗', errors);
        }
    }

    /**
     * 獲取聊天室ID
     * @returns {string} 聊天室ID
     */
    getId() {
        return this.id;
    }

    /**
     * 獲取聊天室標題
     * @returns {string} 聊天室標題
     */
    getTitle() {
        return this.title;
    }

    /**
     * 獲取聊天室類型
     * @returns {string} 聊天室類型
     */
    getType() {
        return this.type;
    }

    /**
     * 獲取顯示名稱
     * @returns {string} 顯示名稱
     */
    getDisplayName() {
        return this.title;
    }

    /**
     * 檢查是否為私人聊天
     * @returns {boolean} 是否為私人聊天
     */
    isPrivate() {
        return this.type === 'private';
    }

    /**
     * 檢查是否為群組聊天
     * @returns {boolean} 是否為群組聊天
     */
    isGroup() {
        return this.type === 'group' || this.type === 'supergroup';
    }

    /**
     * 檢查是否為頻道
     * @returns {boolean} 是否為頻道
     */
    isChannel() {
        return this.type === 'channel';
    }

    /**
     * 更新聊天室信息
     * @param {Object} updates 更新的字段
     */
    update(updates) {
        if (updates.title) {
            this.title = updates.title;
        }
        if (updates.type) {
            this.type = updates.type;
        }
        
        this.updatedAt = new Date();
        this.validate();
    }

    /**
     * 獲取報告目錄名稱
     * @returns {string} 報告目錄名稱
     */
    getReportDirectoryName() {
        // 清理文件名，移除不安全的字符
        return this.title
            .replace(/[<>:"/\\|?*]/g, '_')  // 替換不安全字符為下劃線
            .replace(/\s+/g, '_')           // 替換空格為下劃線
            .trim();
    }

    /**
     * 獲取聊天室摘要信息
     * @returns {Object} 聊天室摘要
     */
    getSummary() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            displayName: this.getDisplayName(),
            isPrivate: this.isPrivate(),
            isGroup: this.isGroup(),
            isChannel: this.isChannel(),
            reportDirectoryName: this.getReportDirectoryName()
        };
    }

    /**
     * 檢查是否相等
     * @param {Chat} other 另一個聊天室
     * @returns {boolean} 是否相等
     */
    equals(other) {
        return other instanceof Chat && this.id === other.id;
    }

    /**
     * 轉換為 JSON
     * @returns {Object} JSON 對象
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            displayName: this.getDisplayName(),
            isPrivate: this.isPrivate(),
            isGroup: this.isGroup(),
            isChannel: this.isChannel(),
            reportDirectoryName: this.getReportDirectoryName(),
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    /**
     * 從 Telegram 聊天對象創建聊天室實體
     * @param {Object} telegramChat Telegram 聊天對象
     * @returns {Chat} 聊天室實體
     */
    static fromTelegramChat(telegramChat) {
        let title;
        
        if (telegramChat.title) {
            title = telegramChat.title;
        } else if (telegramChat.first_name && telegramChat.last_name) {
            title = `${telegramChat.first_name} ${telegramChat.last_name}`;
        } else if (telegramChat.first_name) {
            title = telegramChat.first_name;
        } else if (telegramChat.username) {
            title = `@${telegramChat.username}`;
        } else {
            title = telegramChat.id.toString();
        }

        return new Chat(
            telegramChat.id.toString(),
            title,
            telegramChat.type || 'private'
        );
    }

    /**
     * 從原始數據創建聊天室實體
     * @param {Object} data 原始數據
     * @returns {Chat} 聊天室實體
     */
    static fromData(data) {
        return new Chat(
            data.id || data.chat_id,
            data.title || data.chat_title,
            data.type || 'private'
        );
    }
}

module.exports = Chat;