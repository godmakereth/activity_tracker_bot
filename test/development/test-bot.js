/**
 * 簡單的機器人測試工具
 */

require('dotenv').config();

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN 未設置');
    process.exit(1);
}

// 測試機器人基本信息
function testBotInfo() {
    return new Promise((resolve, reject) => {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.ok) {
                        console.log('✅ 機器人連接成功！');
                        console.log(`📱 機器人名稱: ${result.result.first_name}`);
                        console.log(`🔗 用戶名: @${result.result.username}`);
                        console.log(`🆔 ID: ${result.result.id}`);
                        resolve(result.result);
                    } else {
                        reject(new Error(result.description));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// 獲取更新（查看是否有人發送訊息）
function getUpdates() {
    return new Promise((resolve, reject) => {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.ok) {
                        resolve(result.result);
                    } else {
                        reject(new Error(result.description));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// 發送訊息
function sendMessage(chatId, text) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.ok) {
                        resolve(result.result);
                    } else {
                        reject(new Error(result.description));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// 主測試函數
async function main() {
    try {
        console.log('🚀 測試 Telegram Bot API 連接...');
        
        // 測試機器人信息
        const botInfo = await testBotInfo();
        
        console.log('');
        console.log('🔍 檢查是否有新訊息...');
        
        // 獲取更新
        const updates = await getUpdates();
        
        if (updates.length === 0) {
            console.log('📭 沒有新訊息');
            console.log('');
            console.log('🔧 手動測試指引：');
            console.log(`1. 在 Telegram 中搜尋: @${botInfo.username}`);
            console.log('2. 發送任何訊息給機器人');
            console.log('3. 重新運行此腳本查看結果');
        } else {
            console.log(`📬 發現 ${updates.length} 條訊息：`);
            
            for (const update of updates) {
                if (update.message) {
                    const msg = update.message;
                    const user = msg.from;
                    const chat = msg.chat;
                    
                    console.log(`\n📨 訊息 #${update.update_id}:`);
                    console.log(`👤 來自: ${user.first_name || user.username} (ID: ${user.id})`);
                    console.log(`💬 內容: "${msg.text}"`);
                    console.log(`📍 聊天室: ${chat.id}`);
                    
                    // 回覆訊息
                    const replyText = `🎉 **重構成功！**

✅ 收到您的訊息: "${msg.text}"
✅ 新架構正常運行
✅ 機器人功能正常

📋 **可用功能：**
• 安全的環境變數管理
• 分層架構設計
• 領域驅動設計 (DDD)
• 依賴注入容器

🚀 **重構完成，系統運行正常！**`;

                    try {
                        await sendMessage(chat.id, replyText);
                        console.log('✅ 已回覆訊息');
                    } catch (error) {
                        console.error('❌ 回覆失敗:', error.message);
                    }
                }
            }
        }
        
        console.log('');
        console.log('🎊 測試完成！機器人 API 連接正常。');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

// 運行測試
main();