/**
 * 簡化版資料庫連接 - 使用檔案存儲
 * 暫時替代方案，直到 SQLite 模組問題解決
 */
const fs = require('fs');
const path = require('path');

class SimpleDatabaseConnection {
    constructor(dbPath = './data/activities.db') {
        this.dbPath = dbPath;
        this.dataPath = dbPath.replace('.db', '.json');
        this.isConnected = false;
        this.data = {
            activities: [],
            ongoing_activities: [],
            chat_settings: []
        };
    }

    /**
     * 連接資料庫（載入檔案）
     */
    async connect() {
        try {
            // 確保資料庫目錄存在
            const dbDir = path.dirname(this.dbPath);
            fs.mkdirSync(dbDir, { recursive: true });

            // 載入現有資料
            if (fs.existsSync(this.dataPath)) {
                const fileContent = fs.readFileSync(this.dataPath, 'utf8');
                this.data = JSON.parse(fileContent);
            }

            this.isConnected = true;
            console.log(`✅ 簡化資料庫連接成功: ${this.dataPath}`);
            
            // 初始化資料結構
            this.initializeSchema();
            
        } catch (error) {
            console.error('❌ 簡化資料庫連接失敗:', error);
            throw error;
        }
    }

    /**
     * 初始化資料庫結構
     */
    initializeSchema() {
        try {
            // 確保所有表都存在
            if (!this.data.activities) this.data.activities = [];
            if (!this.data.ongoing_activities) this.data.ongoing_activities = [];
            if (!this.data.chat_settings) this.data.chat_settings = [];

            console.log('✅ 資料庫結構初始化完成');
            
        } catch (error) {
            console.error('❌ 資料庫結構初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 保存資料到檔案
     */
    saveToFile() {
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('保存資料失敗:', error);
        }
    }

    /**
     * 關閉資料庫連接
     */
    close() {
        if (this.isConnected) {
            this.saveToFile();
            this.isConnected = false;
            console.log('✅ 簡化資料庫連接已關閉');
        }
    }

    /**
     * 執行 SQL 查詢 (模擬)
     */
    query(sql, params = []) {
        try {
            const tableName = this.extractTableName(sql);
            const table = this.data[tableName] || [];

            if (sql.includes('SELECT COUNT(*)')) {
                return [{ count: table.length }];
            }

            if (sql.includes('WHERE user_id = ? AND chat_id = ?')) {
                return table.filter(row => row.user_id === params[0] && row.chat_id === params[1]);
            }

            return table;
        } catch (error) {
            console.error('查詢執行失敗:', error);
            return [];
        }
    }

    /**
     * 執行 SQL 插入/更新/刪除 (模擬)
     */
    exec(sql, params = []) {
        try {
            const tableName = this.extractTableName(sql);

            if (sql.includes('INSERT INTO')) {
                return this.handleInsert(tableName, sql, params);
            } else if (sql.includes('DELETE FROM')) {
                return this.handleDelete(tableName, sql, params);
            } else if (sql.includes('UPDATE')) {
                return this.handleUpdate(tableName, sql, params);
            }

            return { changes: 0 };
        } catch (error) {
            console.error('SQL 執行失敗:', error);
            return { changes: 0 };
        }
    }

    /**
     * 獲取單一記錄 (模擬)
     */
    get(sql, params = []) {
        try {
            const results = this.query(sql, params);
            return results[0] || null;
        } catch (error) {
            console.error('查詢執行失敗:', error);
            return null;
        }
    }

    /**
     * 執行事務 (模擬)
     */
    runTransaction(callback) {
        try {
            const result = callback();
            this.saveToFile();
            return result;
        } catch (error) {
            console.error('事務執行失敗:', error);
            throw error;
        }
    }

    /**
     * 檢查連接狀態
     */
    isHealthy() {
        return this.isConnected;
    }

    /**
     * 獲取資料庫統計資訊
     */
    getStats() {
        try {
            return {
                totalActivities: this.data.activities?.length || 0,
                ongoingActivities: this.data.ongoing_activities?.length || 0,
                totalChats: this.data.chat_settings?.length || 0,
                dbPath: this.dataPath,
                isConnected: this.isConnected
            };
        } catch (error) {
            console.error('獲取資料庫統計失敗:', error);
            return {
                totalActivities: 0,
                ongoingActivities: 0,
                totalChats: 0,
                dbPath: this.dataPath,
                isConnected: this.isConnected
            };
        }
    }

    // 交易方法 (簡化版本)
    async runTransaction(callback) {
        try {
            return await callback();
        } catch (error) {
            console.error('交易執行失敗:', error);
            throw error;
        }
    }

    // 輔助方法
    extractTableName(sql) {
        const match = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
        return match ? match[1] : 'activities';
    }

    handleInsert(tableName, sql, params) {
        const table = this.data[tableName] || [];
        
        if (tableName === 'ongoing_activities') {
            const newRecord = {
                user_id: params[0],
                chat_id: params[1],
                activity_type: params[2],
                start_time: params[3],
                user_full_name: params[4],
                chat_title: params[5],
                created_at: new Date().toISOString()
            };
            
            // 檢查是否已存在
            const existingIndex = table.findIndex(r => r.user_id === params[0] && r.chat_id === params[1]);
            if (existingIndex >= 0) {
                table[existingIndex] = newRecord;
            } else {
                table.push(newRecord);
            }
            
            this.data[tableName] = table;
            this.saveToFile();
            return { changes: 1 };
        }

        if (tableName === 'activities') {
            const newRecord = {
                id: table.length + 1,
                user_id: params[0],
                chat_id: params[1],
                activity_type: params[2],
                start_time: params[3],
                end_time: params[4],
                duration: params[5],
                overtime: params[6],
                user_full_name: params[7],
                chat_title: params[8],
                status: params[9],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            table.push(newRecord);
            this.data[tableName] = table;
            this.saveToFile();
            return { changes: 1, lastInsertRowid: newRecord.id };
        }

        if (tableName === 'chat_settings') {
            const newRecord = {
                chat_id: params[0],
                chat_title: params[1],
                timezone: params[2] || 'Asia/Taipei',
                report_enabled: params[3] !== undefined ? params[3] : 1,
                report_time: params[4] || '23:00',
                language: params[5] || 'zh-TW',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // 檢查是否已存在
            const existingIndex = table.findIndex(r => r.chat_id === params[0]);
            if (existingIndex >= 0) {
                table[existingIndex] = { ...table[existingIndex], ...newRecord };
            } else {
                table.push(newRecord);
            }
            
            this.data[tableName] = table;
            this.saveToFile();
            return { changes: 1 };
        }

        return { changes: 0 };
    }

    handleDelete(tableName, sql, params) {
        const table = this.data[tableName] || [];
        
        if (sql.includes('WHERE user_id = ? AND chat_id = ?')) {
            const originalLength = table.length;
            this.data[tableName] = table.filter(row => !(row.user_id === params[0] && row.chat_id === params[1]));
            const changes = originalLength - this.data[tableName].length;
            
            if (changes > 0) {
                this.saveToFile();
            }
            
            return { changes };
        }

        return { changes: 0 };
    }

    handleUpdate(tableName, sql, params) {
        // 簡化實現，暫時不處理 UPDATE
        return { changes: 0 };
    }
}

module.exports = SimpleDatabaseConnection;