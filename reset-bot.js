#!/usr/bin/env node

/**
 * Bot 重置工具 - 用於清理重複實例問題
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

async function resetBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN 未設置');
        process.exit(1);
    }
    
    console.log('🧹 正在重置 Telegram Bot...');
    
    try {
        // 創建一個簡單的 Bot 實例來清理
        const bot = new TelegramBot(token, { polling: false });
        
        // 先測試 Token 是否有效
        try {
            const me = await bot.getMe();
            console.log('✅ Bot Token 有效:', me.username);
        } catch (tokenError) {
            if (tokenError.message.includes('404')) {
                console.error('❌ Bot Token 無效或已被撤銷');
                console.log('💡 請檢查 .env 檔案中的 TELEGRAM_BOT_TOKEN');
                process.exit(1);
            }
            throw tokenError;
        }
        
        // 嘗試獲取 webhook 資訊
        try {
            const webhookInfo = await bot.getWebHookInfo();
            console.log('📡 Webhook 資訊:', webhookInfo.url || '無');
            
            // 如果有 webhook，刪除它
            if (webhookInfo.url) {
                await bot.deleteWebHook();
                console.log('🗑️ 已刪除 Webhook');
            }
        } catch (webhookError) {
            console.log('ℹ️ Webhook 操作錯誤（可忽略）:', webhookError.message);
        }
        
        // 清理任何待處理的更新
        try {
            const updates = await bot.getUpdates({ offset: -1, limit: 1 });
            if (updates.length > 0) {
                const lastUpdateId = updates[0].update_id;
                await bot.getUpdates({ offset: lastUpdateId + 1, limit: 1 });
                console.log('🧹 已清理待處理的更新');
            } else {
                console.log('ℹ️ 無待處理的更新需要清理');
            }
        } catch (updateError) {
            console.log('ℹ️ 清理更新時的錯誤（可忽略）:', updateError.message);
        }
        
        console.log('✅ Bot 重置完成！現在可以安全啟動新實例。');
        
    } catch (error) {
        console.error('❌ 重置失敗:', error.message);
        
        // 如果是 404 錯誤，給出更詳細的說明
        if (error.message.includes('404')) {
            console.log('💡 可能的原因：');
            console.log('   1. Bot Token 無效或已被撤銷');
            console.log('   2. 網路連接問題');
            console.log('   3. Telegram API 暫時不可用');
            console.log('');
            console.log('🔧 解決方案：');
            console.log('   1. 檢查 .env 檔案中的 TELEGRAM_BOT_TOKEN');
            console.log('   2. 嘗試直接啟動：npm run start-unsafe');
            console.log('   3. 聯繫 @BotFather 確認 Bot 狀態');
        }
        
        process.exit(1);
    }
}

// 執行重置
resetBot().catch(console.error);