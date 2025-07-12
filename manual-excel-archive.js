/**
 * 手動觸發 Excel 存檔
 */
const path = require('path');
require('dotenv').config();

// 使用與 app.js 相同的方式載入依賴
const { container } = require('./src/shared/DependencyContainer');
const SimpleDatabaseConnection = require('./src/infrastructure/database/SimpleDatabaseConnection');
const ActivityRepository = require('./src/infrastructure/database/repositories/ActivityRepository');
const ChatRepository = require('./src/infrastructure/database/repositories/ChatRepository');
const AutoExcelArchiver = require('./src/infrastructure/file-system/AutoExcelArchiver');

async function manualArchive() {
    try {
        console.log('🚀 手動觸發 Excel 存檔...');
        
        // 初始化資料庫連接
        const db = new SimpleDatabaseConnection('./data/activities.db');
        await db.connect();
        
        // 初始化 Repository
        const activityRepository = new ActivityRepository(db);
        const chatRepository = new ChatRepository(db);
        
        // 初始化 AutoExcelArchiver
        const autoExcelArchiver = new AutoExcelArchiver(activityRepository, chatRepository);
        
        // 執行每日存檔
        await autoExcelArchiver.executeDaily();
        
        console.log('✅ 手動 Excel 存檔完成');
        
    } catch (error) {
        console.error('❌ 手動存檔失敗:', error);
    } finally {
        process.exit(0);
    }
}

manualArchive();