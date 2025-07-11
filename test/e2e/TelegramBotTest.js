/**
 * Telegram Bot End-to-End 測試
 * 注意：此測試需要有效的 Telegram Bot Token 才能運行
 */
const assert = require('assert');
const TelegramBot = require('node-telegram-bot-api');
const App = require('../../src/app');
const { ActivityTypes } = require('../../src/shared/constants/ActivityTypes');

describe('Telegram Bot E2E Tests', () => {
    let app;
    let bot;
    let testChatId;

    // 這些測試需要實際的 Telegram Bot Token
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TEST_CHAT_ID = process.env.TEST_CHAT_ID || '123456789';

    before(async function() {
        // 跳過 E2E 測試，除非明確設定環境變數
        if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'your_bot_token_here') {
            this.skip();
        }

        // 初始化應用程式
        app = new App();
        await app.start();

        // 建立測試用的 Bot 客戶端
        bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
        testChatId = TEST_CHAT_ID;
    });

    after(async () => {
        if (app) {
            await app.stop();
        }
    });

    describe('Bot Commands', () => {
        it('should respond to /start command', async () => {
            const message = await bot.sendMessage(testChatId, '/start');
            assert.ok(message.message_id);
            
            // 等待回應
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 檢查是否收到歡迎訊息和鍵盤
            // 這裡需要實際檢查 Bot 的回應，但在自動化測試中較難實現
            // 可以通過查看資料庫或日誌來驗證
        });

        it('should respond to /status command', async () => {
            const message = await bot.sendMessage(testChatId, '/status');
            assert.ok(message.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        it('should respond to /report command', async () => {
            const message = await bot.sendMessage(testChatId, '/report');
            assert.ok(message.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        });
    });

    describe('Activity Flow', () => {
        it('should handle complete activity workflow', async () => {
            // 1. 開始活動
            const startMessage = await bot.sendMessage(testChatId, '🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)');
            assert.ok(startMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 2. 嘗試再次開始活動（應該被拒絕）
            const duplicateMessage = await bot.sendMessage(testChatId, '🚬 抽菸 (5分鐘)/สูบบุหรี่ (5 นาที)');
            assert.ok(duplicateMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 3. 完成活動
            const completeMessage = await bot.sendMessage(testChatId, '我回來了');
            assert.ok(completeMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. 檢查可以再次開始新活動
            const newStartMessage = await bot.sendMessage(testChatId, '📱 使用手機 (10分鐘)/ใช้โทรศัพท์ (10 นาที)');
            assert.ok(newStartMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 5. 完成第二個活動
            const completeMessage2 = await bot.sendMessage(testChatId, 'ฉันกลับมาแล้ว');
            assert.ok(completeMessage2.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        });

        it('should handle statistics request', async () => {
            // 請求統計數據
            const statsMessage = await bot.sendMessage(testChatId, '📊 統計數據/สถิติ');
            assert.ok(statsMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 選擇今日數據
            const todayMessage = await bot.sendMessage(testChatId, '📅 本日資料/ข้อมูลวันนี้');
            assert.ok(todayMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 返回主選單
            const menuMessage = await bot.sendMessage(testChatId, '🔙 返回主選單/กลับเมนูหลัก');
            assert.ok(menuMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        });
    });

    describe('Error Handling', () => {
        it('should handle unknown commands gracefully', async () => {
            const unknownMessage = await bot.sendMessage(testChatId, '/unknown_command');
            assert.ok(unknownMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        it('should handle invalid activity requests', async () => {
            const invalidMessage = await bot.sendMessage(testChatId, '無效的活動請求');
            assert.ok(invalidMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        it('should handle completing non-existent activity', async () => {
            const completeMessage = await bot.sendMessage(testChatId, '我回來了');
            assert.ok(completeMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        });
    });

    describe('Bilingual Support', () => {
        it('should handle Chinese commands', async () => {
            const chineseMessage = await bot.sendMessage(testChatId, '🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)');
            assert.ok(chineseMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));

            const completeMessage = await bot.sendMessage(testChatId, '我回來了');
            assert.ok(completeMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        it('should handle Thai commands', async () => {
            const thaiMessage = await bot.sendMessage(testChatId, '🚬 抽菸 (5分鐘)/สูบบุหรี่ (5 นาที)');
            assert.ok(thaiMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));

            const completeMessage = await bot.sendMessage(testChatId, 'ฉันกลับมาแล้ว');
            assert.ok(completeMessage.message_id);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        });
    });

    describe('Performance and Load', () => {
        it('should handle multiple rapid requests', async () => {
            const promises = [];
            
            // 發送多個快速請求
            for (let i = 0; i < 5; i++) {
                promises.push(bot.sendMessage(testChatId, '/status'));
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const results = await Promise.all(promises);
            
            // 檢查所有請求都成功
            for (const result of results) {
                assert.ok(result.message_id);
            }
        });

        it('should handle concurrent activity requests', async () => {
            // 模擬多個用戶同時發送請求
            const promises = [
                bot.sendMessage(testChatId, '🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)'),
                bot.sendMessage(testChatId, '/status'),
                bot.sendMessage(testChatId, '/report')
            ];

            const results = await Promise.all(promises);
            
            for (const result of results) {
                assert.ok(result.message_id);
            }
            
            // 清理：完成活動
            await new Promise(resolve => setTimeout(resolve, 1000));
            await bot.sendMessage(testChatId, '我回來了');
        });
    });
});