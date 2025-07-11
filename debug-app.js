/**
 * Debug version of app.js to trace the token validation issue
 */

console.log('🔍 Debug App Starting...');
console.log('1. Before dotenv - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);

require('dotenv').config();
console.log('2. After dotenv - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);

const moment = require('moment-timezone');

const { container } = require('./src/shared/DependencyContainer');
console.log('3. After container import - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);

const AppConfig = require('./src/shared/config/AppConfig');
console.log('4. After AppConfig import - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);

// 基礎設施層
const DatabaseConnection = require('./src/infrastructure/database/SimpleDatabaseConnection');
const ActivityRepository = require('./src/infrastructure/database/repositories/ActivityRepository');
const ChatRepository = require('./src/infrastructure/database/repositories/ChatRepository');
const UserRepository = require('./src/infrastructure/database/repositories/UserRepository');
const ReportGenerator = require('./src/infrastructure/file-system/ReportGenerator');
const ScheduledTaskManager = require('./src/infrastructure/scheduling/ScheduledTaskManager');
const DetailedWebServer = require('./src/infrastructure/web/DetailedWebServer');

// 應用層
const StartActivityUseCase = require('./src/application/use-cases/StartActivityUseCase');
const CompleteActivityUseCase = require('./src/application/use-cases/CompleteActivityUseCase');
const GenerateReportUseCase = require('./src/application/use-cases/GenerateReportUseCase');

// 共享層
const { ActivityTypes, ActivityTypeHelper } = require('./src/shared/constants/ActivityTypes');
const DomainException = require('./src/shared/exceptions/DomainException');
const ValidationException = require('./src/shared/exceptions/ValidationException');
const InfrastructureException = require('./src/shared/exceptions/InfrastructureException');

console.log('5. After all imports - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);

class DebugApp {
    constructor() {
        this.config = null;
        this.isRunning = false;
        this.bot = null;
        this.scheduledTaskManager = null;
        this.webServer = null;
    }

    async initialize() {
        try {
            console.log('🚀 正在初始化應用程式...');
            console.log('6. Start initialize - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);

            // 1. 載入配置
            this.config = new AppConfig();
            console.log('✅ 配置載入完成');
            console.log('7. After AppConfig - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);

            // 2. 註冊依賴
            this.registerDependencies();
            console.log('✅ 依賴註冊完成');
            console.log('8. After registerDependencies - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);

            // 3. 啟動容器
            console.log('9. Before container.boot - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
            container.boot();
            console.log('✅ 依賴容器啟動完成');

        } catch (error) {
            console.error('❌ 應用程式初始化失敗:', error.message);
            throw error;
        }
    }

    registerDependencies() {
        // 註冊配置
        container.instance('config', this.config);

        // 註冊資料庫連接
        container.singleton('databaseConnection', () => {
            const dbPath = process.env.DATABASE_PATH || './data/activities.db';
            return new DatabaseConnection(dbPath);
        });

        // 註冊 Telegram Bot
        container.singleton('telegramBot', (config) => {
            const TelegramBot = require('node-telegram-bot-api');
            const token = process.env.TELEGRAM_BOT_TOKEN;
            
            console.log('🔍 In telegramBot factory:');
            console.log('  Token value:', token);
            console.log('  Token type:', typeof token);
            console.log('  Is undefined?', token === undefined);
            console.log('  Is null?', token === null);
            console.log('  Is empty?', token === '');
            console.log('  Is default?', token === 'your_bot_token_here');
            console.log('  Validation condition:', !token || token === 'your_bot_token_here');
            
            if (!token || token === 'your_bot_token_here') {
                throw new ValidationException('TELEGRAM_BOT_TOKEN 環境變數未設置或仍為預設值');
            }
            
            return new TelegramBot(token, { polling: false });
        });
    }

    async start() {
        try {
            await this.initialize();
            console.log('🎉 應用程式初始化成功！');
        } catch (error) {
            console.error('❌ 啟動應用程式失敗:', error.message);
            console.error('應用程式啟動失敗:', error);
        }
    }
}

// 啟動應用程式
const app = new DebugApp();
app.start();