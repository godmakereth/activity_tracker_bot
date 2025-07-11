/**
 * 應用程式配置管理器
 * 負責環境變數驗證和配置管理
 */

class AppConfig {
    constructor() {
        // 確保 dotenv 已載入
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            require('dotenv').config();
        }
        this.validateEnvironment();
        this.loadConfiguration();
    }

    /**
     * 驗證必要的環境變數
     */
    validateEnvironment() {
        const requiredVars = [
            'TELEGRAM_BOT_TOKEN'
        ];

        const missing = requiredVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
            throw new Error(`❌ 缺少必要的環境變數: ${missing.join(', ')}\n請檢查 .env 文件或設置環境變數`);
        }
    }

    /**
     * 載入配置
     */
    loadConfiguration() {
        this.telegram = {
            token: process.env.TELEGRAM_BOT_TOKEN,
            polling: true
        };

        this.database = {
            type: process.env.DB_TYPE || 'sqlite',
            path: process.env.DB_PATH || 'activities.db'
        };

        this.reports = {
            directory: process.env.REPORTS_DIR || 'reports',
            cronTime: process.env.REPORT_TIME || '5 23 * * *'
        };

        this.application = {
            environment: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT) || 3000,
            logLevel: process.env.LOG_LEVEL || 'info'
        };

        this.cache = {
            ttl: parseInt(process.env.CACHE_TTL) || 300000, // 5分鐘
            enabled: process.env.ENABLE_CACHE === 'true'
        };

        this.performance = {
            batchSize: parseInt(process.env.BATCH_SIZE) || 100,
            maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPERATIONS) || 10
        };

        this.features = {
            reporting: process.env.ENABLE_REPORTING !== 'false',
            multilingual: process.env.ENABLE_MULTILINGUAL === 'true',
            analytics: process.env.ENABLE_ANALYTICS !== 'false'
        };
    }

    /**
     * 獲取 Telegram Bot Token
     * @returns {string} Bot Token
     */
    getTelegramToken() {
        return this.telegram.token;
    }

    /**
     * 獲取資料庫配置
     * @returns {Object} 資料庫配置
     */
    getDatabaseConfig() {
        return this.database;
    }

    /**
     * 獲取報告配置
     * @returns {Object} 報告配置
     */
    getReportsConfig() {
        return this.reports;
    }

    /**
     * 檢查功能是否啟用
     * @param {string} featureName 功能名稱
     * @returns {boolean} 是否啟用
     */
    isFeatureEnabled(featureName) {
        return this.features[featureName] || false;
    }

    /**
     * 獲取完整配置
     * @returns {Object} 完整配置對象
     */
    getConfig() {
        return {
            telegram: this.telegram,
            database: this.database,
            reports: this.reports,
            application: this.application,
            cache: this.cache,
            performance: this.performance,
            features: this.features
        };
    }
}

module.exports = AppConfig;