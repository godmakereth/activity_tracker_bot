#!/usr/bin/env node

/**
 * 安全啟動腳本 - 先清理再啟動
 */

require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

async function safeStart() {
    console.log('🚀 安全啟動活動追蹤機器人...');
    
    try {
        // 檢查環境變數
        require('dotenv').config();
        const token = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!token || token === 'your_bot_token_here') {
            console.error('❌ TELEGRAM_BOT_TOKEN 未設置或仍為預設值');
            console.log('💡 請檢查 .env 檔案中的 TELEGRAM_BOT_TOKEN');
            process.exit(1);
        }
        
        console.log('✅ Token 檢查通過');
        
        // 提供重置選項（可選）
        console.log('ℹ️ 如果遇到 409 衝突錯誤，可以先執行：npm run reset');
        
        // 等待一段時間讓其他實例清理
        console.log('⏳ 等待 2 秒鐘...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 直接啟動主應用
        console.log('📝 啟動主應用...');
        const mainScript = path.join(__dirname, 'src', 'app.js');
        
        const mainProcess = spawn('node', [mainScript], {
            stdio: 'inherit'
        });
        
        // 處理主進程事件
        mainProcess.on('close', (code) => {
            console.log(`主應用已退出，代碼: ${code}`);
            process.exit(code);
        });
        
        mainProcess.on('error', (error) => {
            console.error('❌ 啟動主應用失敗:', error.message);
            console.log('💡 嘗試執行：npm run reset 然後 npm run start-unsafe');
            process.exit(1);
        });
        
        // 處理退出信號
        process.on('SIGINT', () => {
            console.log('\n收到退出信號，正在關閉...');
            mainProcess.kill('SIGINT');
        });
        
        process.on('SIGTERM', () => {
            console.log('收到終止信號，正在關閉...');
            mainProcess.kill('SIGTERM');
        });
        
    } catch (error) {
        console.error('❌ 安全啟動失敗:', error.message);
        console.log('💡 嘗試執行：npm run start-unsafe');
        process.exit(1);
    }
}

// 執行安全啟動
safeStart().catch(error => {
    console.error('❌ 啟動錯誤:', error.message);
    process.exit(1);
});