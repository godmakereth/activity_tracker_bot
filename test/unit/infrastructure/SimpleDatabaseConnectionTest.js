/**
 * SimpleDatabaseConnection 測試
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SimpleDatabaseConnection = require('../../../src/infrastructure/database/SimpleDatabaseConnection');

describe('SimpleDatabaseConnection Tests', () => {
    let db;
    let testDbPath;

    beforeEach(() => {
        testDbPath = path.join(__dirname, '../../fixtures/test_activities.json');
        db = new SimpleDatabaseConnection(testDbPath);
        
        // 清理測試資料
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    afterEach(() => {
        if (db && db.isConnected) {
            db.close();
        }
        
        // 清理測試資料
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('Connection Management', () => {
        it('should connect successfully', async () => {
            await db.connect();
            assert.strictEqual(db.isConnected, true);
        });

        it('should initialize schema on connect', async () => {
            await db.connect();
            assert.ok(Array.isArray(db.data.activities));
            assert.ok(Array.isArray(db.data.ongoing_activities));
            assert.ok(Array.isArray(db.data.chat_settings));
        });

        it('should close connection properly', async () => {
            await db.connect();
            db.close();
            assert.strictEqual(db.isConnected, false);
        });
    });

    describe('Data Operations', () => {
        beforeEach(async () => {
            await db.connect();
        });

        it('should insert ongoing activity', () => {
            const params = [
                'user123',
                'chat456',
                'toilet',
                '2023-01-01T10:00:00Z',
                'Test User',
                'Test Chat'
            ];

            const result = db.exec('INSERT INTO ongoing_activities (user_id, chat_id, activity_type, start_time, user_full_name, chat_title) VALUES (?, ?, ?, ?, ?, ?)', params);
            
            assert.strictEqual(result.changes, 1);
            assert.strictEqual(db.data.ongoing_activities.length, 1);
            assert.strictEqual(db.data.ongoing_activities[0].user_id, 'user123');
        });

        it('should query ongoing activities', () => {
            // 先插入資料
            const params = [
                'user123',
                'chat456',
                'toilet',
                '2023-01-01T10:00:00Z',
                'Test User',
                'Test Chat'
            ];
            db.exec('INSERT INTO ongoing_activities (user_id, chat_id, activity_type, start_time, user_full_name, chat_title) VALUES (?, ?, ?, ?, ?, ?)', params);

            // 查詢資料
            const result = db.get('SELECT * FROM ongoing_activities WHERE user_id = ? AND chat_id = ?', ['user123', 'chat456']);
            
            assert.ok(result);
            assert.strictEqual(result.user_id, 'user123');
            assert.strictEqual(result.chat_id, 'chat456');
            assert.strictEqual(result.activity_type, 'toilet');
        });

        it('should delete ongoing activity', () => {
            // 先插入資料
            const params = [
                'user123',
                'chat456',
                'toilet',
                '2023-01-01T10:00:00Z',
                'Test User',
                'Test Chat'
            ];
            db.exec('INSERT INTO ongoing_activities (user_id, chat_id, activity_type, start_time, user_full_name, chat_title) VALUES (?, ?, ?, ?, ?, ?)', params);

            // 刪除資料
            const result = db.exec('DELETE FROM ongoing_activities WHERE user_id = ? AND chat_id = ?', ['user123', 'chat456']);
            
            assert.strictEqual(result.changes, 1);
            assert.strictEqual(db.data.ongoing_activities.length, 0);
        });

        it('should insert completed activity', () => {
            const params = [
                'user123',
                'chat456',
                'toilet',
                '2023-01-01T10:00:00Z',
                '2023-01-01T10:05:00Z',
                300, // 5 minutes
                0, // no overtime
                'Test User',
                'Test Chat',
                'completed'
            ];

            const result = db.exec('INSERT INTO activities (user_id, chat_id, activity_type, start_time, end_time, duration, overtime, user_full_name, chat_title, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', params);
            
            assert.strictEqual(result.changes, 1);
            assert.ok(result.lastInsertRowid);
            assert.strictEqual(db.data.activities.length, 1);
            assert.strictEqual(db.data.activities[0].user_id, 'user123');
            assert.strictEqual(db.data.activities[0].duration, 300);
        });
    });

    describe('Statistics', () => {
        beforeEach(async () => {
            await db.connect();
        });

        it('should return correct stats', () => {
            // 添加一些測試資料
            db.data.activities.push({
                id: 1,
                user_id: 'user123',
                chat_id: 'chat456',
                activity_type: 'toilet',
                duration: 300,
                status: 'completed'
            });

            db.data.ongoing_activities.push({
                user_id: 'user456',
                chat_id: 'chat789',
                activity_type: 'smoking',
                start_time: new Date().toISOString()
            });

            const stats = db.getStats();
            
            assert.strictEqual(stats.totalActivities, 1);
            assert.strictEqual(stats.ongoingActivities, 1);
            assert.strictEqual(stats.isConnected, true);
        });
    });

    describe('File Persistence', () => {
        it('should save data to file', async () => {
            await db.connect();
            
            // 添加資料
            db.data.activities.push({
                id: 1,
                user_id: 'user123',
                activity_type: 'toilet'
            });

            db.saveToFile();
            
            // 檢查檔案是否存在
            assert.ok(fs.existsSync(testDbPath));
            
            // 讀取檔案內容
            const fileContent = fs.readFileSync(testDbPath, 'utf8');
            const savedData = JSON.parse(fileContent);
            
            assert.strictEqual(savedData.activities.length, 1);
            assert.strictEqual(savedData.activities[0].user_id, 'user123');
        });

        it('should load data from file on connect', async () => {
            // 先創建測試資料檔案
            const testData = {
                activities: [
                    { id: 1, user_id: 'user123', activity_type: 'toilet' }
                ],
                ongoing_activities: [],
                chat_settings: []
            };

            fs.writeFileSync(testDbPath, JSON.stringify(testData));

            // 連接資料庫，應該載入現有資料
            await db.connect();
            
            assert.strictEqual(db.data.activities.length, 1);
            assert.strictEqual(db.data.activities[0].user_id, 'user123');
        });
    });
});