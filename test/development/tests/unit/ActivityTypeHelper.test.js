/**
 * ActivityTypeHelper 單元測試
 */
const { ActivityTypes, ActivityTypeHelper } = require('../../src/shared/constants/ActivityTypes');

describe('ActivityTypeHelper', () => {
    describe('isValid', () => {
        test('應該驗證有效的活動類型', () => {
            expect(ActivityTypeHelper.isValid(ActivityTypes.TOILET)).toBe(true);
            expect(ActivityTypeHelper.isValid(ActivityTypes.SMOKING)).toBe(true);
            expect(ActivityTypeHelper.isValid(ActivityTypes.PHONE)).toBe(true);
            expect(ActivityTypeHelper.isValid(ActivityTypes.POOP_10)).toBe(true);
            expect(ActivityTypeHelper.isValid(ActivityTypes.POOP_15)).toBe(true);
        });

        test('應該拒絕無效的活動類型', () => {
            expect(ActivityTypeHelper.isValid('invalid_type')).toBe(false);
            expect(ActivityTypeHelper.isValid('')).toBe(false);
            expect(ActivityTypeHelper.isValid(null)).toBe(false);
            expect(ActivityTypeHelper.isValid(undefined)).toBe(false);
        });
    });

    describe('getName', () => {
        test('應該返回正確的活動名稱', () => {
            expect(ActivityTypeHelper.getName(ActivityTypes.TOILET)).toBe('上廁所');
            expect(ActivityTypeHelper.getName(ActivityTypes.SMOKING)).toBe('抽菸');
            expect(ActivityTypeHelper.getName(ActivityTypes.PHONE)).toBe('使用手機');
            expect(ActivityTypeHelper.getName(ActivityTypes.POOP_10)).toBe('大便10');
            expect(ActivityTypeHelper.getName(ActivityTypes.POOP_15)).toBe('大便15');
        });

        test('應該返回未知活動對於無效類型', () => {
            expect(ActivityTypeHelper.getName('invalid_type')).toBe('未知活動');
        });
    });

    describe('getEmoji', () => {
        test('應該返回正確的表情符號', () => {
            expect(ActivityTypeHelper.getEmoji(ActivityTypes.TOILET)).toBe('🚽');
            expect(ActivityTypeHelper.getEmoji(ActivityTypes.SMOKING)).toBe('🚬');
            expect(ActivityTypeHelper.getEmoji(ActivityTypes.PHONE)).toBe('📱');
            expect(ActivityTypeHelper.getEmoji(ActivityTypes.POOP_10)).toBe('💩');
            expect(ActivityTypeHelper.getEmoji(ActivityTypes.POOP_15)).toBe('💩');
        });

        test('應該返回問號對於無效類型', () => {
            expect(ActivityTypeHelper.getEmoji('invalid_type')).toBe('❓');
        });
    });

    describe('getMaxDuration', () => {
        test('應該返回正確的最大持續時間', () => {
            expect(ActivityTypeHelper.getMaxDuration(ActivityTypes.TOILET)).toBe(360); // 6分鐘
            expect(ActivityTypeHelper.getMaxDuration(ActivityTypes.SMOKING)).toBe(300); // 5分鐘
            expect(ActivityTypeHelper.getMaxDuration(ActivityTypes.PHONE)).toBe(600); // 10分鐘
            expect(ActivityTypeHelper.getMaxDuration(ActivityTypes.POOP_10)).toBe(600); // 10分鐘
            expect(ActivityTypeHelper.getMaxDuration(ActivityTypes.POOP_15)).toBe(900); // 15分鐘
        });

        test('應該返回預設時間對於無效類型', () => {
            expect(ActivityTypeHelper.getMaxDuration('invalid_type')).toBe(300); // 5分鐘預設
        });
    });

    describe('checkOvertime', () => {
        test('應該正確檢測無超時情況', () => {
            const result = ActivityTypeHelper.checkOvertime(ActivityTypes.TOILET, 300); // 5分鐘
            expect(result.isOvertime).toBe(false);
            expect(result.overtime).toBe(0);
            expect(result.maxDuration).toBe(360);
        });

        test('應該正確檢測超時情況', () => {
            const result = ActivityTypeHelper.checkOvertime(ActivityTypes.TOILET, 400); // 6分40秒
            expect(result.isOvertime).toBe(true);
            expect(result.overtime).toBe(40); // 超時40秒
            expect(result.maxDuration).toBe(360);
        });

        test('應該正確處理剛好達到最大時間的情況', () => {
            const result = ActivityTypeHelper.checkOvertime(ActivityTypes.SMOKING, 300); // 剛好5分鐘
            expect(result.isOvertime).toBe(false);
            expect(result.overtime).toBe(0);
            expect(result.maxDuration).toBe(300);
        });
    });

    describe('getTypeByButtonText', () => {
        test('應該根據按鈕文字找到正確的活動類型', () => {
            expect(ActivityTypeHelper.getTypeByButtonText('🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)')).toBe(ActivityTypes.TOILET);
            expect(ActivityTypeHelper.getTypeByButtonText('🚬 抽菸 (5分鐘)/สูบบุหรี่')).toBe(ActivityTypes.SMOKING);
            expect(ActivityTypeHelper.getTypeByButtonText('📱 使用手機 (10分鐘)/ใช้มือถือ')).toBe(ActivityTypes.PHONE);
        });

        test('應該返回null對於無效的按鈕文字', () => {
            expect(ActivityTypeHelper.getTypeByButtonText('invalid button text')).toBe(null);
            expect(ActivityTypeHelper.getTypeByButtonText('')).toBe(null);
        });
    });

    describe('getAllTypes', () => {
        test('應該返回所有活動類型', () => {
            const types = ActivityTypeHelper.getAllTypes();
            expect(types).toHaveLength(5);
            expect(types).toContain(ActivityTypes.TOILET);
            expect(types).toContain(ActivityTypes.SMOKING);
            expect(types).toContain(ActivityTypes.PHONE);
            expect(types).toContain(ActivityTypes.POOP_10);
            expect(types).toContain(ActivityTypes.POOP_15);
        });
    });

    describe('createKeyboardButtons', () => {
        test('應該創建正確的鍵盤按鈕結構', () => {
            const buttons = ActivityTypeHelper.createKeyboardButtons();
            expect(buttons).toHaveLength(4); // 4行按鈕
            expect(buttons[0]).toHaveLength(2); // 第一行2個按鈕
            expect(buttons[1]).toHaveLength(2); // 第二行2個按鈕
            expect(buttons[2]).toHaveLength(2); // 第三行2個按鈕
            expect(buttons[3]).toHaveLength(1); // 第四行1個按鈕

            // 檢查按鈕文字包含預期內容
            const allButtonTexts = buttons.flat().map(btn => btn.text);
            expect(allButtonTexts.some(text => text.includes('上廁所'))).toBe(true);
            expect(allButtonTexts.some(text => text.includes('抽菸'))).toBe(true);
            expect(allButtonTexts.some(text => text.includes('使用手機'))).toBe(true);
            expect(allButtonTexts.some(text => text.includes('統計數據'))).toBe(true);
        });
    });
});