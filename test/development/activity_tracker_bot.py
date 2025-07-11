import logging
import asyncio
import aiosqlite  # <<< 修改：從 sqlite3 改為 aiosqlite
from datetime import datetime, timedelta
from typing import Callable, Dict, Any, Awaitable, List, Tuple, Optional

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

# 安全配置 - 移除硬編碼Token
import os

API_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

# 驗證必要的環境變數
if not API_TOKEN:
    raise ValueError('❌ TELEGRAM_BOT_TOKEN 環境變數未設置\n請創建 .env 文件或設置環境變數')

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)

# 將活動限制時間定義成一個字典，方便管理
ACTIVITY_LIMITS = {
    '上廁所': 6 * 60,
    '抽菸': 5 * 60,
    '大便10': 10 * 60,
    '大便15': 15 * 60,
    '使用手機': 10 * 60
}

# 中介層：日誌記錄每次收到的事件
class SimpleLoggingMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        logger.info(
            "Update %s received: %s",
            event.__class__.__name__,
            event.model_dump(exclude_none=True)
        )
        return await handler(event, data)

dp.update.middleware.register(SimpleLoggingMiddleware())

# <<< 修改：所有資料庫操作都改為 async def >>>

# 建立資料庫與資料表
async def create_db():
    """創建資料庫和必要的表"""
    async with aiosqlite.connect('tracker.db') as db:
        # 檢查表是否存在
        async with db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activities'") as cursor:
            activities_exists = await cursor.fetchone() is not None
            
        async with db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ongoing'") as cursor:
            ongoing_exists = await cursor.fetchone() is not None
        
        # 如果表不存在才創建
        if not activities_exists:
            await db.execute('''
                CREATE TABLE IF NOT EXISTS activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    chat_id INTEGER NOT NULL,
                    activity TEXT NOT NULL,
                    start_time TIMESTAMP NOT NULL,
                    end_time TIMESTAMP NOT NULL,
                    duration INTEGER NOT NULL,
                    overtime INTEGER NOT NULL,
                    user_full_name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            logger.info("Created activities table")
        
        if not ongoing_exists:
            await db.execute('''
                CREATE TABLE IF NOT EXISTS ongoing (
                    user_id INTEGER NOT NULL,
                    chat_id INTEGER NOT NULL,
                    activity TEXT NOT NULL,
                    start_time TIMESTAMP NOT NULL,
                    user_full_name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, chat_id)
                )
            ''')
            logger.info("Created ongoing table")
        
        await db.commit()

# 獲取正在進行的活動
async def get_ongoing_activity(user_id: int, chat_id: int) -> Optional[Dict]:
    """獲取使用者正在進行的活動"""
    async with aiosqlite.connect('tracker.db') as db:
        async with db.execute(
            'SELECT activity, start_time FROM ongoing WHERE user_id = ? AND chat_id = ?',
            (user_id, chat_id)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return {
                    'activity': row[0],
                    'start_time': datetime.fromisoformat(row[1])
                }
            return None

# 開始活動
async def start_activity(user_id: int, chat_id: int, activity: str, user_full_name: str):
    """開始一個新的活動"""
    start_time = datetime.now()
    async with aiosqlite.connect('tracker.db') as db:
        await db.execute(
            'INSERT INTO ongoing (user_id, chat_id, activity, start_time, user_full_name) VALUES (?, ?, ?, ?, ?)',
            (user_id, chat_id, activity, start_time.isoformat(), user_full_name)
        )
        await db.commit()

# 結束活動
async def stop_activity(user_id: int, chat_id: int) -> Optional[Dict]:
    """停止當前活動並返回活動詳情"""
    async with aiosqlite.connect('tracker.db') as db:
        # 獲取活動信息
        async with db.execute(
            'SELECT activity, start_time, user_full_name FROM ongoing WHERE user_id = ? AND chat_id = ?',
            (user_id, chat_id)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            
            activity = row[0]
            start_time = datetime.fromisoformat(row[1])
            user_full_name = row[2]
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds())
            
            # 計算超時時間
            activity_limit = ACTIVITY_LIMITS.get(activity, 5 * 60)  # 預設5分鐘
            overtime = max(0, duration - activity_limit)
            
            # 插入活動記錄
            await db.execute('''
                INSERT INTO activities 
                (user_id, chat_id, activity, start_time, end_time, duration, overtime, user_full_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, chat_id, activity, 
                start_time.isoformat(), end_time.isoformat(),
                duration, overtime, user_full_name
            ))
            
            # 刪除進行中的活動
            await db.execute(
                'DELETE FROM ongoing WHERE user_id = ? AND chat_id = ?',
                (user_id, chat_id)
            )
            
            await db.commit()
            
            return {
                'activity': activity,
                'duration': duration,
                'overtime': overtime,
                'user_full_name': user_full_name,
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat()
            }

# 獲取詳細記錄
async def get_detailed_records(time_range: str, chat_id: int) -> List[Dict]:
    """獲取指定時間範圍的詳細記錄"""
    async with aiosqlite.connect('tracker.db') as db:
        # 根據時間範圍構建 SQL 條件
        time_condition = ""
        if time_range == "today":
            time_condition = "AND date(start_time) = date('now', 'localtime')"
        elif time_range == "yesterday":
            time_condition = "AND date(start_time) = date('now', 'localtime', '-1 day')"
        elif time_range == "this_week":
            time_condition = "AND strftime('%Y-%W', start_time) = strftime('%Y-%W', 'now', 'localtime')"
        elif time_range == "last_week":
            time_condition = "AND strftime('%Y-%W', start_time) = strftime('%Y-%W', 'now', 'localtime', '-7 days')"
        elif time_range == "this_month":
            time_condition = "AND strftime('%Y-%m', start_time) = strftime('%Y-%m', 'now', 'localtime')"
        elif time_range == "last_month":
            time_condition = "AND strftime('%Y-%m', start_time) = strftime('%Y-%m', 'now', 'localtime', '-1 month')"

        # 構建活動限制條件
        activity_limits = "CASE activity\n"
        for activity, limit in ACTIVITY_LIMITS.items():
            activity_limits += f"    WHEN '{activity}' THEN {limit}\n"
        activity_limits += "    ELSE 300 END"

        # 執行查詢
        query = f"""
            WITH activity_stats AS (
                SELECT 
                    user_full_name,
                    activity,
                    COUNT(*) as count,
                    SUM(duration) as total_duration,
                    SUM(CASE 
                        WHEN duration > {activity_limits}
                        THEN duration - {activity_limits}
                        ELSE 0 
                    END) as total_overtime,
                    COUNT(CASE 
                        WHEN duration > {activity_limits}
                        THEN 1 
                        ELSE NULL 
                    END) as overtime_count
                FROM activities 
                WHERE chat_id = ? {time_condition}
                GROUP BY user_full_name, activity
            )
            SELECT 
                user_full_name,
                activity,
                count,
                total_duration,
                total_overtime,
                overtime_count
            FROM activity_stats
            ORDER BY user_full_name, activity
        """
        
        async with db.execute(query, (chat_id,)) as cursor:
            rows = await cursor.fetchall()
            return [
                {
                    'user_full_name': row[0],
                    'activity': row[1],
                    'count': row[2],
                    'total_duration': row[3],
                    'total_overtime': row[4],
                    'overtime_count': row[5]
                }
                for row in rows
            ]

# 時間格式化
def format_duration_mmss(total_seconds):
    if not isinstance(total_seconds, (int, float)) or total_seconds < 0:
        total_seconds = 0
    minutes = int(total_seconds // 60)
    seconds = int(total_seconds % 60)
    chi_format = f"{minutes} 分 {seconds} 秒"
    tha_format = f"{minutes} นาที {seconds} วินาที"
    return chi_format, tha_format

# 啟動選單
@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    """處理 /start 命令"""
    keyboard = types.ReplyKeyboardMarkup(
        keyboard=[
            [
                types.KeyboardButton(text="🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)"),
                types.KeyboardButton(text="🚬 抽菸 (5分鐘)/สูบบุหรี่")
            ],
            [
                types.KeyboardButton(text="💩 大便 (10分鐘)/อึ10นาที"),
                types.KeyboardButton(text="💩 大便 (15分鐘)/อึ15นาที")
            ],
            [
                types.KeyboardButton(text="📱 使用手機 (10分鐘)/ใช้มือถือ"),
                types.KeyboardButton(text="✅ 我回來了/ฉันกลับมาแล้ว")
            ],
            [types.KeyboardButton(text="📊 統計數據/สถิติ")]
        ],
        resize_keyboard=True
    )
    await message.reply(
        "👋 歡迎使用活動追蹤機器人！\n"
        "請選擇您要開始的活動，或查看統計數據。\n\n"
        "ยินดีต้อนรับสู่บอทติดตามกิจกรรม!\n"
        "กรุณาเลือกกิจกรรมที่ต้องการเริ่มต้น หรือดูสถิติ",
        reply_markup=keyboard
    )

# 新增：歷史紀錄選單
@dp.message(F.text == "📜 歷史紀錄/บันทึกย้อนหลัง")
async def show_history_menu(message: types.Message):
    markup = types.ReplyKeyboardMarkup(
        keyboard=[
            [types.KeyboardButton(text="📅 昨日紀錄/บันทึกเมื่อวาน")],
            [types.KeyboardButton(text="📅 本月紀錄/บันทึกเดือนนี้")],
            [types.KeyboardButton(text="📅 上月紀錄/บันทึกเดือนที่แล้ว")],
            [types.KeyboardButton(text="🔙 返回主選單/กลับเมนูหลัก")]
        ],
        resize_keyboard=True
    )
    await message.answer("請選擇要查看的歷史紀錄:\nกรุณาเลือกบันทึกที่ต้องการดู", reply_markup=markup)

# 處理按鈕
@dp.message(F.text)
async def handle_buttons(message: types.Message):
    """處理按鈕點擊"""
    user_id = message.from_user.id
    chat_id = message.chat.id
    full_name = message.from_user.full_name
    text = message.text

    # 處理返回主選單按鈕
    if "返回主選單" in text:
        await cmd_start(message)
        return

    # 處理統計數據相關按鈕
    if text == "📊 統計數據/สถิติ":
        await show_statistics_menu(message)
        return
    elif text.startswith("📅"):
        await handle_statistics(message)
        return

    # 檢查是否有正在進行的活動
    ongoing_activity = await get_ongoing_activity(user_id, chat_id)
    
    # 處理開始活動的按鈕
    if text == "🚽 上廁所 (6分鐘)/เข้าห้องน้ำ (6 นาที)":
        if ongoing_activity:
            await message.reply(f"⚠️ 您已經在進行 '{ongoing_activity['activity']}' 活動了，請先結束。\nคุณมีกิจกรรม '{ongoing_activity['activity']}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน")
            return
        await start_activity(user_id, chat_id, "上廁所", full_name)
        await message.reply("✅ 已開始記錄上廁所時間/เริ่มบันทึกเวลาเข้าห้องน้ำ")
    
    elif text == "🚬 抽菸 (5分鐘)/สูบบุหรี่":
        if ongoing_activity:
            await message.reply(f"⚠️ 您已經在進行 '{ongoing_activity['activity']}' 活動了，請先結束。\nคุณมีกิจกรรม '{ongoing_activity['activity']}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน")
            return
        await start_activity(user_id, chat_id, "抽菸", full_name)
        await message.reply("✅ 已開始記錄抽菸時間/เริ่มบันทึกเวลาสูบบุหรี่")
    
    elif text == "💩 大便 (15分鐘)/อึ15นาที":
        if ongoing_activity:
            await message.reply(f"⚠️ 您已經在進行 '{ongoing_activity['activity']}' 活動了，請先結束。\nคุณมีกิจกรรม '{ongoing_activity['activity']}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน")
            return
        await start_activity(user_id, chat_id, "大便15", full_name)
        await message.reply("✅ 已開始記錄大便時間/เริ่มบันทึกเวลาอึ")
    
    elif text == "💩 大便 (10分鐘)/อึ10นาที":
        if ongoing_activity:
            await message.reply(f"⚠️ 您已經在進行 '{ongoing_activity['activity']}' 活動了，請先結束。\nคุณมีกิจกรรม '{ongoing_activity['activity']}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน")
            return
        await start_activity(user_id, chat_id, "大便10", full_name)
        await message.reply("✅ 已開始記錄大便時間/เริ่มบันทึกเวลาอึ")
    
    elif text == "📱 使用手機 (10分鐘)/ใช้มือถือ":
        if ongoing_activity:
            await message.reply(f"⚠️ 您已經在進行 '{ongoing_activity['activity']}' 活動了，請先結束。\nคุณมีกิจกรรม '{ongoing_activity['activity']}' ที่กำลังดำเนินอยู่ กรุณาทำให้เสร็จก่อน")
            return
        await start_activity(user_id, chat_id, "使用手機", full_name)
        await message.reply("✅ 已開始記錄使用手機時間/เริ่มบันทึกเวลาใช้มือถือ")
    
    elif text == "✅ 我回來了/ฉันกลับมาแล้ว":
        activity_info = await stop_activity(user_id, chat_id)
        if activity_info:
            duration = activity_info['duration']
            overtime = activity_info['overtime']
            activity = activity_info['activity']
            
            response = f"✅ 已記錄 {activity} 時間/บันทึกเวลา {activity}:\n"
            response += f"⏱ 總時間/รวมเวลา: {duration // 60} 分 {duration % 60} 秒 ({duration // 60} นาที {duration % 60} วินาที)"
            
            if overtime > 0:
                response += f"\n⚠️ 超時/เกินเวลา: {overtime // 60} 分 {overtime % 60} 秒 ({overtime // 60} นาที {overtime % 60} วินาที)"
            
            await message.reply(response)
        else:
            await message.reply("❌ 沒有進行中的活動/ไม่มีกิจกรรมที่กำลังดำเนินอยู่")

# 修改：統計數據選單
@dp.message(F.text == "📊 統計數據/สถิติ")
async def show_statistics_menu(message: types.Message):
    """顯示統計選單"""
    keyboard = types.ReplyKeyboardMarkup(
        keyboard=[
            [
                types.KeyboardButton(text="📅 本日資料/ข้อมูลวันนี้"),
                types.KeyboardButton(text="📅 昨日資料/ข้อมูลเมื่อวาน")
            ],
            [
                types.KeyboardButton(text="📅 本週資料/ข้อมูลสัปดาห์นี้"),
                types.KeyboardButton(text="📅 上週資料/ข้อมูลสัปดาห์ที่แล้ว")
            ],
            [
                types.KeyboardButton(text="📅 本月資料/ข้อมูลเดือนนี้"),
                types.KeyboardButton(text="📅 上月資料/ข้อมูลเดือนที่แล้ว")
            ],
            [types.KeyboardButton(text="🔙 返回主選單/กลับเมนูหลัก")]
        ],
        resize_keyboard=True
    )
    await message.reply("📊 請選擇要查看的統計時間範圍/เลือกช่วงเวลาที่ต้องการดูสถิติ", reply_markup=keyboard)

# 修改：處理統計數據請求
@dp.message(F.text.startswith("📅"))
async def handle_statistics(message: types.Message):
    """處理統計數據請求"""
    chat_id = message.chat.id
    text = message.text.lower()
    
    # 確定時間範圍
    time_range = None
    if "本日" in text or "วันนี้" in text:
        time_range = "today"
    elif "昨日" in text or "เมื่อวาน" in text:
        time_range = "yesterday"
    elif "本週" in text or "สัปดาห์นี้" in text:
        time_range = "this_week"
    elif "上週" in text or "สัปดาห์ที่แล้ว" in text:
        time_range = "last_week"
    elif "本月" in text or "เดือนนี้" in text:
        time_range = "this_month"
    elif "上月" in text or "เดือนที่แล้ว" in text:
        time_range = "last_month"
    
    if not time_range:
        return
    
    # 獲取記錄
    records = await get_detailed_records(time_range, chat_id)
    if not records:
        await message.reply("📊 該時段沒有記錄/ไม่มีข้อมูลในช่วงเวลานี้")
        return
    
    # 按使用者分組統計
    user_stats = {}
    for record in records:
        user_name = record['user_full_name']
        if user_name not in user_stats:
            user_stats[user_name] = {
                'total_count': 0,
                'total_duration': 0,
                'total_overtime': 0,
                'total_overtime_count': 0,
                'activities': {}
            }
        
        stats = user_stats[user_name]
        activity = record['activity']
        
        # 更新總計
        stats['total_count'] += record['count']
        stats['total_duration'] += record['total_duration']
        stats['total_overtime'] += record['total_overtime']
        stats['total_overtime_count'] += record['overtime_count']
        
        # 更新活動統計
        if activity not in stats['activities']:
            stats['activities'][activity] = {
                'count': 0,
                'duration': 0,
                'overtime': 0,
                'overtime_count': 0
            }
        
        activity_stats = stats['activities'][activity]
        activity_stats['count'] = record['count']
        activity_stats['duration'] = record['total_duration']
        activity_stats['overtime'] = record['total_overtime']
        activity_stats['overtime_count'] = record['overtime_count']
    
    # 構建報告
    report = "📊 群組統計報告/รายงานสถิติกลุ่ม\n\n"
    
    for user_name, stats in user_stats.items():
        report += f"👤 {user_name}\n"
        report += f"📈 總計/รวม:\n"
        report += f"   🔢 總次數: {stats['total_count']} (ครั้ง)\n"
        report += f"   ⏱️ 總時間: {stats['total_duration'] // 60} 分 {stats['total_duration'] % 60} 秒 (รวม: {stats['total_duration'] // 60} นาที {stats['total_duration'] % 60} วินาที)\n"
        report += f"   ⚠️ 總超時: {stats['total_overtime'] // 60} 分 {stats['total_overtime'] % 60} 秒 (เกินเวลา: {stats['total_overtime'] // 60} นาที {stats['total_overtime'] % 60} วินาที)\n"
        report += f"   ❌ 超時次數: {stats['total_overtime_count']} 次 (ครั้งที่เกินเวลา)\n\n"
        
        report += "📊 活動明細/รายละเอียดกิจกรรม:\n"
        for activity, activity_stats in stats['activities'].items():
            # 根據活動類型選擇表情符號
            activity_emoji = {
                '上廁所': '🚽',
                '抽菸': '🚬',
                '大便10': '💩',
                '大便15': '💩',
                '使用手機': '📱'
            }.get(activity, '📝')
            
            report += f"   {activity_emoji} {activity}:\n"
            report += f"     🔢 次數: {activity_stats['count']} (ครั้ง)\n"
            report += f"     ⏱️ 時間: {activity_stats['duration'] // 60} 分 {activity_stats['duration'] % 60} 秒 (รวม: {activity_stats['duration'] // 60} นาที {activity_stats['duration'] % 60} วินาที)\n"
            if activity_stats['overtime'] > 0:
                report += f"     ⚠️ 超時: {activity_stats['overtime'] // 60} 分 {activity_stats['overtime'] % 60} 秒 (เกินเวลา: {activity_stats['overtime'] // 60} นาที {activity_stats['overtime'] % 60} วินาที)\n"
                report += f"     ❌ 超時次數: {activity_stats['overtime_count']} 次 (ครั้งที่เกินเวลา)\n"
        report += "\n"
    
    await message.reply(report)

# 主程式
async def main():
    # <<< 修改：在啟動時先執行一次資料庫初始化 >>>
    await create_db()
    await dp.start_polling(bot, skip_updates=True)

if __name__ == '__main__':
    asyncio.run(main())