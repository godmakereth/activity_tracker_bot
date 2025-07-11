/**
 * 聊天室倉庫實現
 */
const moment = require('moment-timezone');

class ChatRepository {
    constructor(databaseConnection) {
        this.db = databaseConnection;
    }

    /**
     * 根據ID查找聊天室
     * @param {string} chatId 聊天室ID
     * @returns {Object|null} 聊天室記錄
     */
    async findById(chatId) {
        try {
            const sql = `
                SELECT * FROM chat_settings WHERE chat_id = ?
            `;
            const row = this.db.get(sql, [chatId]);
            
            if (!row) {
                return null;
            }

            return this.mapRowToChat(row);
        } catch (error) {
            console.error('根據ID查找聊天室失敗:', error);
            throw error;
        }
    }

    /**
     * 保存聊天室設定
     * @param {Object} chat 聊天室物件
     * @returns {Object} 保存的聊天室記錄
     */
    async save(chat) {
        try {
            const now = moment().tz('Asia/Taipei').toISOString();
            
            // 檢查是否已存在
            const existing = await this.findById(chat.chatId);
            
            if (existing) {
                // 更新現有記錄
                const updateSql = `
                    UPDATE chat_settings 
                    SET chat_title = ?, timezone = ?, report_enabled = ?, 
                        report_time = ?, language = ?, updated_at = ?
                    WHERE chat_id = ?
                `;
                
                this.db.exec(updateSql, [
                    chat.chatTitle,
                    chat.timezone || 'Asia/Taipei',
                    chat.reportEnabled ? 1 : 0,
                    chat.reportTime || '23:00',
                    chat.language || 'zh-TW',
                    now,
                    chat.chatId
                ]);
                
                return { ...existing, ...chat, updatedAt: new Date(now) };
            } else {
                // 創建新記錄
                const insertSql = `
                    INSERT INTO chat_settings 
                    (chat_id, chat_title, timezone, report_enabled, report_time, language, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                this.db.exec(insertSql, [
                    chat.chatId,
                    chat.chatTitle,
                    chat.timezone || 'Asia/Taipei',
                    chat.reportEnabled ? 1 : 0,
                    chat.reportTime || '23:00',
                    chat.language || 'zh-TW',
                    now,
                    now
                ]);
                
                return {
                    chatId: chat.chatId,
                    chatTitle: chat.chatTitle,
                    timezone: chat.timezone || 'Asia/Taipei',
                    reportEnabled: chat.reportEnabled !== false,
                    reportTime: chat.reportTime || '23:00',
                    language: chat.language || 'zh-TW',
                    createdAt: new Date(now),
                    updatedAt: new Date(now)
                };
            }
        } catch (error) {
            console.error('保存聊天室設定失敗:', error);
            throw error;
        }
    }

    /**
     * 更新聊天室資訊
     * @param {string} chatId 聊天室ID
     * @param {string} chatTitle 聊天室標題
     * @returns {Object} 更新後的聊天室記錄
     */
    async updateChatInfo(chatId, chatTitle) {
        try {
            let chat = await this.findById(chatId);
            
            if (!chat) {
                // 如果不存在，創建新記錄
                chat = {
                    chatId: chatId,
                    chatTitle: chatTitle,
                    timezone: 'Asia/Taipei',
                    reportEnabled: true,
                    reportTime: '23:00',
                    language: 'zh-TW'
                };
            } else {
                // 更新標題
                chat.chatTitle = chatTitle;
            }
            
            return await this.save(chat);
        } catch (error) {
            console.error('更新聊天室資訊失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取啟用報告功能的聊天室
     * @returns {Array} 啟用報告的聊天室列表
     */
    async findReportEnabledChats() {
        try {
            const sql = `
                SELECT * FROM chat_settings 
                WHERE report_enabled = 1
                ORDER BY chat_title
            `;
            const rows = this.db.query(sql);
            
            return rows.map(row => this.mapRowToChat(row));
        } catch (error) {
            console.error('獲取啟用報告的聊天室失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取指定時間需要生成報告的聊天室
     * @param {string} time 時間格式 HH:mm
     * @returns {Array} 需要生成報告的聊天室列表
     */
    async findChatsForReportTime(time) {
        try {
            const sql = `
                SELECT * FROM chat_settings 
                WHERE report_enabled = 1 AND report_time = ?
                ORDER BY chat_title
            `;
            const rows = this.db.query(sql, [time]);
            
            return rows.map(row => this.mapRowToChat(row));
        } catch (error) {
            console.error('獲取指定時間報告聊天室失敗:', error);
            throw error;
        }
    }

    /**
     * 設定聊天室報告功能
     * @param {string} chatId 聊天室ID
     * @param {boolean} enabled 是否啟用
     * @returns {Object} 更新後的聊天室記錄
     */
    async setReportEnabled(chatId, enabled) {
        try {
            let chat = await this.findById(chatId);
            
            if (!chat) {
                throw new Error('聊天室不存在');
            }
            
            chat.reportEnabled = enabled;
            return await this.save(chat);
        } catch (error) {
            console.error('設定聊天室報告功能失敗:', error);
            throw error;
        }
    }

    /**
     * 設定聊天室報告時間
     * @param {string} chatId 聊天室ID
     * @param {string} reportTime 報告時間 HH:mm
     * @returns {Object} 更新後的聊天室記錄
     */
    async setReportTime(chatId, reportTime) {
        try {
            let chat = await this.findById(chatId);
            
            if (!chat) {
                throw new Error('聊天室不存在');
            }
            
            chat.reportTime = reportTime;
            return await this.save(chat);
        } catch (error) {
            console.error('設定聊天室報告時間失敗:', error);
            throw error;
        }
    }

    /**
     * 設定聊天室語言
     * @param {string} chatId 聊天室ID
     * @param {string} language 語言代碼
     * @returns {Object} 更新後的聊天室記錄
     */
    async setLanguage(chatId, language) {
        try {
            let chat = await this.findById(chatId);
            
            if (!chat) {
                throw new Error('聊天室不存在');
            }
            
            chat.language = language;
            return await this.save(chat);
        } catch (error) {
            console.error('設定聊天室語言失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取所有聊天室
     * @returns {Array} 所有聊天室列表
     */
    async findAll() {
        try {
            const sql = `
                SELECT * FROM chat_settings 
                ORDER BY chat_title
            `;
            const rows = this.db.query(sql);
            
            return rows.map(row => this.mapRowToChat(row));
        } catch (error) {
            console.error('獲取所有聊天室失敗:', error);
            throw error;
        }
    }

    /**
     * 刪除聊天室設定
     * @param {string} chatId 聊天室ID
     * @returns {boolean} 是否成功刪除
     */
    async delete(chatId) {
        try {
            const sql = `
                DELETE FROM chat_settings WHERE chat_id = ?
            `;
            const result = this.db.exec(sql, [chatId]);
            
            return result.changes > 0;
        } catch (error) {
            console.error('刪除聊天室設定失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取聊天室統計
     * @returns {Object} 聊天室統計資訊
     */
    async getStatistics() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_chats,
                    COUNT(CASE WHEN report_enabled = 1 THEN 1 END) as report_enabled_chats,
                    COUNT(CASE WHEN language = 'zh-TW' THEN 1 END) as chinese_chats,
                    COUNT(CASE WHEN language = 'th' THEN 1 END) as thai_chats
                FROM chat_settings
            `;
            const result = this.db.get(sql);
            
            return {
                totalChats: result.total_chats,
                reportEnabledChats: result.report_enabled_chats,
                chineseChats: result.chinese_chats,
                thaiChats: result.thai_chats
            };
        } catch (error) {
            console.error('獲取聊天室統計失敗:', error);
            throw error;
        }
    }

    /**
     * 將資料庫行映射為聊天室物件
     * @param {Object} row 資料庫行
     * @returns {Object} 聊天室物件
     */
    mapRowToChat(row) {
        return {
            chatId: row.chat_id,
            chatTitle: row.chat_title,
            timezone: row.timezone,
            reportEnabled: row.report_enabled === 1,
            reportTime: row.report_time,
            language: row.language,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}

module.exports = ChatRepository;