/**
 * CompleteActivityUseCase 測試
 */
const assert = require('assert');
const CompleteActivityUseCase = require('../../../src/application/use-cases/CompleteActivityUseCase');
const { ActivityTypes, ActivityStatus } = require('../../../src/shared/constants/ActivityTypes');

describe('CompleteActivityUseCase Tests', () => {
    let useCase;
    let mockActivityRepository;

    beforeEach(() => {
        mockActivityRepository = {
            findOngoingByUser: async (userId, chatId) => null,
            completeActivity: async (userId, chatId, overtime) => null
        };

        useCase = new CompleteActivityUseCase(mockActivityRepository);
    });

    describe('Valid Activity Completion', () => {
        it('should complete activity successfully', async () => {
            const startTime = new Date(Date.now() - 300000); // 5 minutes ago
            const mockOngoingActivity = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: startTime,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            const mockCompletedActivity = {
                id: 1,
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: startTime,
                endTime: new Date(),
                duration: 300, // 5 minutes
                overtime: 0,
                userFullName: 'Test User',
                chatTitle: 'Test Chat',
                status: ActivityStatus.COMPLETED
            };

            mockActivityRepository.findOngoingByUser = async (userId, chatId) => mockOngoingActivity;
            mockActivityRepository.completeActivity = async (userId, chatId, overtime) => mockCompletedActivity;

            const command = {
                userId: 'user123',
                chatId: 'chat456'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, true);
            assert.ok(result.activity);
            assert.strictEqual(result.activity.id, 1);
            assert.strictEqual(result.activity.duration, 300);
            assert.strictEqual(result.activity.overtime, 0);
            assert.strictEqual(result.activity.status, ActivityStatus.COMPLETED);
        });

        it('should calculate overtime correctly', async () => {
            const startTime = new Date(Date.now() - 450000); // 7.5 minutes ago
            const mockOngoingActivity = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET, // max 6 minutes
                startTime: startTime,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            const mockCompletedActivity = {
                id: 1,
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: startTime,
                endTime: new Date(),
                duration: 450, // 7.5 minutes
                overtime: 90, // 1.5 minutes overtime
                userFullName: 'Test User',
                chatTitle: 'Test Chat',
                status: ActivityStatus.OVERTIME
            };

            mockActivityRepository.findOngoingByUser = async (userId, chatId) => mockOngoingActivity;
            mockActivityRepository.completeActivity = async (userId, chatId, overtime) => {
                assert.strictEqual(overtime, 90); // Should calculate 90 seconds overtime
                return mockCompletedActivity;
            };

            const command = {
                userId: 'user123',
                chatId: 'chat456'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.activity.overtime, 90);
            assert.strictEqual(result.activity.status, ActivityStatus.OVERTIME);
        });

        it('should handle different activity types correctly', async () => {
            const testCases = [
                { type: ActivityTypes.TOILET, maxDuration: 360 },
                { type: ActivityTypes.SMOKING, maxDuration: 300 },
                { type: ActivityTypes.PHONE, maxDuration: 600 },
                { type: ActivityTypes.POOP_10, maxDuration: 600 },
                { type: ActivityTypes.POOP_15, maxDuration: 900 }
            ];

            for (const testCase of testCases) {
                const actualDuration = testCase.maxDuration + 60; // 1 minute overtime
                const expectedOvertime = 60;

                const mockOngoingActivity = {
                    userId: 'user123',
                    chatId: 'chat456',
                    activityType: testCase.type,
                    startTime: new Date(Date.now() - actualDuration * 1000),
                    userFullName: 'Test User',
                    chatTitle: 'Test Chat'
                };

                mockActivityRepository.findOngoingByUser = async () => mockOngoingActivity;
                mockActivityRepository.completeActivity = async (userId, chatId, overtime) => {
                    assert.strictEqual(overtime, expectedOvertime, `Failed for activity type: ${testCase.type}`);
                    return {
                        id: 1,
                        userId: 'user123',
                        chatId: 'chat456',
                        activityType: testCase.type,
                        duration: actualDuration,
                        overtime: overtime,
                        status: overtime > 0 ? ActivityStatus.OVERTIME : ActivityStatus.COMPLETED
                    };
                };

                const command = {
                    userId: 'user123',
                    chatId: 'chat456'
                };

                const result = await useCase.execute(command);
                assert.strictEqual(result.success, true);
            }
        });
    });

    describe('No Ongoing Activity', () => {
        it('should return error when no ongoing activity exists', async () => {
            mockActivityRepository.findOngoingByUser = async (userId, chatId) => null;

            const command = {
                userId: 'user123',
                chatId: 'chat456'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
            assert.ok(result.message.includes('沒有正在進行的活動'));
        });
    });

    describe('Input Validation', () => {
        it('should validate required fields', async () => {
            const invalidCommand = {
                userId: '',
                chatId: 'chat456'
            };

            const result = await useCase.execute(invalidCommand);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
        });

        it('should validate chat ID', async () => {
            const invalidCommand = {
                userId: 'user123',
                chatId: ''
            };

            const result = await useCase.execute(invalidCommand);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
        });
    });

    describe('Repository Errors', () => {
        it('should handle repository errors gracefully', async () => {
            mockActivityRepository.findOngoingByUser = async () => {
                throw new Error('Database error');
            };

            const command = {
                userId: 'user123',
                chatId: 'chat456'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
        });

        it('should handle completion errors gracefully', async () => {
            const mockOngoingActivity = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: new Date(Date.now() - 300000),
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            mockActivityRepository.findOngoingByUser = async () => mockOngoingActivity;
            mockActivityRepository.completeActivity = async () => {
                throw new Error('Completion error');
            };

            const command = {
                userId: 'user123',
                chatId: 'chat456'
            };

            const result = await useCase.execute(command);

            assert.strictEqual(result.success, false);
            assert.ok(result.message);
        });
    });
});