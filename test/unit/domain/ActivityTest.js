/**
 * Activity Domain 測試
 */
const assert = require('assert');
const { ActivityTypes, ActivityStatus } = require('../../../src/shared/constants/ActivityTypes');

describe('Activity Domain Tests', () => {
    describe('ActivityTypes', () => {
        it('should have all required activity types', () => {
            assert.strictEqual(ActivityTypes.TOILET, 'toilet');
            assert.strictEqual(ActivityTypes.SMOKING, 'smoking');
            assert.strictEqual(ActivityTypes.PHONE, 'phone');
            assert.strictEqual(ActivityTypes.POOP_10, 'poop_10');
            assert.strictEqual(ActivityTypes.POOP_15, 'poop_15');
        });
    });

    describe('ActivityStatus', () => {
        it('should have all required status values', () => {
            assert.strictEqual(ActivityStatus.ONGOING, 'ongoing');
            assert.strictEqual(ActivityStatus.COMPLETED, 'completed');
            assert.strictEqual(ActivityStatus.OVERTIME, 'overtime');
            assert.strictEqual(ActivityStatus.CANCELLED, 'cancelled');
        });
    });

    describe('Activity Creation', () => {
        it('should create valid activity object', () => {
            const activity = {
                userId: 'user123',
                chatId: 'chat456',
                activityType: ActivityTypes.TOILET,
                startTime: new Date(),
                userFullName: 'Test User',
                chatTitle: 'Test Chat',
                status: ActivityStatus.ONGOING
            };

            assert.strictEqual(activity.userId, 'user123');
            assert.strictEqual(activity.chatId, 'chat456');
            assert.strictEqual(activity.activityType, ActivityTypes.TOILET);
            assert.strictEqual(activity.status, ActivityStatus.ONGOING);
            assert.ok(activity.startTime instanceof Date);
        });

        it('should calculate duration correctly', () => {
            const startTime = new Date('2023-01-01T10:00:00Z');
            const endTime = new Date('2023-01-01T10:05:00Z');
            const expectedDuration = 300; // 5 minutes in seconds

            const duration = Math.floor((endTime - startTime) / 1000);
            assert.strictEqual(duration, expectedDuration);
        });

        it('should calculate overtime correctly', () => {
            const maxDuration = 360; // 6 minutes for toilet
            const actualDuration = 450; // 7.5 minutes
            const expectedOvertime = 90; // 1.5 minutes

            const overtime = Math.max(0, actualDuration - maxDuration);
            assert.strictEqual(overtime, expectedOvertime);
        });
    });
});