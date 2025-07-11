/**
 * 資料庫連接管理
 */
const Database = require('better-sqlite3');
const path = require('path');

class DatabaseConnection {
    constructor(dbPath = './data/activities.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.isConnected = false;
    }

    /**
     * 連接資料庫
     */
    async connect() {
        try {
            // 確保資料庫目錄存在
            const dbDir = path.dirname(this.dbPath);
            require('fs').mkdirSync(dbDir, { recursive: true });

            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.isConnected = true;
            
            console.log(`✅ 資料庫連接成功: ${this.dbPath}`);
            
            // 初始化資料庫結構
            this.initializeSchema();
            
        } catch (error) {
            console.error('❌ 資料庫連接失敗:', error);
            throw error;
        }
    }

    /**
     * 初始化資料庫結構
     */
    initializeSchema() {
        try {
            // 創建活動記錄表
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    chat_id TEXT NOT NULL,
                    activity_type TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration INTEGER,
                    overtime INTEGER DEFAULT 0,
                    user_full_name TEXT NOT NULL,
                    chat_title TEXT,
                    status TEXT DEFAULT 'ongoing',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 創建正在進行的活動表
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS ongoing_activities (
                    user_id TEXT NOT NULL,
                    chat_id TEXT NOT NULL,
                    activity_type TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    user_full_name TEXT NOT NULL,
                    chat_title TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, chat_id)
                )
            `);

            // 創建聊天室設定表
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS chat_settings (
                    chat_id TEXT PRIMARY KEY,
                    chat_title TEXT NOT NULL,
                    timezone TEXT DEFAULT 'Asia/Taipei',
                    report_enabled INTEGER DEFAULT 1,
                    report_time TEXT DEFAULT '23:00',
                    language TEXT DEFAULT 'zh-TW',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 創建索引
            this.db.exec(`
                CREATE INDEX IF NOT EXISTS idx_activities_user_chat_status 
                ON activities (user_id, chat_id, status);
                
                CREATE INDEX IF NOT EXISTS idx_activities_chat_date 
                ON activities (chat_id, date(start_time));
                
                CREATE INDEX IF NOT EXISTS idx_activities_type_date 
                ON activities (activity_type, date(start_time));
                
                CREATE INDEX IF NOT EXISTS idx_ongoing_user_chat 
                ON ongoing_activities (user_id, chat_id);
            `);

            console.log('✅ 資料庫結構初始化完成');
            
        } catch (error) {
            console.error('❌ 資料庫結構初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取資料庫連接
     */
    getConnection() {
        if (!this.isConnected || !this.db) {
            throw new Error('資料庫未連接');
        }
        return this.db;
    }

    /**
     * 關閉資料庫連接
     */
    close() {
        if (this.db) {
            this.db.close();
            this.isConnected = false;
            console.log('✅ 資料庫連接已關閉');
        }
    }

    /**
     * 開始事務
     */
    beginTransaction() {
        return this.db.transaction(() => {
            // 事務邏輯將在回調中執行
        });
    }

    /**
     * 執行 SQL 查詢
     */
    query(sql, params = []) {
        try {
            return this.db.prepare(sql).all(params);
        } catch (error) {
            console.error('查詢執行失敗:', error);
            throw error;
        }
    }

    /**
     * 執行 SQL 插入/更新/刪除
     */
    exec(sql, params = []) {
        try {
            return this.db.prepare(sql).run(params);
        } catch (error) {
            console.error('SQL 執行失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取單一記錄
     */
    get(sql, params = []) {
        try {
            return this.db.prepare(sql).get(params);
        } catch (error) {
            console.error('查詢執行失敗:', error);
            throw error;
        }
    }

    /**
     * 執行事務
     */
    async runTransaction(callback) {
        const transaction = this.db.transaction(() => {
            return callback();
        });
        
        try {
            return transaction();
        } catch (error) {
            console.error('事務執行失敗:', error);
            throw error;
        }
    }

    /**
     * 檢查連接狀態
     */
    isHealthy() {
        try {
            this.db.prepare('SELECT 1').get();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 獲取資料庫統計資訊
     */
    getStats() {
        try {
            const stats = {
                totalActivities: this.get('SELECT COUNT(*) as count FROM activities')?.count || 0,
                ongoingActivities: this.get('SELECT COUNT(*) as count FROM ongoing_activities')?.count || 0,
                totalChats: this.get('SELECT COUNT(*) as count FROM chat_settings')?.count || 0,
                dbPath: this.dbPath,
                isConnected: this.isConnected
            };
            return stats;
        } catch (error) {
            console.error('獲取資料庫統計失敗:', error);
            return null;
        }
    }
}

module.exports = DatabaseConnection;