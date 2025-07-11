/**
 * ActivityRepository 單元測試
 */
const ActivityRepository = require('../../src/infrastructure/database/repositories/ActivityRepository');
const { ActivityTypes, ActivityStatus } = require('../../src/shared/constants/ActivityTypes');

// Mock DatabaseConnection
const mockDb = {
    get: jest.fn(),
    exec: jest.fn(),
    query: jest.fn(),
    runTransaction: jest.fn()
};

describe('ActivityRepository', () => {
    let activityRepository;

    beforeEach(() => {
        activityRepository = new ActivityRepository(mockDb);
        jest.clearAllMocks();
    });

    describe('findOngoingByUser', () => {
        test('應該找到正在進行的活動', async () => {
            const mockActivity = {
                user_id: 'user123',
                chat_id: 'chat456',
                activity_type: ActivityTypes.TOILET,
                start_time: '2025-07-10T10:00:00.000Z',
                user_full_name: 'Test User',
                chat_title: 'Test Chat',
                created_at: '2025-07-10T10:00:00.000Z'
            };

            mockDb.get.mockResolvedValue(mockActivity);

            const result = await activityRepository.findOngoingByUser('user123', 'chat456');

            expect(result).toEqual({
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: new Date('2025-07-10T10:00:00.000Z'),
                userFullName: 'Test User',
                chatTitle: 'Test Chat',
                createdAt: new Date('2025-07-10T10:00:00.000Z')
            });

            expect(mockDb.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM ongoing_activities'),
                ['user123', 'chat456']
            );
        });

        test('應該返回null當沒有找到活動時', async () => {
            mockDb.get.mockResolvedValue(null);

            const result = await activityRepository.findOngoingByUser('user123', 'chat456');

            expect(result).toBe(null);
        });

        test('應該拋出錯誤當資料庫操作失敗時', async () => {
            mockDb.get.mockRejectedValue(new Error('Database error'));

            await expect(activityRepository.findOngoingByUser('user123', 'chat456'))
                .rejects.toThrow('Database error');
        });
    });

    describe('startActivity', () => {
        test('應該成功開始新活動', async () => {
            const activity = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            mockDb.exec.mockResolvedValue({ changes: 1 });

            const result = await activityRepository.startActivity(activity);

            expect(result).toEqual({
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: expect.any(Date),
                userFullName: 'Test User',
                chatTitle: 'Test Chat',
                status: ActivityStatus.ONGOING
            });

            expect(mockDb.exec).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ongoing_activities'),
                expect.arrayContaining(['user123', 'chat456', ActivityTypes.TOILET])
            );
        });

        test('應該拋出錯誤當插入失敗時', async () => {
            const activity = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                userFullName: 'Test User',
                chatTitle: 'Test Chat'
            };

            mockDb.exec.mockResolvedValue({ changes: 0 });

            await expect(activityRepository.startActivity(activity))
                .rejects.toThrow('無法創建活動記錄');
        });
    });

    describe('completeActivity', () => {
        test('應該成功完成活動', async () => {
            const mockOngoingActivity = {
                user_id: 'user123',
                chat_id: 'chat456',
                activity_type: ActivityTypes.TOILET,
                start_time: new Date(Date.now() - 300000).toISOString(), // 5分鐘前
                user_full_name: 'Test User',
                chat_title: 'Test Chat'
            };

            mockDb.runTransaction.mockImplementation(async (callback) => {
                // 模擬事務回調
                return await callback();
            });

            mockDb.get.mockResolvedValue(mockOngoingActivity);
            mockDb.exec.mockResolvedValueOnce({ lastInsertRowid: 1 });
            mockDb.exec.mockResolvedValueOnce({ changes: 1 });

            const result = await activityRepository.completeActivity('user123', 'chat456', 60);

            expect(result).toEqual({
                id: 1,
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: expect.any(Date),
                endTime: expect.any(Date),
                duration: expect.any(Number),
                overtime: 60,
                userFullName: 'Test User',
                chatTitle: 'Test Chat',
                status: ActivityStatus.OVERTIME
            });

            expect(mockDb.runTransaction).toHaveBeenCalled();
        });

        test('應該返回null當沒有正在進行的活動時', async () => {
            mockDb.runTransaction.mockImplementation(async (callback) => {
                return await callback();
            });

            mockDb.get.mockResolvedValue(null);

            const result = await activityRepository.completeActivity('user123', 'chat456');

            expect(result).toBe(null);
        });
    });

    describe('getStatistics', () => {
        test('應該返回正確的統計數據', async () => {
            const mockStats = [
                {
                    user_full_name: 'Test User',
                    activity_type: ActivityTypes.TOILET,
                    count: 3,
                    total_duration: 900,
                    total_overtime: 60,
                    overtime_count: 1
                }
            ];

            mockDb.query.mockResolvedValue(mockStats);

            const startDate = new Date('2025-07-10T00:00:00.000Z');
            const endDate = new Date('2025-07-10T23:59:59.999Z');

            const result = await activityRepository.getStatistics('chat456', startDate, endDate);

            expect(result).toEqual([
                {
                    userFullName: 'Test User',
                    activityType: ActivityTypes.TOILET,
                    count: 3,
                    totalDuration: 900,
                    totalOvertime: 60,
                    overtimeCount: 1
                }
            ]);

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.arrayContaining(['chat456', '2025-07-10', '2025-07-10'])
            );
        });
    });

    describe('findById', () => {
        test('應該根據ID找到活動', async () => {
            const mockActivity = {
                id: 1,
                user_id: 'user123',
                chat_id: 'chat456',
                activity_type: ActivityTypes.TOILET,
                start_time: '2025-07-10T10:00:00.000Z',
                end_time: '2025-07-10T10:05:00.000Z',
                duration: 300,
                overtime: 0,
                user_full_name: 'Test User',
                chat_title: 'Test Chat',
                status: ActivityStatus.COMPLETED,
                created_at: '2025-07-10T10:00:00.000Z',
                updated_at: '2025-07-10T10:05:00.000Z'
            };

            mockDb.get.mockResolvedValue(mockActivity);

            const result = await activityRepository.findById(1);

            expect(result).toEqual({
                id: 1,
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: new Date('2025-07-10T10:00:00.000Z'),
                endTime: new Date('2025-07-10T10:05:00.000Z'),
                duration: 300,
                overtime: 0,
                userFullName: 'Test User',
                chatTitle: 'Test Chat',
                status: ActivityStatus.COMPLETED,
                createdAt: new Date('2025-07-10T10:00:00.000Z'),
                updatedAt: new Date('2025-07-10T10:05:00.000Z')
            });
        });

        test('應該返回null當找不到活動時', async () => {
            mockDb.get.mockResolvedValue(null);

            const result = await activityRepository.findById(999);

            expect(result).toBe(null);
        });
    });

    describe('cleanupStaleOngoingActivities', () => {
        test('應該清理過期的正在進行活動', async () => {
            mockDb.exec.mockResolvedValue({ changes: 2 });

            const result = await activityRepository.cleanupStaleOngoingActivities();

            expect(result).toBe(2);
            expect(mockDb.exec).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM ongoing_activities'),
                expect.arrayContaining([expect.any(String)])
            );
        });

        test('應該處理沒有過期活動的情況', async () => {
            mockDb.exec.mockResolvedValue({ changes: 0 });

            const result = await activityRepository.cleanupStaleOngoingActivities();

            expect(result).toBe(0);
        });
    });

    describe('mapRowToActivity', () => {
        test('應該正確映射資料庫行到活動物件', () => {
            const row = {
                id: 1,
                user_id: 'user123',
                chat_id: 'chat456',
                activity_type: ActivityTypes.TOILET,
                start_time: '2025-07-10T10:00:00.000Z',
                end_time: '2025-07-10T10:05:00.000Z',
                duration: 300,
                overtime: 0,
                user_full_name: 'Test User',
                chat_title: 'Test Chat',
                status: ActivityStatus.COMPLETED,
                created_at: '2025-07-10T10:00:00.000Z',
                updated_at: '2025-07-10T10:05:00.000Z'
            };

            const result = activityRepository.mapRowToActivity(row);

            expect(result).toEqual({
                id: 1,
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: new Date('2025-07-10T10:00:00.000Z'),
                endTime: new Date('2025-07-10T10:05:00.000Z'),
                duration: 300,
                overtime: 0,
                userFullName: 'Test User',
                chatTitle: 'Test Chat',
                status: ActivityStatus.COMPLETED,
                createdAt: new Date('2025-07-10T10:00:00.000Z'),
                updatedAt: new Date('2025-07-10T10:05:00.000Z')
            });
        });
    });
});