/**
 * PM2 生產環境配置檔案
 */
module.exports = {
  apps: [{
    name: 'activity-tracker-bot',
    script: './src/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // 環境變數
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // 日誌配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 重啟策略
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    exponential_backoff_restart_delay: 100,
    
    // 進程監控
    listen_timeout: 3000,
    kill_timeout: 5000,
    
    // 健康檢查
    health_check_grace_period: 3000,
    health_check_interval: 30000,
    
    // 錯誤處理
    autorestart: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    
    // 進程管理
    exec_mode: 'fork',
    instances: 1,
    
    // 其他配置
    vizion: false,
    automation: false,
    pmx: true,
    
    // 忽略監視的檔案/目錄
    ignore_watch: [
      'node_modules',
      'logs',
      'data',
      'statistics',
      'test',
      '.git'
    ],
    
    // 環境檢查
    wait_ready: true,
    
    // 輸出配置
    time: true,
    
    // 自定義 env 檔案路徑
    env_file: '.env'
  }],

  // PM2+ 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/telegram-activity-tracker-bot.git',
      path: '/var/www/activity-tracker-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server-ip'],
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/telegram-activity-tracker-bot.git',
      path: '/var/www/activity-tracker-bot-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};