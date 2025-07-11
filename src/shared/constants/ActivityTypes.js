/**
 * 活動類型常數定義
 * 統一管理所有活動類型配置
 */

const ActivityTypes = {
    TOILET: 'toilet',
    SMOKING: 'smoking',
    PHONE: 'phone',
    POOP_10: 'poop_10',
    POOP_15: 'poop_15'
};

// 活動類型映射表 (根據Python版本的ACTIVITY_LIMITS調整)
const ActivityTypeMap = {
    [ActivityTypes.TOILET]: {
        name: '上廁所',
        nameEn: 'เข้าห้องน้ำ',
        emoji: '🚽',
        maxDuration: 360, // 6分鐘
        color: '#4CAF50',
        buttonText: '🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)'
    },
    [ActivityTypes.SMOKING]: {
        name: '抽菸',
        nameEn: 'สูบบุหรี่',
        emoji: '🚬',
        maxDuration: 300, // 5分鐘
        color: '#FF9800',
        buttonText: '🚬 抽菸 (5分鐘)/สูบบุหรี่'
    },
    [ActivityTypes.PHONE]: {
        name: '使用手機',
        nameEn: 'ใช้มือถือ',
        emoji: '📱',
        maxDuration: 600, // 10分鐘
        color: '#2196F3',
        buttonText: '📱 使用手機 (10分鐘)/ใช้มือถือ'
    },
    [ActivityTypes.POOP_10]: {
        name: '大便10',
        nameEn: 'อึ10นาที',
        emoji: '💩',
        maxDuration: 600, // 10分鐘
        color: '#8BC34A',
        buttonText: '💩 大便 (10分鐘)/อึ10นาที'
    },
    [ActivityTypes.POOP_15]: {
        name: '大便15',
        nameEn: 'อึ15นาที',
        emoji: '💩',
        maxDuration: 900, // 15分鐘
        color: '#CDDC39',
        buttonText: '💩 大便 (15分鐘)/อึ15นาที'
    }
};

// 活動狀態
const ActivityStatus = {
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    OVERTIME: 'overtime'
};

class ActivityTypeHelper {
    /**
     * 檢查活動類型是否有效
     * @param {string} activityType 活動類型
     * @returns {boolean} 是否有效
     */
    static isValid(activityType) {
        return Object.values(ActivityTypes).includes(activityType);
    }

    /**
     * 獲取活動名稱
     * @param {string} activityType 活動類型
     * @returns {string} 活動名稱
     */
    static getName(activityType) {
        const config = ActivityTypeMap[activityType];
        return config ? config.name : '未知活動';
    }

    /**
     * 獲取活動表情符號
     * @param {string} activityType 活動類型
     * @returns {string} 表情符號
     */
    static getEmoji(activityType) {
        const config = ActivityTypeMap[activityType];
        return config ? config.emoji : '❓';
    }

    /**
     * 獲取最大持續時間（秒）
     * @param {string} activityType 活動類型
     * @returns {number} 最大持續時間
     */
    static getMaxDuration(activityType) {
        const config = ActivityTypeMap[activityType];
        return config ? config.maxDuration : 300; // 預設5分鐘
    }

    /**
     * 獲取按鈕文字
     * @param {string} activityType 活動類型
     * @returns {string} 按鈕文字
     */
    static getButtonText(activityType) {
        const config = ActivityTypeMap[activityType];
        return config ? config.buttonText : '未知活動';
    }

    /**
     * 獲取活動完整配置
     * @param {string} activityType 活動類型
     * @returns {Object|null} 活動配置
     */
    static getConfig(activityType) {
        return ActivityTypeMap[activityType] || null;
    }

    /**
     * 獲取所有活動類型
     * @returns {Array} 所有活動類型陣列
     */
    static getAllTypes() {
        return Object.values(ActivityTypes);
    }

    /**
     * 獲取所有活動配置
     * @returns {Object} 所有活動配置
     */
    static getAllConfigs() {
        return ActivityTypeMap;
    }

    /**
     * 創建 Telegram 鍵盤按鈕配置
     * @returns {Array} 按鈕配置陣列
     */
    static createKeyboardButtons() {
        return [
            [
                { text: ActivityTypeMap[ActivityTypes.TOILET].buttonText },
                { text: ActivityTypeMap[ActivityTypes.SMOKING].buttonText }
            ],
            [
                { text: ActivityTypeMap[ActivityTypes.POOP_10].buttonText },
                { text: ActivityTypeMap[ActivityTypes.POOP_15].buttonText }
            ],
            [
                { text: ActivityTypeMap[ActivityTypes.PHONE].buttonText },
                { text: '✅ 我回來了/ฉันกลับมาแล้ว' }
            ],
            [
                { text: '📊 統計數據/สถิติ' }
            ]
        ];
    }

    /**
     * 根據按鈕文字獲取活動類型
     * @param {string} buttonText 按鈕文字
     * @returns {string|null} 活動類型
     */
    static getTypeByButtonText(buttonText) {
        for (const [type, config] of Object.entries(ActivityTypeMap)) {
            if (config.buttonText === buttonText) {
                return type;
            }
        }
        return null;
    }

    /**
     * 檢查是否超時
     * @param {string} activityType 活動類型
     * @param {number} duration 持續時間（秒）
     * @returns {Object} 超時資訊
     */
    static checkOvertime(activityType, duration) {
        const maxDuration = this.getMaxDuration(activityType);
        const overtime = Math.max(0, duration - maxDuration);
        return {
            isOvertime: overtime > 0,
            overtime: overtime,
            maxDuration: maxDuration
        };
    }
}

module.exports = {
    ActivityTypes,
    ActivityTypeMap,
    ActivityStatus,
    ActivityTypeHelper
};