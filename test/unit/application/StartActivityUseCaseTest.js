/**
 * StartActivityUseCase 測試
 */
const assert = require('assert');
const StartActivityUseCase = require('../../../src/application/use-cases/StartActivityUseCase');
const { ActivityTypes } = require('../../../src/shared/constants/ActivityTypes');

describe('StartActivityUseCase Tests', () => {
    let useCase;
    let mockActivityRepository;
    let mockUserRepository;
    let mockChatRepository;

    beforeEach(() => {
        // 模擬依賴
        mockActivityRepository = {
            findOngoingByUser: async (userId, chatId) => null,
            startActivity: async (activity) => ({
                ...activity,
                id: Math.random(),
                startTime: new Date(),
                status: 'ongoing'
            })
        };

        mockUserRepository = {
            updateUserInfo: async (userId, userInfo) => true
        };

        mockChatRepository = {
            updateChatInfo: async (chatId, chatTitle) => true
        };

        useCase = new StartActivityUseCase(
            mockActivityRepository,
            mockUserRepository,
            mockChatRepository
        );
    });

    describe('Valid Activity Start', () => {
        it('should start new activity successfully', async () => {
            const command = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, true);
            assert.ok(result.activity);
            assert.strictEqual(result.activity.activityType, ActivityTypes.TOILET);
            assert.strictEqual(result.activity.userId, 'user123');
            assert.strictEqual(result.activity.chatId, 'chat456');
        });

        it('should update user and chat info', async () => {
            let userUpdated = false;
            let chatUpdated = false;

            mockUserRepository.updateUserInfo = async (userId, userInfo) => {
                userUpdated = true;
                assert.strictEqual(userId, 'user123');
                assert.strictEqual(userInfo.userFullName, 'Test User');
                return true;
            };

            mockChatRepository.updateChatInfo = async (chatId, chatTitle) => {
                chatUpdated = true;
                assert.strictEqual(chatId, 'chat456');
                assert.strictEqual(chatTitle, 'Test Chat');
                return true;
            };

            const command = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            await useCase.execute(command);

            assert.strictEqual(userUpdated, true);
            assert.strictEqual(chatUpdated, true);
        });
    });

    describe('Activity Already Ongoing', () => {
        it('should return error when user already has ongoing activity', async () => {
            // 模擬已存在的正在進行活動
            mockActivityRepository.findOngoingByUser = async (userId, chatId) => ({
                userId,
                chatId,
                activityType: ActivityTypes.SMOKING,
                startTime: new Date(),
                status: 'ongoing'
            });

            const command = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
            assert.ok(result.message.includes('正在進行'));
        });
    });

    describe('Input Validation', () => {
        it('should validate required fields', async () => {
            const invalidCommand = {
                userId: '',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET
            };

            const result = await useCase.execute(invalidCommand);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
        });

        it('should validate activity type', async () => {
            const invalidCommand = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: 'invalid_type',
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            const result = await useCase.execute(invalidCommand);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
        });
    });

    describe('Repository Errors', () => {
        it('should handle activity repository errors', async () => {
            mockActivityRepository.startActivity = async () => {
                throw new Error('Database error');
            };

            const command = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
        });

        it('should handle user repository errors', async () => {
            mockUserRepository.updateUserInfo = async () => {
                throw new Error('User update error');
            };

            const command = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
        });
    });
});