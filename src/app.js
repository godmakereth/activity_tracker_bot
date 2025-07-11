/**
 * 重構後的主應用程式入口
 * 使用新的架構和依賴注入，整合所有功能模組
 */

require('dotenv').config();
const moment = require('moment-timezone');

const { container } = require('./shared/DependencyContainer');
const AppConfig = require('./shared/config/AppConfig');

// 基礎設施層
// const DatabaseConnection = require('./infrastructure/database/DatabaseConnection');
const DatabaseConnection = require('./infrastructure/database/SimpleDatabaseConnection'); // 暫時使用簡化版
const ActivityRepository = require('./infrastructure/database/repositories/ActivityRepository');
const ChatRepository = require('./infrastructure/database/repositories/ChatRepository');
const UserRepository = require('./infrastructure/database/repositories/UserRepository');
const ReportGenerator = require('./infrastructure/file-system/ReportGenerator');
const ScheduledTaskManager = require('./infrastructure/scheduling/ScheduledTaskManager');
const DetailedWebServer = require('./infrastructure/web/DetailedWebServer');

// 應用層
const StartActivityUseCase = require('./application/use-cases/StartActivityUseCase');
const CompleteActivityUseCase = require('./application/use-cases/CompleteActivityUseCase');
const GenerateReportUseCase = require('./application/use-cases/GenerateReportUseCase');

// 共享層
const { ActivityTypes, ActivityTypeHelper } = require('./shared/constants/ActivityTypes');
const DomainException = require('./shared/exceptions/DomainException');
const ValidationException = require('./shared/exceptions/ValidationException');
const InfrastructureException = require('./shared/exceptions/InfrastructureException');

/**
 * 應用程式引導程序
 */
class App {
    constructor() {
        this.config = null;
        this.isRunning = false;
        this.bot = null;
        this.scheduledTaskManager = null;
        this.webServer = null;
    }

    /**
     * 初始化應用程式
     */
    async initialize() {
        try {
            console.log('🚀 正在初始化應用程式...');

            // 1. 載入配置
            this.config = new AppConfig();
            console.log('✅ 配置載入完成');

            // 2. 註冊依賴
            this.registerDependencies();
            console.log('✅ 依賴註冊完成');

            // 3. 啟動容器
            container.boot();
            console.log('✅ 依賴容器啟動完成');

            // 4. 初始化資料庫
            await this.initializeDatabase();
            console.log('✅ 資料庫初始化完成');

            // 5. 初始化定時任務
            await this.initializeScheduledTasks();
            console.log('✅ 定時任務初始化完成');

            // 6. 初始化 Telegram Bot
            await this.initializeTelegramBot();
            console.log('✅ Telegram Bot 初始化完成');

            // 7. 初始化 Web 服務器
            await this.initializeWebServer();
            console.log('✅ Web 服務器初始化完成');

            console.log('🎉 應用程式初始化完成！');
        } catch (error) {
            console.error('❌ 應用程式初始化失敗:', error.message);
            throw error;
        }
    }

    /**
     * 註冊所有依賴
     */
    registerDependencies() {
        // 註冊配置
        container.instance('config', this.config);

        // 註冊資料庫連接
        container.singleton('databaseConnection', () => {
            const dbPath = process.env.DATABASE_PATH || './data/activities.db';
            return new DatabaseConnection(dbPath);
        });

        // 註冊倉庫
        container.singleton('activityRepository', (db) => {
            return new ActivityRepository(db);
        }, ['databaseConnection']);

        container.singleton('chatRepository', (db) => {
            return new ChatRepository(db);
        }, ['databaseConnection']);

        container.singleton('userRepository', (db) => {
            return new UserRepository(db);
        }, ['databaseConnection']);

        // 註冊報告生成器
        container.singleton('reportGenerator', () => {
            return new ReportGenerator({
                baseDir: process.env.REPORT_BASE_DIR || './statistics',
                timezone: process.env.TIMEZONE || 'Asia/Taipei'
            });
        });

        // 註冊定時任務管理器
        container.singleton('scheduledTaskManager', () => {
            return new ScheduledTaskManager();
        });

        // 註冊用例
        container.singleton('startActivityUseCase', (activityRepo, userRepo, chatRepo) => {
            return new StartActivityUseCase(activityRepo, userRepo, chatRepo);
        }, ['activityRepository', 'userRepository', 'chatRepository']);

        container.singleton('completeActivityUseCase', (activityRepo) => {
            return new CompleteActivityUseCase(activityRepo);
        }, ['activityRepository']);

        container.singleton('generateReportUseCase', (activityRepo, chatRepo, reportGen) => {
            return new GenerateReportUseCase(activityRepo, chatRepo, reportGen);
        }, ['activityRepository', 'chatRepository', 'reportGenerator']);

        // 註冊 Telegram Bot
        container.singleton('telegramBot', (config) => {
            const TelegramBot = require('node-telegram-bot-api');
            const token = process.env.TELEGRAM_BOT_TOKEN;
            
            if (!token || token === 'your_bot_token_here') {
                throw new ValidationException('TELEGRAM_BOT_TOKEN 環境變數未設置或仍為預設值');
            }
            
            // 配置 Bot 選項以解決網路連接問題
            const botOptions = {
                polling: {
                    interval: 1000,
                    autoStart: true,
                    params: {
                        timeout: 10
                    }
                },
                request: {
                    family: 4, // 強制使用 IPv4
                    timeout: 30000,
                    connection: 'keep-alive',
                    headers: {
                        'User-Agent': 'activity-tracker-bot/1.0.0'
                    }
                }
            };
            
            return new TelegramBot(token, botOptions);
        }, ['config']);
    }

    /**
     * 初始化資料庫
     */
    async initializeDatabase() {
        const databaseConnection = container.get('databaseConnection');
        databaseConnection.connect();
    }

    /**
     * 初始化定時任務
     */
    async initializeScheduledTasks() {
        this.scheduledTaskManager = container.get('scheduledTaskManager');
        
        // 設置依賴關係
        const activityRepository = container.get('activityRepository');
        const chatRepository = container.get('chatRepository');
        const reportGenerator = container.get('reportGenerator');
        
        this.scheduledTaskManager.setDependencies(activityRepository, chatRepository, reportGenerator);
        this.scheduledTaskManager.initialize();
        
        // 設定自定義報告時間（如果有配置）
        const reportTime = process.env.REPORT_TIME || '23:00';
        this.scheduledTaskManager.setDailyReportTime(reportTime);
    }

    /**
     * 初始化 Telegram Bot
     */
    async initializeTelegramBot() {
        this.bot = container.get('telegramBot');
        
        // 設定錯誤處理
        this.bot.on('error', (error) => {
            console.error('❌ Telegram Bot 錯誤:', error.message);
        });

        this.bot.on('polling_error', (error) => {
            console.error('❌ Telegram Bot 輪詢錯誤:', error.message);
            
            // 處理網路連接錯誤並自動重試
            if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
                console.log('🔄 檢測到網路錯誤，5秒後重新啟動 polling...');
                setTimeout(() => {
                    try {
                        this.bot.startPolling();
                        console.log('✅ Polling 已重新啟動');
                    } catch (restartError) {
                        console.error('❌ 重新啟動 polling 失敗:', restartError.message);
                    }
                }, 5000);
            }
        });

        // 設定訊息處理
        this.setupMessageHandlers();
    }

    /**
     * 設定訊息處理器
     */
    setupMessageHandlers() {
        const chatRepository = container.get('chatRepository');
        const startActivityUseCase = container.get('startActivityUseCase');
        const completeActivityUseCase = container.get('completeActivityUseCase');
        const generateReportUseCase = container.get('generateReportUseCase');

        // 處理 /start 命令
        this.bot.onText(/\/start/, async (msg) => {
            await this.handleStartCommand(msg, chatRepository);
        });

        // 處理 /status 命令
        this.bot.onText(/\/status/, async (msg) => {
            await this.handleStatusCommand(msg);
        });

        // 處理 /report 命令
        this.bot.onText(/\/report/, async (msg) => {
            await this.handleReportCommand(msg, generateReportUseCase);
        });

        // 處理一般訊息
        this.bot.on('message', async (msg) => {
            console.log(`📨 收到訊息: "${msg.text}" 來自用戶: ${msg.from.first_name} (ID: ${msg.from.id})`);
            
            if (msg.text && !msg.text.startsWith('/')) {
                await this.handleTextMessage(msg, chatRepository, startActivityUseCase, completeActivityUseCase);
            } else if (msg.text && msg.text.startsWith('/')) {
                console.log(`ℹ️ 命令訊息已由專門處理器處理: ${msg.text}`);
            }
        });

        // 處理 inline 鍵盤回調
        this.bot.on('callback_query', async (callbackQuery) => {
            const action = callbackQuery.data;
            const msg = callbackQuery.message;
            const chatId = msg.chat.id.toString();
            const userId = callbackQuery.from.id.toString();
            
            console.log(`🔘 收到回調: "${action}" 來自用戶: ${callbackQuery.from.first_name}`);
            
            try {
                if (action.startsWith('activity_')) {
                    const activityType = action.replace('activity_', '');
                    const mockMsg = {
                        chat: { id: chatId, title: msg.chat.title },
                        from: callbackQuery.from
                    };
                    await this.handleStartActivity(mockMsg, startActivityUseCase, activityType);
                } else if (action === 'complete_activity') {
                    const mockMsg = {
                        chat: { id: chatId, title: msg.chat.title },
                        from: callbackQuery.from
                    };
                    await this.handleCompleteActivity(mockMsg, completeActivityUseCase);
                } else if (action === 'show_stats') {
                    const mockMsg = {
                        chat: { id: chatId, title: msg.chat.title },
                        from: callbackQuery.from
                    };
                    await this.handleStatsMenuReply(mockMsg);
                } else if (action.startsWith('stats_')) {
                    const statsType = action.replace('stats_', '');
                    const mockMsg = {
                        chat: { id: chatId, title: msg.chat.title },
                        from: callbackQuery.from
                    };
                    await this.handleStatsRequest(mockMsg, statsType);
                } else if (action === 'back_to_main') {
                    const mockMsg = {
                        chat: { id: chatId, title: msg.chat.title },
                        from: callbackQuery.from
                    };
                    const chatRepository = container.get('chatRepository');
                    await this.handleStartCommand(mockMsg, chatRepository);
                }
                
                // 回應回調查詢
                await this.bot.answerCallbackQuery(callbackQuery.id);
                
            } catch (error) {
                console.error('處理回調查詢失敗:', error);
                await this.bot.answerCallbackQuery(callbackQuery.id, { text: '操作失敗，請重試' });
            }
        });
    }

    /**
     * 處理 /start 命令
     */
    async handleStartCommand(msg, chatRepository) {
        try {
            const chatId = msg.chat.id.toString();
            const chatTitle = msg.chat.title || msg.from.first_name || 'Unknown';
            
            console.log(`📨 收到 /start 命令，聊天室ID: ${chatId}, 標題: ${chatTitle}`);
            
            // 更新聊天室資訊
            try {
                await chatRepository.updateChatInfo(chatId, chatTitle);
                console.log('✅ 聊天室資訊更新成功');
            } catch (repoError) {
                console.warn('⚠️ 聊天室資訊更新失敗:', repoError.message);
                // 不阻斷後續流程
            }
            
            const welcomeMessage = 
                "👋 歡迎使用活動追蹤機器人！\n" +
                "請選擇您要開始的活動，或查看統計數據。\n\n" +
                "ยินดีต้อนรับสู่บอทติดตามกิจกรรม!\n" +
                "กรุณาเลือกกิจกรรมที่ต้องการเริ่มต้น หรือดูสถิติ";
            
            // 主要使用 Inline 鍵盤（全平台相容）+ 可選 Reply 鍵盤
            console.log('🎹 創建智能鍵盤策略...');
            
            // 1. 主要 Inline 鍵盤（所有平台都能看到）
            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        { text: '🚽 上廁所 (6分鐘)', callback_data: 'activity_toilet' },
                        { text: '🚬 抽菸 (5分鐘)', callback_data: 'activity_smoking' }
                    ],
                    [
                        { text: '💩 大便 (10分鐘)', callback_data: 'activity_poop_10' },
                        { text: '💩 大便 (15分鐘)', callback_data: 'activity_poop_15' }
                    ],
                    [
                        { text: '📱 使用手機 (10分鐘)', callback_data: 'activity_phone' },
                        { text: '✅ 我回來了', callback_data: 'complete_activity' }
                    ],
                    [
                        { text: '📊 統計數據', callback_data: 'show_stats' }
                    ]
                ]
            };
            
            await this.bot.sendMessage(chatId, welcomeMessage, {
                reply_markup: inlineKeyboard
            });
            console.log('✅ 主要 Inline 鍵盤發送成功');
            
            // 2. 可選 Reply 鍵盤（手機版額外便利）
            const replyMarkup = {
                keyboard: [
                    [
                        '🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)',
                        '🚬 抽菸 (5分鐘)/สูบบุหรี่'
                    ],
                    [
                        '💩 大便 (10分鐘)/อึ10นาที',
                        '💩 大便 (15分鐘)/อึ15นาที'
                    ],
                    [
                        '📱 使用手機 (10分鐘)/ใช้มือถือ',
                        '✅ 我回來了/ฉันกลับมาแล้ว'
                    ],
                    [
                        '📊 統計數據/สถิติ'
                    ]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            };
            
            await this.bot.sendMessage(chatId, 
                "📱 手機版額外便利：也可以使用下方的 reply 鍵盤\n" +
                "💻 電腦版/網頁版：請使用上方訊息的按鍵\n\n" +
                "ใช้ปุ่มด้านบนสำหรับคอมพิวเตอร์ / ใช้ปุ่มด้านล่างสำหรับมือถือ", 
                {
                    reply_markup: replyMarkup
                }
            );
            console.log('✅ 補充 Reply 鍵盤發送成功');
            
        } catch (error) {
            console.error('❌ 處理 /start 命令失敗:', error.message);
            console.error('錯誤詳情:', error.stack);
            
            try {
                await this.bot.sendMessage(msg.chat.id, '❌ 處理命令時發生錯誤，請稍後再試');
            } catch (sendError) {
                console.error('❌ 發送錯誤訊息也失敗:', sendError.message);
            }
        }
    }

    /**
     * 處理 /status 命令
     */
    async handleStatusCommand(msg) {
        try {
            const status = container.getStatus();
            const dbStats = container.get('databaseConnection').getStats();
            const taskStatus = this.scheduledTaskManager.getStatus();
            
            const statusMessage = 
                `📊 系統狀態：\n` +
                `- 服務數量：${status.totalServices}\n` +
                `- 創建實例：${status.createdInstances}\n` +
                `- 容器狀態：${status.isBooted ? '已啟動' : '未啟動'}\n` +
                `- 資料庫連接：${dbStats.isConnected ? '已連接' : '未連接'}\n` +
                `- 總活動數：${dbStats.totalActivities}\n` +
                `- 正在進行：${dbStats.ongoingActivities}\n` +
                `- 定時任務：${taskStatus.taskCount} 個`;
            
            await this.bot.sendMessage(msg.chat.id, statusMessage);
        } catch (error) {
            console.error('處理 /status 命令失敗:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ 獲取狀態時發生錯誤');
        }
    }

    /**
     * 處理 /report 命令
     */
    async handleReportCommand(msg, generateReportUseCase) {
        try {
            const chatId = msg.chat.id.toString();
            const today = moment().tz('Asia/Taipei').toDate();
            
            await this.bot.sendMessage(chatId, '📊 正在生成今日報告...');
            
            const result = await generateReportUseCase.generateTodayReport(chatId);
            
            if (result && result.summary) {
                const summary = result.summary;
                const reportMessage = 
                    `📊 今日活動統計：\n` +
                    `- 總活動次數：${summary.totalActivities}\n` +
                    `- 總活動時間：${Math.floor(summary.totalDuration / 60)} 分鐘\n` +
                    `- 總超時時間：${Math.floor(summary.totalOvertime / 60)} 分鐘\n` +
                    `- 參與人數：${summary.uniqueUsers}\n` +
                    `- 活動類型：${summary.uniqueActivityTypes}`;
                
                await this.bot.sendMessage(chatId, reportMessage);
            } else {
                await this.bot.sendMessage(chatId, '📊 今日暫無活動記錄');
            }
        } catch (error) {
            console.error('處理 /report 命令失敗:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ 生成報告時發生錯誤');
        }
    }

    /**
     * 處理文字訊息
     */
    async handleTextMessage(msg, chatRepository, startActivityUseCase, completeActivityUseCase) {
        try {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const userFullName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
            const chatTitle = msg.chat.title || userFullName;
            const text = msg.text;
            
            // 更新聊天室資訊
            await chatRepository.updateChatInfo(chatId, chatTitle);
            
            // 處理返回主選單
            if (text.includes('返回主選單') || text.includes('กลับเมนูหลัก')) {
                await this.handleStartCommand(msg, chatRepository);
                return;
            }
            
            // 處理統計數據
            if (text.includes('統計數據') || text.includes('สถิติ')) {
                await this.handleStatsMenuReply(msg);
                return;
            }

            // 處理統計選項
            if (text.includes('本日資料') || text.includes('วันนี้')) {
                await this.handleStatsRequest(msg, 'today');
                return;
            }
            if (text.includes('昨日資料') || text.includes('เมื่อวาน')) {
                await this.handleStatsRequest(msg, 'yesterday');
                return;
            }
            if (text.includes('本週資料') || text.includes('สัปดาห์นี้')) {
                await this.handleStatsRequest(msg, 'thisweek');
                return;
            }
            if (text.includes('上週資料') || text.includes('สัปดาห์ที่แล้ว')) {
                await this.handleStatsRequest(msg, 'lastweek');
                return;
            }
            if (text.includes('本月資料') || text.includes('เดือนนี้')) {
                await this.handleStatsRequest(msg, 'thismonth');
                return;
            }
            if (text.includes('上月資料') || text.includes('เดือนที่แล้ว')) {
                await this.handleStatsRequest(msg, 'lastmonth');
                return;
            }
            
            // 處理完成活動
            if (text.includes('我回來了') || text.includes('ฉันกลับมาแล้ว')) {
                await this.handleCompleteActivity(msg, completeActivityUseCase);
                return;
            }
            
            // 處理開始活動 - 匹配雙語按鍵文字
            let activityType = null;
            if (text.includes('上廁所') || text.includes('เข้าห้องน้ำ')) {
                activityType = 'toilet';
            } else if (text.includes('抽菸') || text.includes('สูบบุหรี่')) {
                activityType = 'smoking';
            } else if (text.includes('使用手機') || text.includes('ใช้มือถือ')) {
                activityType = 'phone';
            } else if ((text.includes('大便') && text.includes('10')) || text.includes('อึ10นาที')) {
                activityType = 'poop_10';
            } else if ((text.includes('大便') && text.includes('15')) || text.includes('อึ15นาที')) {
                activityType = 'poop_15';
            }
            
            if (activityType) {
                await this.handleStartActivity(msg, startActivityUseCase, activityType);
                return;
            }
            
            // 未識別的訊息
            await this.bot.sendMessage(chatId, '❓ 請使用選單按鈕或輸入指令');
            
        } catch (error) {
            console.error('處理文字訊息失敗:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ 處理訊息時發生錯誤');
        }
    }

    /**
     * 處理開始活動
     */
    async handleStartActivity(msg, startActivityUseCase, activityType) {
        try {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            const userFullName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
            const chatTitle = msg.chat.title || userFullName;
            
            const result = await startActivityUseCase.execute({
                userId,
                chatId,
                activityType,
                userFullName,
                chatTitle
            });
            
            if (result.success) {
                const config = ActivityTypeHelper.getConfig(activityType);
                const activityName = config ? config.name : activityType;
                const emoji = config ? config.emoji : '⏰';
                const message = `${emoji} 已開始記錄「${userFullName}」${activityName}時間\n` +
                               `${emoji} เริ่มบันทึกเวลา「${userFullName}」${activityName}`;
                
                await this.bot.sendMessage(chatId, message);
            } else {
                await this.bot.sendMessage(chatId, `⚠️ ${result.message}`);
            }
        } catch (error) {
            console.error('處理開始活動失敗:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ 開始活動時發生錯誤');
        }
    }

    /**
     * 處理完成活動
     */
    async handleCompleteActivity(msg, completeActivityUseCase) {
        try {
            const chatId = msg.chat.id.toString();
            const userId = msg.from.id.toString();
            
            const result = await completeActivityUseCase.execute({
                userId,
                chatId
            });
            
            if (result.success) {
                const activity = result.activity;
                const duration = activity.duration;
                const overtime = activity.overtime;
                const activityName = ActivityTypeHelper.getName(activity.activityType);
                const userName = activity.userFullName;
                
                let message = `✅ 已記錄「${userName}」${activityName} 時間\n` +
                             `⏱ 總時間: ${Math.floor(duration / 60)} 分 ${duration % 60} 秒`;
                
                if (overtime > 0) {
                    message += `\n⚠️ 超時: ${Math.floor(overtime / 60)} 分 ${overtime % 60} 秒`;
                }
                
                await this.bot.sendMessage(chatId, message);
            } else {
                await this.bot.sendMessage(chatId, `❌ ${result.message}`);
            }
        } catch (error) {
            console.error('處理完成活動失敗:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ 完成活動時發生錯誤');
        }
    }

    /**
     * 處理統計選單 (Inline版本 - 用於電腦版)
     */
    async handleStatsMenu(msg) {
        try {
            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        { text: '📅 本日資料', callback_data: 'stats_today' },
                        { text: '📅 昨日資料', callback_data: 'stats_yesterday' }
                    ],
                    [
                        { text: '📅 本週資料', callback_data: 'stats_thisweek' },
                        { text: '📅 上週資料', callback_data: 'stats_lastweek' }
                    ],
                    [
                        { text: '📅 本月資料', callback_data: 'stats_thismonth' },
                        { text: '📅 上月資料', callback_data: 'stats_lastmonth' }
                    ],
                    [
                        { text: '🔙 返回主選單', callback_data: 'back_to_main' }
                    ]
                ]
            };
            
            await this.bot.sendMessage(msg.chat.id, 
                '📊 請選擇要查看的統計時間範圍\n' +
                'เลือกช่วงเวลาที่ต้องการดูสถิติ', 
                { reply_markup: inlineKeyboard }
            );
        } catch (error) {
            console.error('處理統計選單失敗:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ 顯示統計選單時發生錯誤');
        }
    }

    /**
     * 處理統計選單 (智能版本 - 主 Inline + 補充 Reply)
     */
    async handleStatsMenuReply(msg) {
        try {
            // 1. 主要 Inline 鍵盤（所有平台都能看到）
            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        { text: '📅 本日資料', callback_data: 'stats_today' },
                        { text: '📅 昨日資料', callback_data: 'stats_yesterday' }
                    ],
                    [
                        { text: '📅 本週資料', callback_data: 'stats_thisweek' },
                        { text: '📅 上週資料', callback_data: 'stats_lastweek' }
                    ],
                    [
                        { text: '📅 本月資料', callback_data: 'stats_thismonth' },
                        { text: '📅 上月資料', callback_data: 'stats_lastmonth' }
                    ],
                    [
                        { text: '🔙 返回主選單', callback_data: 'back_to_main' }
                    ]
                ]
            };
            
            await this.bot.sendMessage(msg.chat.id, 
                '📊 請選擇要查看的統計時間範圍\n' +
                'เลือกช่วงเวลาที่ต้องการดูสถิติ', 
                { reply_markup: inlineKeyboard }
            );
            
            // 2. 補充 Reply 鍵盤（手機版額外便利）
            const replyMarkup = {
                keyboard: [
                    [
                        '📅 本日資料/ข้อมูลวันนี้',
                        '📅 昨日資料/ข้อมูลเมื่อวาน'
                    ],
                    [
                        '📅 本週資料/ข้อมูลสัปดาห์นี้',
                        '📅 上週資料/ข้อมูลสัปดาห์ที่แล้ว'
                    ],
                    [
                        '📅 本月資料/ข้อมูลเดือนนี้',
                        '📅 上月資料/ข้อมูลเดือนที่แล้ว'
                    ],
                    [
                        '🔙 返回主選單/กลับเมนูหลัก'
                    ]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            };
            
            await this.bot.sendMessage(msg.chat.id, 
                '📱 手機版也可以使用下方的 reply 鍵盤選擇統計範圍', 
                { reply_markup: replyMarkup }
            );
            
        } catch (error) {
            console.error('處理統計選單失敗:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ 顯示統計選單時發生錯誤');
        }
    }

    /**
     * 處理統計請求
     */
    async handleStatsRequest(msg, statsType) {
        try {
            const generateReportUseCase = container.get('generateReportUseCase');
            const chatId = msg.chat.id.toString();
            
            let reportData;
            let title;
            
            switch (statsType) {
                case 'today':
                    title = '📊 今日活動統計';
                    reportData = await this.generateTodayStats(chatId);
                    break;
                case 'yesterday':
                    title = '📊 昨日活動統計';
                    reportData = await this.generateYesterdayStats(chatId);
                    break;
                case 'thisweek':
                    title = '📊 本週活動統計';
                    await this.bot.sendMessage(chatId, '⚠️ 本週統計功能開發中');
                    return;
                case 'lastweek':
                    title = '📊 上週活動統計';
                    await this.bot.sendMessage(chatId, '⚠️ 上週統計功能開發中');
                    return;
                case 'thismonth':
                    title = '📊 本月活動統計';
                    await this.bot.sendMessage(chatId, '⚠️ 本月統計功能開發中');
                    return;
                case 'lastmonth':
                    title = '📊 上月活動統計';
                    await this.bot.sendMessage(chatId, '⚠️ 上月統計功能開發中');
                    return;
                default:
                    await this.bot.sendMessage(chatId, '❌ 未知的統計類型');
                    return;
            }
            
            if (reportData && reportData.summary) {
                const summary = reportData.summary;
                const userStats = reportData.userStats;
                const activityStats = reportData.activityStats;
                
                let reportMessage = 
                    `${title}\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `📊 總活動次數：${summary.totalActivities}\n` +
                    `⏱ 總活動時間：${Math.floor(summary.totalDuration / 60)} 分鐘 ${summary.totalDuration % 60} 秒\n` +
                    `⚠️ 總超時時間：${Math.floor(summary.totalOvertime / 60)} 分鐘 ${summary.totalOvertime % 60} 秒\n` +
                    `👥 參與人數：${summary.uniqueUsers}\n` +
                    `🔢 活動類型：${summary.uniqueActivityTypes}\n\n`;

                // 個別用戶詳細統計
                if (userStats && Object.keys(userStats).length > 0) {
                    reportMessage += `👤 員工活動明細：\n`;
                    Object.entries(userStats).forEach(([userName, stats]) => {
                        reportMessage += `\n▶️ ${userName}\n`;
                        reportMessage += `   總計：${stats.totalActivities}次活動，${Math.floor(stats.totalDuration / 60)}分${stats.totalDuration % 60}秒`;
                        if (stats.totalOvertime > 0) {
                            reportMessage += `，超時${stats.overtimeCount}次(${Math.floor(stats.totalOvertime / 60)}分${stats.totalOvertime % 60}秒)`;
                        }
                        
                        reportMessage += `\n`;
                        
                        // 顯示該用戶的各項活動詳情
                        if (stats.activities) {
                            Object.entries(stats.activities).forEach(([activityType, activityStats]) => {
                                const activityName = this.getActivityName(activityType);
                                const emoji = this.getActivityEmoji(activityType);
                                const warningIcon = activityStats.overtimeCount > 0 ? '⚠️' : '✅';
                                reportMessage += `   ${warningIcon} ${emoji} ${activityName}：${activityStats.count}次，${Math.floor(activityStats.duration / 60)}分${activityStats.duration % 60}秒`;
                                if (activityStats.overtime > 0) {
                                    reportMessage += `\n       🚨 超時${activityStats.overtimeCount}次，共${Math.floor(activityStats.overtime / 60)}分${activityStats.overtime % 60}秒`;
                                }
                                reportMessage += `\n`;
                            });
                        }
                    });
                    reportMessage += `\n`;
                }

                // 活動類型統計
                if (activityStats && Object.keys(activityStats).length > 0) {
                    reportMessage += `📋 活動類型統計：\n`;
                    Object.entries(activityStats).forEach(([activityType, stats]) => {
                        const activityName = this.getActivityName(activityType);
                        const emoji = this.getActivityEmoji(activityType);
                        reportMessage += `┣ ${emoji} ${activityName}：${stats.totalCount}次，${Math.floor(stats.totalDuration / 60)}分${stats.totalDuration % 60}秒`;
                        if (stats.totalOvertime > 0) {
                            reportMessage += `，超時${stats.overtimeCount}次(${Math.floor(stats.totalOvertime / 60)}分${stats.totalOvertime % 60}秒)`;
                        }
                        reportMessage += `\n`;
                    });
                }
                
                await this.bot.sendMessage(chatId, reportMessage);
            } else {
                await this.bot.sendMessage(chatId, `${title}\n\n📊 暫無活動記錄`);
            }
            
        } catch (error) {
            console.error('處理統計請求失敗:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ 獲取統計數據時發生錯誤');
        }
    }

    /**
     * 生成今日統計
     */
    async generateTodayStats(chatId) {
        try {
            const moment = require('moment-timezone');
            const activityRepository = container.get('activityRepository');
            
            const today = moment().tz('Asia/Taipei').format('YYYY-MM-DD');
            console.log('🔍 今日統計 - 日期:', today, '聊天室:', chatId);
            const activities = await this.getActivitiesByDate(chatId, today);
            console.log('🔍 今日統計 - 找到活動數量:', activities.length);
            console.log('🔍 今日統計 - 活動詳情:', activities.map(a => ({
                user: a.user_full_name,
                type: a.activity_type,
                duration: a.duration,
                overtime: a.overtime,
                status: a.status
            })));
            
            const stats = this.calculateStats(activities);
            console.log('🔍 今日統計 - 計算結果:', JSON.stringify(stats, null, 2));
            return stats;
        } catch (error) {
            console.error('生成今日統計失敗:', error);
            return null;
        }
    }

    /**
     * 生成昨日統計
     */
    async generateYesterdayStats(chatId) {
        try {
            const moment = require('moment-timezone');
            const activityRepository = container.get('activityRepository');
            
            const yesterday = moment().tz('Asia/Taipei').subtract(1, 'day').format('YYYY-MM-DD');
            const activities = await this.getActivitiesByDate(chatId, yesterday);
            
            return this.calculateStats(activities);
        } catch (error) {
            console.error('生成昨日統計失敗:', error);
            return null;
        }
    }

    /**
     * 根據日期獲取活動
     */
    async getActivitiesByDate(chatId, date) {
        try {
            const db = container.get('databaseConnection');
            
            // 從 JSON 檔案中讀取活動
            const activities = db.data.activities || [];
            
            return activities.filter(activity => {
                return activity.chat_id === chatId && 
                       activity.start_time.startsWith(date) &&
                       (activity.status === 'completed' || activity.status === 'overtime');
            });
        } catch (error) {
            console.error('獲取活動資料失敗:', error);
            return [];
        }
    }

    /**
     * 計算統計資料
     */
    calculateStats(activities) {
        const stats = {
            totalActivities: activities.length,
            totalDuration: 0,
            totalOvertime: 0,
            uniqueUsers: new Set(),
            uniqueActivityTypes: new Set(),
            userStats: {},
            activityStats: {}
        };

        activities.forEach(activity => {
            const duration = activity.duration || 0;
            const overtime = activity.overtime || 0;
            const userName = activity.user_full_name;
            const activityType = activity.activity_type;

            stats.totalDuration += duration;
            stats.totalOvertime += overtime;
            stats.uniqueUsers.add(userName);
            stats.uniqueActivityTypes.add(activityType);
            
            // 用戶統計
            if (!stats.userStats[userName]) {
                stats.userStats[userName] = {
                    totalActivities: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    overtimeCount: 0,
                    activities: {}
                };
            }
            stats.userStats[userName].totalActivities++;
            stats.userStats[userName].totalDuration += duration;
            stats.userStats[userName].totalOvertime += overtime;
            if (overtime > 0) {
                stats.userStats[userName].overtimeCount++;
            }
            
            // 用戶的各項活動統計
            if (!stats.userStats[userName].activities[activityType]) {
                stats.userStats[userName].activities[activityType] = {
                    count: 0,
                    duration: 0,
                    overtime: 0,
                    overtimeCount: 0
                };
            }
            stats.userStats[userName].activities[activityType].count++;
            stats.userStats[userName].activities[activityType].duration += duration;
            stats.userStats[userName].activities[activityType].overtime += overtime;
            if (overtime > 0) {
                stats.userStats[userName].activities[activityType].overtimeCount++;
            }
            
            // 活動類型統計
            if (!stats.activityStats[activityType]) {
                stats.activityStats[activityType] = {
                    totalCount: 0,
                    totalDuration: 0,
                    totalOvertime: 0,
                    overtimeCount: 0
                };
            }
            stats.activityStats[activityType].totalCount++;
            stats.activityStats[activityType].totalDuration += duration;
            stats.activityStats[activityType].totalOvertime += overtime;
            if (overtime > 0) {
                stats.activityStats[activityType].overtimeCount++;
            }
        });

        return {
            summary: {
                totalActivities: stats.totalActivities,
                totalDuration: stats.totalDuration,
                totalOvertime: stats.totalOvertime,
                uniqueUsers: stats.uniqueUsers.size,
                uniqueActivityTypes: stats.uniqueActivityTypes.size
            },
            userStats: stats.userStats,
            activityStats: stats.activityStats
        };
    }

    /**
     * 取得活動名稱
     */
    getActivityName(activityType) {
        const { ActivityTypeHelper } = require('./shared/constants/ActivityTypes');
        const config = ActivityTypeHelper.getConfig(activityType);
        return config ? config.name : activityType;
    }

    /**
     * 取得活動表情符號
     */
    getActivityEmoji(activityType) {
        const { ActivityTypeHelper } = require('./shared/constants/ActivityTypes');
        const config = ActivityTypeHelper.getConfig(activityType);
        return config ? config.emoji : '❓';
    }

    /**
     * 初始化 Web 服務器
     */
    async initializeWebServer() {
        try {
            // 創建詳細 Web 服務器實例
            this.webServer = new DetailedWebServer(3000);
            
            // 設置依賴注入
            const activityRepository = container.get('activityRepository');
            const chatRepository = container.get('chatRepository');
            const reportGenerator = container.get('reportGenerator');
            
            this.webServer.setDependencies(activityRepository, chatRepository, reportGenerator);
            
            // 啟動服務器
            await this.webServer.start();
            
        } catch (error) {
            console.error('❌ Web 服務器初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 啟動應用程式
     */
    async start() {
        try {
            if (this.isRunning) {
                console.log('⚠️ 應用程式已在運行中');
                return;
            }

            await this.initialize();
            this.isRunning = true;
            console.log('🤖 Telegram Bot 已啟動並等待訊息...');
            console.log('🌐 Web 統計頁面: http://localhost:3000');

        } catch (error) {
            console.error('❌ 啟動應用程式失敗:', error.message);
            throw error;
        }
    }

    /**
     * 停止應用程式
     */
    async stop() {
        try {
            if (!this.isRunning) {
                return;
            }

            console.log('🛑 正在停止應用程式...');

            // 停止定時任務
            if (this.scheduledTaskManager) {
                this.scheduledTaskManager.shutdown();
            }

            // 停止 Telegram Bot
            if (this.bot) {
                await this.bot.stopPolling();
            }

            // 停止 Web 服務器
            if (this.webServer) {
                await this.webServer.stop();
            }

            // 關閉資料庫連接
            const databaseConnection = container.get('databaseConnection');
            if (databaseConnection) {
                databaseConnection.close();
            }

            this.isRunning = false;
            console.log('✅ 應用程式已停止');

        } catch (error) {
            console.error('❌ 停止應用程式時發生錯誤:', error.message);
        }
    }

    /**
     * 獲取應用程式狀態
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            config: this.config?.getConfig(),
            container: container.getStatus(),
            scheduledTasks: this.scheduledTaskManager?.getStatus()
        };
    }
}

// 全局錯誤處理
process.on('unhandledRejection', (reason, promise) => {
    console.error('未處理的 Promise 拒絕:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('未捕獲的異常:', error);
    process.exit(1);
});

// 優雅退出處理
process.on('SIGINT', async () => {
    console.log('\n收到 SIGINT 信號，正在優雅退出...');
    if (global.app) {
        await global.app.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('收到 SIGTERM 信號，正在優雅退出...');
    if (global.app) {
        await global.app.stop();
    }
    process.exit(0);
});

// 如果直接運行此文件，啟動應用程式
if (require.main === module) {
    const app = new App();
    global.app = app; // 保存全局引用以便優雅退出
    
    app.start().catch(error => {
        console.error('應用程式啟動失敗:', error);
        process.exit(1);
    });
}

module.exports = App;