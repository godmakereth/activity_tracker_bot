/**
 * 活動倉庫實現
 */
const moment = require('moment-timezone');
const { ActivityStatus } = require('../../../shared/constants/ActivityTypes');

class ActivityRepository {
    constructor(databaseConnection) {
        this.db = databaseConnection;
    }

    /**
     * 查找正在進行的活動
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @returns {Object|null} 正在進行的活動
     */
    async findOngoingByUser(userId, chatId) {
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
            console.error('查找正在進行的活動失敗:', error);
            throw error;
        }
    }

    /**
     * 開始新活動
     * @param {Object} activity 活動資訊
     * @returns {Object} 創建的活動記錄
     */
    async startActivity(activity) {
        try {
            const now = moment().tz('Asia/Taipei');
            
            // 插入到正在進行的活動表
            const insertOngoingSql = `
                INSERT INTO ongoing_activities 
                (user_id, chat_id, activity_type, start_time, user_full_name, chat_title)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const result = this.db.exec(insertOngoingSql, [
                activity.userId,
                activity.chatId,
                activity.activityType,
                now.toISOString(),
                activity.userFullName,
                activity.chatTitle
            ]);

            if (result.changes === 0) {
                throw new Error('無法創建活動記錄');
            }

            return {
                userId: activity.userId,
                chatId: activity.chatId,
                activityType: activity.activityType,
                startTime: now.toDate(),
                userFullName: activity.userFullName,
                chatTitle: activity.chatTitle,
                status: ActivityStatus.ONGOING
            };
        } catch (error) {
            console.error('開始活動失敗:', error);
            throw error;
        }
    }

    /**
     * 完成活動
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @param {number} overtime 超時時間（秒）
     * @returns {Object|null} 完成的活動記錄
     */
    async completeActivity(userId, chatId, overtime = 0) {
        try {
            // 1. 從正在進行的活動表中獲取活動
            const ongoingSql = `
                SELECT * FROM ongoing_activities 
                WHERE user_id = ? AND chat_id = ?
            `;
            const ongoingActivity = this.db.get(ongoingSql, [userId, chatId]);
            
            if (!ongoingActivity) {
                return null;
            }

            const endTime = moment().tz('Asia/Taipei');
            const startTime = moment(ongoingActivity.start_time);
            const duration = Math.floor(endTime.diff(startTime) / 1000); // 秒

            // 2. 插入到完成的活動表
            const insertCompletedSql = `
                INSERT INTO activities 
                (user_id, chat_id, activity_type, start_time, end_time, duration, overtime, 
                 user_full_name, chat_title, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const insertResult = this.db.exec(insertCompletedSql, [
                ongoingActivity.user_id,
                ongoingActivity.chat_id,
                ongoingActivity.activity_type,
                ongoingActivity.start_time,
                endTime.toISOString(),
                duration,
                overtime,
                ongoingActivity.user_full_name,
                ongoingActivity.chat_title,
                overtime > 0 ? ActivityStatus.OVERTIME : ActivityStatus.COMPLETED
            ]);

            // 3. 從正在進行的活動表中刪除
            const deleteSql = `
                DELETE FROM ongoing_activities 
                WHERE user_id = ? AND chat_id = ?
            `;
            this.db.exec(deleteSql, [userId, chatId]);

            return {
                id: insertResult.lastInsertRowid || Math.max(...this.db.data.activities.map(a => a.id)) + 1,
                userId: ongoingActivity.user_id,
                chatId: ongoingActivity.chat_id,
                activityType: ongoingActivity.activity_type,
                startTime: new Date(ongoingActivity.start_time),
                endTime: endTime.toDate(),
                duration: duration,
                overtime: overtime,
                userFullName: ongoingActivity.user_full_name,
                chatTitle: ongoingActivity.chat_title,
                status: overtime > 0 ? ActivityStatus.OVERTIME : ActivityStatus.COMPLETED
            };
        } catch (error) {
            console.error('完成活動失敗:', error);
            throw error;
        }
    }

    /**
     * 根據ID查找活動
     * @param {number} id 活動ID
     * @returns {Object|null} 活動記錄
     */
    async findById(id) {
        try {
            const sql = `
                SELECT * FROM activities WHERE id = ?
            `;
            const row = await this.db.get(sql, [id]);
            
            if (!row) {
                return null;
            }

            return this.mapRowToActivity(row);
        } catch (error) {
            console.error('根據ID查找活動失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取用戶在特定時間範圍內的活動
     * @param {string} userId 用戶ID
     * @param {string} chatId 聊天室ID
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     * @returns {Array} 活動列表
     */
    async findByUserAndDateRange(userId, chatId, startDate, endDate) {
        try {
            const sql = `
                SELECT * FROM activities 
                WHERE user_id = ? AND chat_id = ? 
                AND date(start_time) BETWEEN date(?) AND date(?)
                ORDER BY start_time DESC
            `;
            
            const rows = await this.db.query(sql, [
                userId, 
                chatId, 
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            ]);

            return rows.map(row => this.mapRowToActivity(row));
        } catch (error) {
            console.error('查找用戶活動失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取聊天室統計數據
     * @param {string} chatId 聊天室ID
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     * @returns {Array} 統計數據
     */
    async getStatistics(chatId, startDate, endDate) {
        try {
            const sql = `
                SELECT 
                    user_full_name,
                    activity_type,
                    COUNT(*) as count,
                    SUM(duration) as total_duration,
                    SUM(overtime) as total_overtime,
                    COUNT(CASE WHEN overtime > 0 THEN 1 END) as overtime_count
                FROM activities 
                WHERE chat_id = ? 
                AND date(start_time) BETWEEN date(?) AND date(?)
                GROUP BY user_full_name, activity_type
                ORDER BY user_full_name, activity_type
            `;
            
            const rows = await this.db.query(sql, [
                chatId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            ]);

            return rows.map(row => ({
                userFullName: row.user_full_name,
                activityType: row.activity_type,
                count: row.count,
                totalDuration: row.total_duration,
                totalOvertime: row.total_overtime,
                overtimeCount: row.overtime_count
            }));
        } catch (error) {
            console.error('獲取統計數據失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取今日活動統計
     * @param {string} chatId 聊天室ID
     * @returns {Array} 今日統計數據
     */
    async getTodayStatistics(chatId) {
        const today = moment().tz('Asia/Taipei').startOf('day').toDate();
        const tomorrow = moment().tz('Asia/Taipei').endOf('day').toDate();
        return this.getStatistics(chatId, today, tomorrow);
    }

    /**
     * 獲取所有正在進行的活動
     * @returns {Array} 正在進行的活動列表
     */
    async findAllOngoing() {
        try {
            const sql = `
                SELECT * FROM ongoing_activities 
                ORDER BY start_time ASC
            `;
            const rows = await this.db.query(sql);
            
            return rows.map(row => ({
                userId: row.user_id,
                chatId: row.chat_id,
                activityType: row.activity_type,
                startTime: new Date(row.start_time),
                userFullName: row.user_full_name,
                chatTitle: row.chat_title,
                createdAt: new Date(row.created_at)
            }));
        } catch (error) {
            console.error('查找所有正在進行的活動失敗:', error);
            throw error;
        }
    }

    /**
     * 清理過期的正在進行活動（超過24小時）
     * @returns {number} 清理的記錄數
     */
    async cleanupStaleOngoingActivities() {
        try {
            const cutoff = moment().tz('Asia/Taipei').subtract(24, 'hours').toISOString();
            const sql = `
                DELETE FROM ongoing_activities 
                WHERE start_time < ?
            `;
            const result = await this.db.exec(sql, [cutoff]);
            
            if (result.changes > 0) {
                console.log(`清理了 ${result.changes} 條過期的正在進行活動`);
            }
            
            return result.changes;
        } catch (error) {
            console.error('清理過期活動失敗:', error);
            throw error;
        }
    }

    /**
     * 將資料庫行映射為活動物件
     * @param {Object} row 資料庫行
     * @returns {Object} 活動物件
     */
    mapRowToActivity(row) {
        return {
            id: row.id,
            userId: row.user_id,
            chatId: row.chat_id,
            activityType: row.activity_type,
            startTime: new Date(row.start_time),
            endTime: row.end_time ? new Date(row.end_time) : null,
            duration: row.duration,
            overtime: row.overtime,
            userFullName: row.user_full_name,
            chatTitle: row.chat_title,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}

module.exports = ActivityRepository;