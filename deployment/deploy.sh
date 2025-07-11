#!/bin/bash

# Activity Tracker Bot 部署腳本
# 使用方法: ./deploy.sh [環境] [版本]
# 例如: ./deploy.sh production v1.0.0

set -e  # 遇到錯誤時退出

# 設定顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 輔助函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 命令不存在，請先安裝"
        exit 1
    fi
}

# 檢查參數
if [ $# -lt 1 ]; then
    log_error "使用方法: $0 [環境] [版本]"
    log_info "環境選項: development, staging, production"
    log_info "版本選項: latest, v1.0.0, 等等"
    exit 1
fi

ENVIRONMENT=$1
VERSION=${2:-latest}
APP_NAME="activity-tracker-bot"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log_info "開始部署 $APP_NAME"
log_info "環境: $ENVIRONMENT"
log_info "版本: $VERSION"
log_info "專案目錄: $PROJECT_ROOT"

# 檢查環境變數
if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        log_error "TELEGRAM_BOT_TOKEN 環境變數未設定"
        exit 1
    fi
fi

# 切換到專案目錄
cd "$PROJECT_ROOT"

case $ENVIRONMENT in
    "development")
        log_info "部署到開發環境"
        
        # 檢查必要命令
        check_command "node"
        check_command "npm"
        
        # 安裝依賴
        log_info "安裝依賴..."
        npm install
        
        # 安裝開發依賴
        npm install --only=dev
        
        # 運行測試
        log_info "運行測試..."
        npm test
        
        # 啟動開發服務器
        log_info "啟動開發服務器..."
        npm run dev
        ;;
        
    "staging")
        log_info "部署到測試環境"
        
        # 檢查必要命令
        check_command "docker"
        check_command "docker-compose"
        
        # 構建映像
        log_info "構建 Docker 映像..."
        docker build -f deployment/Dockerfile -t $APP_NAME:$VERSION .
        docker tag $APP_NAME:$VERSION $APP_NAME:staging-latest
        
        # 使用 docker-compose 部署
        log_info "啟動測試環境服務..."
        cd deployment
        COMPOSE_FILE="docker-compose.yml:docker-compose.staging.yml"
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up -d
        
        # 等待服務啟動
        log_info "等待服務啟動..."
        sleep 10
        
        # 健康檢查
        log_info "執行健康檢查..."
        if curl -f http://localhost:3000/health; then
            log_success "測試環境部署成功"
        else
            log_error "健康檢查失敗"
            exit 1
        fi
        ;;
        
    "production")
        log_info "部署到生產環境"
        
        # 安全檢查
        read -p "確定要部署到生產環境嗎？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "取消部署"
            exit 0
        fi
        
        # 檢查必要命令
        check_command "docker"
        check_command "docker-compose"
        
        # 備份現有部署
        if docker ps | grep -q $APP_NAME; then
            log_info "備份現有部署..."
            docker tag $APP_NAME:latest $APP_NAME:backup-$(date +%Y%m%d-%H%M%S)
        fi
        
        # 運行測試
        log_info "運行測試..."
        npm test
        
        # 構建生產映像
        log_info "構建生產 Docker 映像..."
        docker build -f deployment/Dockerfile -t $APP_NAME:$VERSION .
        docker tag $APP_NAME:$VERSION $APP_NAME:latest
        
        # 使用 docker-compose 部署
        log_info "啟動生產環境服務..."
        cd deployment
        docker-compose down
        docker-compose up -d
        
        # 等待服務啟動
        log_info "等待服務啟動..."
        sleep 15
        
        # 健康檢查
        log_info "執行健康檢查..."
        for i in {1..10}; do
            if curl -f http://localhost:3000/health; then
                log_success "生產環境部署成功"
                break
            else
                if [ $i -eq 10 ]; then
                    log_error "健康檢查失敗，正在回滾..."
                    docker-compose down
                    docker tag $APP_NAME:backup-* $APP_NAME:latest
                    docker-compose up -d
                    exit 1
                fi
                log_info "健康檢查失敗，重試 $i/10..."
                sleep 5
            fi
        done
        
        # 清理舊映像
        log_info "清理舊映像..."
        docker image prune -f
        
        # 設定監控（如果啟用）
        if [ "$ENABLE_MONITORING" = "true" ]; then
            log_info "啟動監控服務..."
            docker-compose --profile monitoring up -d
        fi
        ;;
        
    "pm2")
        log_info "使用 PM2 部署"
        
        # 檢查必要命令
        check_command "node"
        check_command "npm"
        check_command "pm2"
        
        # 安裝依賴
        log_info "安裝生產依賴..."
        npm ci --only=production
        
        # 運行測試
        log_info "運行測試..."
        npm test
        
        # 使用 PM2 部署
        log_info "使用 PM2 啟動應用..."
        cd deployment
        
        if pm2 list | grep -q $APP_NAME; then
            log_info "重啟現有應用..."
            pm2 restart ecosystem.config.js --env production
        else
            log_info "啟動新應用..."
            pm2 start ecosystem.config.js --env production
        fi
        
        # 保存 PM2 配置
        pm2 save
        
        # 健康檢查
        log_info "執行健康檢查..."
        sleep 5
        if pm2 list | grep -q "online"; then
            log_success "PM2 部署成功"
        else
            log_error "PM2 部署失敗"
            pm2 logs $APP_NAME
            exit 1
        fi
        ;;
        
    *)
        log_error "不支援的環境: $ENVIRONMENT"
        log_info "支援的環境: development, staging, production, pm2"
        exit 1
        ;;
esac

# 部署後任務
post_deploy() {
    log_info "執行部署後任務..."
    
    # 發送部署通知（如果配置了webhook）
    if [ -n "$DEPLOY_WEBHOOK_URL" ]; then
        curl -X POST "$DEPLOY_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"$APP_NAME $VERSION 已成功部署到 $ENVIRONMENT 環境\"}"
    fi
    
    # 記錄部署歷史
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $ENVIRONMENT - $VERSION" >> deployment.log
    
    log_success "部署完成！"
    log_info "環境: $ENVIRONMENT"
    log_info "版本: $VERSION"
    log_info "狀態: 運行中"
    
    # 顯示有用的命令
    case $ENVIRONMENT in
        "development")
            log_info "開發命令:"
            log_info "  查看日誌: npm run logs"
            log_info "  停止服務: Ctrl+C"
            ;;
        "staging"|"production")
            log_info "管理命令:"
            log_info "  查看狀態: docker-compose ps"
            log_info "  查看日誌: docker-compose logs -f"
            log_info "  停止服務: docker-compose down"
            ;;
        "pm2")
            log_info "PM2 管理命令:"
            log_info "  查看狀態: pm2 status"
            log_info "  查看日誌: pm2 logs $APP_NAME"
            log_info "  停止服務: pm2 stop $APP_NAME"
            ;;
    esac
}

# 錯誤處理
trap 'log_error "部署過程中發生錯誤，請檢查日誌"; exit 1' ERR

# 執行部署後任務
post_deploy