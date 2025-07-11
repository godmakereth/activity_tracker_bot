/**
 * 用戶倉庫實現
 */
const moment = require('moment-timezone');

class UserRepository {
    constructor(databaseConnection) {
        this.db = databaseConnection;
    }

    /**
     * 根據ID查找用戶
     * @param {string} userId 用戶ID
     * @returns {Object|null} 用戶記錄
     */
    async findById(userId) {
        try {
            // 從活動記錄中獲取用戶資訊
            const sql = `
                SELECT DISTINCT user_id, user_full_name, 
                       COUNT(*) as activity_count,
                       MAX(created_at) as last_activity
                FROM activities 
                WHERE user_id = ?
                GROUP BY user_id, user_full_name
            `;
            const row = this.db.get(sql, [userId]);
            
            if (!row) {
                return null;
            }

            return {
                userId: row.user_id,
                fullName: row.user_full_name,
                activityCount: row.activity_count,
                lastActivity: new Date(row.last_activity)
            };
        } catch (error) {
            console.error('根據ID查找用戶失敗:', error);
            throw error;
        }
    }

    /**
     * 保存用戶（這裡主要是更新用戶資訊）
     * @param {Object} user 用戶物件
     * @returns {Object} 保存的用戶記錄
     */
    async save(user) {
        try {
            // 用戶資訊主要從活動記錄中管理，這裡返回傳入的用戶物件
            return {
                userId: user.userId,
                fullName: user.fullName,
                updatedAt: new Date()
            };
        } catch (error) {
            console.error('保存用戶失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取聊天室中的所有用戶
     * @param {string} chatId 聊天室ID
     * @returns {Array} 用戶列表
     */
    async findByChatId(chatId) {
        try {
            const sql = `
                SELECT DISTINCT user_id, user_full_name,
                       COUNT(*) as activity_count,
                       MAX(created_at) as last_activity
                FROM activities 
                WHERE chat_id = ?
                GROUP BY user_id, user_full_name
                ORDER BY user_full_name
            `;
            const rows = this.db.query(sql, [chatId]);
            
            return rows.map(row => ({
                userId: row.user_id,
                fullName: row.user_full_name,
                activityCount: row.activity_count,
                lastActivity: new Date(row.last_activity)
            }));
        } catch (error) {
            console.error('根據聊天室ID查找用戶失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取用戶在聊天室中的活動統計
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     * @returns {Object} 用戶活動統計
     */
    async getUserActivityStats(userId, chatId, startDate, endDate) {
        try {
            const sql = `
                SELECT 
                    user_id,
                    user_full_name,
                    activity_type,
                    COUNT(*) as count,
                    SUM(duration) as total_duration,
                    SUM(overtime) as total_overtime,
                    COUNT(CASE WHEN overtime > 0 THEN 1 END) as overtime_count,
                    AVG(duration) as avg_duration,
                    MIN(duration) as min_duration,
                    MAX(duration) as max_duration
                FROM activities 
                WHERE user_id = ? AND chat_id = ?
                AND date(start_time) BETWEEN date(?) AND date(?)
                GROUP BY user_id, user_full_name, activity_type
                ORDER BY activity_type
            `;
            
            const rows = this.db.query(sql, [
                userId, 
                chatId, 
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            ]);

            return rows.map(row => ({
                userId: row.user_id,
                fullName: row.user_full_name,
                activityType: row.activity_type,
                count: row.count,
                totalDuration: row.total_duration,
                totalOvertime: row.total_overtime,
                overtimeCount: row.overtime_count,
                avgDuration: Math.round(row.avg_duration),
                minDuration: row.min_duration,
                maxDuration: row.max_duration
            }));
        } catch (error) {
            console.error('獲取用戶活動統計失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取活躍用戶排行
     * @param {string} chatId 聊天室ID
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     * @param {number} limit 返回數量限制
     * @returns {Array} 活躍用戶排行
     */
    async getActiveUsersRanking(chatId, startDate, endDate, limit = 10) {
        try {
            const sql = `
                SELECT 
                    user_id,
                    user_full_name,
                    COUNT(*) as total_activities,
                    SUM(duration) as total_duration,
                    SUM(overtime) as total_overtime,
                    COUNT(CASE WHEN overtime > 0 THEN 1 END) as overtime_count,
                    AVG(duration) as avg_duration
                FROM activities 
                WHERE chat_id = ?
                AND date(start_time) BETWEEN date(?) AND date(?)
                GROUP BY user_id, user_full_name
                ORDER BY total_activities DESC, total_duration DESC
                LIMIT ?
            `;
            
            const rows = this.db.query(sql, [
                chatId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0],
                limit
            ]);

            return rows.map((row, index) => ({
                rank: index + 1,
                userId: row.user_id,
                fullName: row.user_full_name,
                totalActivities: row.total_activities,
                totalDuration: row.total_duration,
                totalOvertime: row.total_overtime,
                overtimeCount: row.overtime_count,
                avgDuration: Math.round(row.avg_duration)
            }));
        } catch (error) {
            console.error('獲取活躍用戶排行失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取用戶今日活動統計
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {Object} 今日活動統計
     */
    async getTodayStats(userId, chatId) {
        const today = moment().tz('Asia/Taipei').startOf('day').toDate();
        const tomorrow = moment().tz('Asia/Taipei').endOf('day').toDate();
        
        const stats = await this.getUserActivityStats(userId, chatId, today, tomorrow);
        
        // 彙總所有活動類型的統計
        const summary = {
            totalActivities: 0,
            totalDuration: 0,
            totalOvertime: 0,
            overtimeCount: 0,
            activities: stats
        };

        stats.forEach(stat => {
            summary.totalActivities += stat.count;
            summary.totalDuration += stat.totalDuration;
            summary.totalOvertime += stat.totalOvertime;
            summary.overtimeCount += stat.overtimeCount;
        });

        return summary;
    }

    /**
     * 檢查用戶是否在聊天室中有活動
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {boolean} 是否有活動
     */
    async hasActivityInChat(userId, chatId) {
        try {
            const sql = `
                SELECT COUNT(*) as count 
                FROM activities 
                WHERE user_id = ? AND chat_id = ?
            `;
            const result = this.db.get(sql, [userId, chatId]);
            
            return result.count > 0;
        } catch (error) {
            console.error('檢查用戶活動失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取用戶的正在進行活動
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {Object|null} 正在進行的活動
     */
    async getOngoingActivity(userId, chatId) {
        try {
            const sql = `
                SELECT * FROM ongoing_activities 
                WHERE user_id = ? AND chat_id = ?
            `;
            const row = this.db.get(sql, [userId, chatId]);
            
            if (!row) {
                return null;
            }

            return {
                userId: row.user_id,
                chatId: row.chat_id,
                activityType: row.activity_type,
                startTime: new Date(row.start_time),
                userFullName: row.user_full_name,
                chatTitle: row.chat_title,
                createdAt: new Date(row.created_at)
            };
        } catch (error) {
            console.error('獲取正在進行的活動失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取所有用戶統計
     * @returns {Object} 用戶統計資訊
     */
    async getAllUsersStats() {
        try {
            const sql = `
                SELECT 
                    COUNT(DISTINCT user_id) as total_users,
                    COUNT(DISTINCT chat_id) as total_chats,
                    COUNT(*) as total_activities,
                    SUM(duration) as total_duration,
                    SUM(overtime) as total_overtime,
                    COUNT(CASE WHEN overtime > 0 THEN 1 END) as total_overtime_count
                FROM activities
            `;
            const result = this.db.get(sql);
            
            return {
                totalUsers: result.total_users,
                totalChats: result.total_chats,
                totalActivities: result.total_activities,
                totalDuration: result.total_duration,
                totalOvertime: result.total_overtime,
                totalOvertimeCount: result.total_overtime_count
            };
        } catch (error) {
            console.error('獲取所有用戶統計失敗:', error);
            throw error;
        }
    }
}

module.exports = UserRepository;