/**
 * 測試設定檔
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

// 確保測試目錄存在
const testDirs = [
    path.join(__dirname, 'fixtures'),
    path.join(__dirname, 'unit'),
    path.join(__dirname, 'integration'),
    path.join(__dirname, 'e2e')
];

for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 設定測試環境變數
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(__dirname, 'fixtures', 'test.db');

// 全局測試設定
global.testTimeout = 5000;

// 測試前清理
beforeEach(() => {
    // 清理測試資料庫檔案
    const testDbFiles = [
        path.join(__dirname, 'fixtures', 'test.db'),
        path.join(__dirname, 'fixtures', 'test.json'),
        path.join(__dirname, 'fixtures', 'test_activities.json'),
        path.join(__dirname, 'fixtures', 'integration_test.json')
    ];

    for (const file of testDbFiles) {
        if (fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
            } catch (error) {
                // 忽略清理錯誤
            }
        }
    }
});

// 測試後清理
afterEach(() => {
    // 清理測試資料
    const testDbFiles = [
        path.join(__dirname, 'fixtures', 'test.db'),
        path.join(__dirname, 'fixtures', 'test.json'),
        path.join(__dirname, 'fixtures', 'test_activities.json'),
        path.join(__dirname, 'fixtures', 'integration_test.json')
    ];

    for (const file of testDbFiles) {
        if (fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
            } catch (error) {
                // 忽略清理錯誤
            }
        }
    }
});

// 未捕獲的例外處理
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

console.log('🧪 測試環境設定完成');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_PATH:', process.env.DATABASE_PATH);