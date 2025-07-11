/**
 * Activity Workflow 整合測試
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const SimpleDatabaseConnection = require('../../src/infrastructure/database/SimpleDatabaseConnection');
const ActivityRepository = require('../../src/infrastructure/database/repositories/ActivityRepository');
const ChatRepository = require('../../src/infrastructure/database/repositories/ChatRepository');
const UserRepository = require('../../src/infrastructure/database/repositories/UserRepository');
const StartActivityUseCase = require('../../src/application/use-cases/StartActivityUseCase');
const CompleteActivityUseCase = require('../../src/application/use-cases/CompleteActivityUseCase');
const { ActivityTypes } = require('../../src/shared/constants/ActivityTypes');

describe('Activity Workflow Integration Tests', () => {
    let db;
    let activityRepository;
    let chatRepository;
    let userRepository;
    let startActivityUseCase;
    let completeActivityUseCase;
    let testDbPath;

    beforeEach(async () => {
        testDbPath = path.join(__dirname, '../fixtures/integration_test.json');
        
        // 清理測試資料
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }

        // 設定測試環境
        db = new SimpleDatabaseConnection(testDbPath);
        await db.connect();

        activityRepository = new ActivityRepository(db);
        chatRepository = new ChatRepository(db);
        userRepository = new UserRepository(db);

        startActivityUseCase = new StartActivityUseCase(
            activityRepository,
            userRepository,
            chatRepository
        );

        completeActivityUseCase = new CompleteActivityUseCase(activityRepository);
    });

    afterEach(() => {
        if (db && db.isConnected) {
            db.close();
        }
        
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('Complete Activity Workflow', () => {
        it('should complete full activity workflow', async () => {
            const userId = 'user123';
            const chatId = 'chat456';
            const activityType = ActivityTypes.TOILET;
            const userFullName = 'Test User';
            const chatTitle = 'Test Chat';

            // 1. 開始活動
            const startCommand = {
                userId,
                chatId,
                activityType,
                userFullName,
                chatTitle
            };

            const startResult = await startActivityUseCase.execute(startCommand);
            assert.strictEqual(startResult.success, true);
            assert.ok(startResult.activity);

            // 2. 檢查正在進行的活動
            const ongoingActivity = await activityRepository.findOngoingByUser(userId, chatId);
            assert.ok(ongoingActivity);
            assert.strictEqual(ongoingActivity.userId, userId);
            assert.strictEqual(ongoingActivity.activityType, activityType);

            // 3. 等待一小段時間模擬活動進行
            await new Promise(resolve => setTimeout(resolve, 100));

            // 4. 完成活動
            const completeCommand = {
                userId,
                chatId
            };

            const completeResult = await completeActivityUseCase.execute(completeCommand);
            assert.strictEqual(completeResult.success, true);
            assert.ok(completeResult.activity);
            assert.ok(completeResult.activity.id);
            assert.ok(completeResult.activity.duration >= 0);

            // 5. 檢查活動已完成
            const completedActivity = await activityRepository.findById(completeResult.activity.id);
            assert.ok(completedActivity);
            assert.strictEqual(completedActivity.userId, userId);
            assert.strictEqual(completedActivity.activityType, activityType);
            assert.ok(completedActivity.endTime);

            // 6. 檢查正在進行的活動已清理
            const ongoingAfterComplete = await activityRepository.findOngoingByUser(userId, chatId);
            assert.strictEqual(ongoingAfterComplete, null);
        });

        it('should handle multiple users in same chat', async () => {
            const chatId = 'chat456';
            const chatTitle = 'Test Chat';
            const users = [
                { userId: 'user1', name: 'User One' },
                { userId: 'user2', name: 'User Two' }
            ];

            // 兩個用戶同時開始不同活動
            for (const user of users) {
                const startCommand = {
                    userId: user.userId,
                    chatId,
                    activityType: ActivityTypes.TOILET,
                    userFullName: user.name,
                    chatTitle
                };

                const result = await startActivityUseCase.execute(startCommand);
                assert.strictEqual(result.success, true);
            }

            // 檢查兩個用戶都有正在進行的活動
            for (const user of users) {
                const ongoingActivity = await activityRepository.findOngoingByUser(user.userId, chatId);
                assert.ok(ongoingActivity);
                assert.strictEqual(ongoingActivity.userId, user.userId);
            }

            // 第一個用戶完成活動
            const completeResult = await completeActivityUseCase.execute({
                userId: users[0].userId,
                chatId
            });
            assert.strictEqual(completeResult.success, true);

            // 檢查第一個用戶活動已完成，第二個用戶仍在進行
            const user1Ongoing = await activityRepository.findOngoingByUser(users[0].userId, chatId);
            const user2Ongoing = await activityRepository.findOngoingByUser(users[1].userId, chatId);
            
            assert.strictEqual(user1Ongoing, null);
            assert.ok(user2Ongoing);
        });

        it('should handle same user in different chats', async () => {
            const userId = 'user123';
            const userFullName = 'Test User';
            const chats = [
                { chatId: 'chat1', title: 'Chat One' },
                { chatId: 'chat2', title: 'Chat Two' }
            ];

            // 同一用戶在不同聊天室開始活動
            for (const chat of chats) {
                const startCommand = {
                    userId,
                    chatId: chat.chatId,
                    activityType: ActivityTypes.SMOKING,
                    userFullName,
                    chatTitle: chat.title
                };

                const result = await startActivityUseCase.execute(startCommand);
                assert.strictEqual(result.success, true);
            }

            // 檢查兩個聊天室都有該用戶的正在進行活動
            for (const chat of chats) {
                const ongoingActivity = await activityRepository.findOngoingByUser(userId, chat.chatId);
                assert.ok(ongoingActivity);
                assert.strictEqual(ongoingActivity.chatId, chat.chatId);
            }

            // 在第一個聊天室完成活動
            const completeResult = await completeActivityUseCase.execute({
                userId,
                chatId: chats[0].chatId
            });
            assert.strictEqual(completeResult.success, true);

            // 檢查第一個聊天室活動已完成，第二個聊天室仍在進行
            const chat1Ongoing = await activityRepository.findOngoingByUser(userId, chats[0].chatId);
            const chat2Ongoing = await activityRepository.findOngoingByUser(userId, chats[1].chatId);
            
            assert.strictEqual(chat1Ongoing, null);
            assert.ok(chat2Ongoing);
        });
    });

    describe('Error Scenarios', () => {
        it('should prevent starting activity when one already ongoing', async () => {
            const userId = 'user123';
            const chatId = 'chat456';
            const userFullName = 'Test User';
            const chatTitle = 'Test Chat';

            // 開始第一個活動
            const startCommand1 = {
                userId,
                chatId,
                activityType: ActivityTypes.TOILET,
                userFullName,
                chatTitle
            };

            const result1 = await startActivityUseCase.execute(startCommand1);
            assert.strictEqual(result1.success, true);

            // 嘗試開始第二個活動（應該失敗）
            const startCommand2 = {
                userId,
                chatId,
                activityType: ActivityTypes.SMOKING,
                userFullName,
                chatTitle
            };

            const result2 = await startActivityUseCase.execute(startCommand2);
            assert.strictEqual(result2.success, false);
            assert.ok(result2.message.includes('正在進行'));
        });

        it('should handle completing non-existent activity', async () => {
            const completeCommand = {
                userId: 'user123',
                chatId: 'chat456'
            };

            const result = await completeActivityUseCase.execute(completeCommand);
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('沒有正在進行的活動'));
        });
    });

    describe('Data Persistence', () => {
        it('should persist data across database connections', async () => {
            const userId = 'user123';
            const chatId = 'chat456';
            const activityType = ActivityTypes.PHONE;
            const userFullName = 'Test User';
            const chatTitle = 'Test Chat';

            // 開始活動
            const startCommand = {
                userId,
                chatId,
                activityType,
                userFullName,
                chatTitle
            };

            const startResult = await startActivityUseCase.execute(startCommand);
            assert.strictEqual(startResult.success, true);

            // 關閉資料庫連接
            db.close();

            // 重新連接資料庫
            db = new SimpleDatabaseConnection(testDbPath);
            await db.connect();

            // 重新建立repositories
            activityRepository = new ActivityRepository(db);
            completeActivityUseCase = new CompleteActivityUseCase(activityRepository);

            // 檢查正在進行的活動仍然存在
            const ongoingActivity = await activityRepository.findOngoingByUser(userId, chatId);
            assert.ok(ongoingActivity);
            assert.strictEqual(ongoingActivity.userId, userId);
            assert.strictEqual(ongoingActivity.activityType, activityType);

            // 完成活動
            const completeCommand = {
                userId,
                chatId
            };

            const completeResult = await completeActivityUseCase.execute(completeCommand);
            assert.strictEqual(completeResult.success, true);

            // 檢查完成的活動已保存
            const completedActivity = await activityRepository.findById(completeResult.activity.id);
            assert.ok(completedActivity);
            assert.strictEqual(completedActivity.userId, userId);
            assert.strictEqual(completedActivity.activityType, activityType);
        });
    });
});