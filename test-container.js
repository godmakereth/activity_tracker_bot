require('dotenv').config();

console.log('🔍 Testing DependencyContainer behavior:');
console.log('TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('Token value:', process.env.TELEGRAM_BOT_TOKEN);

const { container } = require('./src/shared/DependencyContainer');
const AppConfig = require('./src/shared/config/AppConfig');

console.log('\n📝 Creating AppConfig...');
const config = new AppConfig();
console.log('✅ AppConfig created successfully');

console.log('\n📝 Registering telegramBot singleton...');
container.singleton('telegramBot', () => {
    const TelegramBot = require('node-telegram-bot-api');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    console.log('🔍 Inside telegramBot factory:');
    console.log('Token exists:', !!token);
    console.log('Token value:', token);
    console.log('Is default check:', token === 'your_bot_token_here');
    
    if (!token || token === 'your_bot_token_here') {
        console.log('❌ Validation FAILED in factory');
        throw new Error('TELEGRAM_BOT_TOKEN validation failed');
    }
    
    console.log('✅ Validation PASSED in factory');
    return new TelegramBot(token, { polling: false });
});

console.log('\n📝 Calling container.boot()...');
try {
    container.boot();
    console.log('✅ Container booted successfully');
} catch (error) {
    console.log('❌ Container boot failed:', error.message);
}