/**
 * Excel 報告生成器
 */
const ExcelJS = require('exceljs');
const moment = require('moment-timezone');

class ExcelReportGenerator {
    constructor() {
        this.timezone = 'Asia/Taipei';
    }

    /**
     * 生成詳細的 Excel 員工統計報告
     */
    async generateDetailedEmployeeReport(statsData, chatTitle) {
        const workbook = new ExcelJS.Workbook();
        
        // 設置工作簿屬性
        workbook.creator = 'Activity Tracker Bot';
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.title = `${chatTitle} - 員工活動統計報告`;

        // 1. 總覽工作表
        await this.createSummarySheet(workbook, statsData, chatTitle);
        
        // 2. 員工詳細統計工作表
        await this.createEmployeeDetailsSheet(workbook, statsData);
        
        // 3. 活動明細工作表
        await this.createActivityDetailsSheet(workbook, statsData);
        
        // 4. 時段分析工作表
        await this.createHourlyAnalysisSheet(workbook, statsData);
        
        // 5. 即時狀態工作表
        await this.createLiveStatusSheet(workbook, statsData);
        
        // 6. 日期分析工作表
        await this.createDailyBreakdownSheet(workbook, statsData);

        return workbook;
    }

    /**
     * 創建總覽工作表
     */
    async createSummarySheet(workbook, statsData, chatTitle) {
        const worksheet = workbook.addWorksheet('📊 總覽統計', {
            tabColor: { argb: 'FF3498DB' }
        });

        // 設置列寬
        worksheet.columns = [
            { key: 'label', width: 20 },
            { key: 'value', width: 15 },
            { key: 'unit', width: 10 },
            { key: 'percentage', width: 15 }
        ];

        // 標題
        worksheet.mergeCells('A1:D1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `📊 ${chatTitle} - 員工活動統計總覽`;
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2C3E50' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };

        // 生成時間
        worksheet.mergeCells('A2:D2');
        const timeCell = worksheet.getCell('A2');
        timeCell.value = `📅 報告生成時間: ${moment().tz(this.timezone).format('YYYY-MM-DD HH:mm:ss')}`;
        timeCell.font = { italic: true, color: { argb: 'FF7F8C8D' } };
        timeCell.alignment = { horizontal: 'center' };

        // 報告期間
        worksheet.mergeCells('A3:D3');
        const periodCell = worksheet.getCell('A3');
        const startDate = moment(statsData.period.startDate).format('YYYY-MM-DD');
        const endDate = moment(statsData.period.endDate).format('YYYY-MM-DD');
        periodCell.value = `📅 統計期間: ${startDate} 至 ${endDate}`;
        periodCell.font = { bold: true, color: { argb: 'FF34495E' } };
        periodCell.alignment = { horizontal: 'center' };

        // 空行
        worksheet.addRow([]);

        // 表頭
        const headerRow = worksheet.addRow(['📋 統計項目', '📊 數值', '📏 單位', '📈 佔比/說明']);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3498DB' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // 統計數據
        const summaryData = [
            ['👥 總員工數', statsData.summary.totalEmployees, '人', `共 ${statsData.summary.totalEmployees} 位員工`],
            ['📊 總活動次數', statsData.summary.totalActivities, '次', `平均每人 ${Math.round(statsData.summary.totalActivities / statsData.summary.totalEmployees)} 次`],
            ['⏱️ 總活動時間', this.formatDurationForExcel(statsData.summary.totalDuration), '', `平均每次 ${this.formatDurationForExcel(Math.round(statsData.summary.totalDuration / statsData.summary.totalActivities))}`],
            ['⚠️ 總超時時間', this.formatDurationForExcel(statsData.summary.totalOvertime), '', `超時比例 ${Math.round((statsData.summary.totalOvertime / statsData.summary.totalDuration) * 100)}%`],
            ['🔴 目前活動中', statsData.summary.activeEmployees, '人', `${Math.round((statsData.summary.activeEmployees / statsData.summary.totalEmployees) * 100)}% 員工正在活動`]
        ];

        summaryData.forEach(([label, value, unit, note]) => {
            const row = worksheet.addRow([label, value, unit, note]);
            row.getCell(1).font = { bold: true, color: { argb: 'FF2C3E50' } };
            row.getCell(2).font = { bold: true, color: { argb: 'FFE74C3C' } };
            row.getCell(2).alignment = { horizontal: 'center' };
            row.getCell(3).alignment = { horizontal: 'center' };
            row.getCell(4).font = { italic: true, color: { argb: 'FF7F8C8D' } };
        });

        // 邊框
        this.addBorders(worksheet, `A5:D${5 + summaryData.length}`);

        // 活動類型統計
        worksheet.addRow([]);
        worksheet.addRow([]);
        
        const activityHeaderRow = worksheet.addRow(['🎯 活動類型統計', '', '', '']);
        worksheet.mergeCells(`A${activityHeaderRow.number}:D${activityHeaderRow.number}`);
        activityHeaderRow.font = { bold: true, size: 14, color: { argb: 'FF2C3E50' } };
        activityHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        activityHeaderRow.alignment = { horizontal: 'center' };

        const activityTableHeader = worksheet.addRow(['📝 活動類型', '📊 總次數', '⏱️ 總時間', '👥 參與人數']);
        activityTableHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        activityTableHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
        activityTableHeader.alignment = { horizontal: 'center' };

        // 計算活動類型統計
        const activityTypes = {};
        Object.values(statsData.employees).forEach(employee => {
            Object.entries(employee.activities).forEach(([activityType, activityStats]) => {
                if (!activityTypes[activityType]) {
                    activityTypes[activityType] = {
                        totalCount: 0,
                        totalDuration: 0,
                        uniqueUsers: new Set()
                    };
                }
                activityTypes[activityType].totalCount += activityStats.count;
                activityTypes[activityType].totalDuration += activityStats.totalDuration;
                activityTypes[activityType].uniqueUsers.add(employee.userName);
            });
        });

        Object.entries(activityTypes).forEach(([activityType, stats]) => {
            const row = worksheet.addRow([
                this.getActivityName(activityType),
                stats.totalCount,
                this.formatDurationForExcel(stats.totalDuration),
                stats.uniqueUsers.size
            ]);
            row.getCell(1).font = { bold: true };
            row.getCell(2).alignment = { horizontal: 'center' };
            row.getCell(3).alignment = { horizontal: 'center' };
            row.getCell(4).alignment = { horizontal: 'center' };
        });

        const lastRow = worksheet.lastRow.number;
        this.addBorders(worksheet, `A${activityTableHeader.number}:D${lastRow}`);
    }

    /**
     * 創建員工詳細統計工作表
     */
    async createEmployeeDetailsSheet(workbook, statsData) {
        const worksheet = workbook.addWorksheet('👥 員工詳細統計', {
            tabColor: { argb: 'FF27AE60' }
        });

        // 設置列寬
        worksheet.columns = [
            { key: 'name', width: 15 },
            { key: 'efficiency', width: 12 },
            { key: 'totalActivities', width: 12 },
            { key: 'totalDuration', width: 15 },
            { key: 'averageTime', width: 15 },
            { key: 'overtimeCount', width: 12 },
            { key: 'overtimeTotal', width: 15 },
            { key: 'attendanceDays', width: 12 },
            { key: 'mostUsed', width: 15 }
        ];

        // 標題
        worksheet.mergeCells('A1:I1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = '👥 員工詳細統計分析';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2C3E50' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F6F3' } };

        worksheet.addRow([]);

        // 表頭
        const headerRow = worksheet.addRow([
            '👤 員工姓名',
            '🎯 效率評分',
            '📊 總活動次數',
            '⏱️ 總活動時間',
            '📊 平均活動時間',
            '❌ 超時次數',
            '⚠️ 總超時時間',
            '📅 出勤天數',
            '🏆 最常用活動'
        ]);
        
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // 員工數據
        Object.values(statsData.employees).forEach(employee => {
            const row = worksheet.addRow([
                employee.userName,
                `${employee.efficiency}%`,
                employee.totalActivities,
                this.formatDurationForExcel(employee.totalDuration),
                this.formatDurationForExcel(employee.averageActivityTime),
                employee.overtimeCount,
                this.formatDurationForExcel(employee.totalOvertime),
                employee.attendanceDaysCount,
                this.getActivityName(employee.mostUsedActivity)
            ]);

            // 設置效率評分顏色
            const efficiencyCell = row.getCell(2);
            if (employee.efficiency >= 80) {
                efficiencyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
                efficiencyCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (employee.efficiency >= 60) {
                efficiencyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF39C12' } };
                efficiencyCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else {
                efficiencyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE74C3C' } };
                efficiencyCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            }

            // 居中對齊數字欄位
            [2, 3, 5, 6, 8].forEach(colIndex => {
                row.getCell(colIndex).alignment = { horizontal: 'center' };
            });

            // 員工姓名加粗
            row.getCell(1).font = { bold: true, color: { argb: 'FF2C3E50' } };
        });

        const lastRow = worksheet.lastRow.number;
        this.addBorders(worksheet, `A3:I${lastRow}`);
    }

    /**
     * 創建活動明細工作表
     */
    async createActivityDetailsSheet(workbook, statsData) {
        const worksheet = workbook.addWorksheet('📊 活動明細', {
            tabColor: { argb: 'FFF39C12' }
        });

        // 設置列寬
        worksheet.columns = [
            { key: 'employee', width: 15 },
            { key: 'activity', width: 15 },
            { key: 'count', width: 10 },
            { key: 'totalDuration', width: 15 },
            { key: 'avgDuration', width: 15 },
            { key: 'maxDuration', width: 15 },
            { key: 'minDuration', width: 15 },
            { key: 'overtimeCount', width: 12 },
            { key: 'overtimeTotal', width: 15 }
        ];

        // 標題
        worksheet.mergeCells('A1:I1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = '📊 活動明細統計';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2C3E50' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF5E7' } };

        worksheet.addRow([]);

        // 表頭
        const headerRow = worksheet.addRow([
            '👤 員工姓名',
            '📝 活動類型',
            '📊 次數',
            '⏱️ 總時間',
            '📊 平均時間',
            '📈 最長時間',
            '📉 最短時間',
            '❌ 超時次數',
            '⚠️ 超時時間'
        ]);
        
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF39C12' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // 活動明細數據
        Object.values(statsData.employees).forEach(employee => {
            Object.entries(employee.activities).forEach(([activityType, activityStats]) => {
                const row = worksheet.addRow([
                    employee.userName,
                    this.getActivityName(activityType),
                    activityStats.count,
                    this.formatDurationForExcel(activityStats.totalDuration),
                    this.formatDurationForExcel(activityStats.averageDuration),
                    this.formatDurationForExcel(activityStats.maxDuration),
                    this.formatDurationForExcel(activityStats.minDuration),
                    activityStats.overtimeCount,
                    this.formatDurationForExcel(activityStats.totalOvertime)
                ]);

                // 員工姓名加粗
                row.getCell(1).font = { bold: true, color: { argb: 'FF2C3E50' } };
                
                // 活動類型加粗
                row.getCell(2).font = { bold: true, color: { argb: 'FF34495E' } };

                // 數字欄位居中
                [3, 4, 5, 6, 7, 8, 9].forEach(colIndex => {
                    row.getCell(colIndex).alignment = { horizontal: 'center' };
                });

                // 超時數據標紅
                if (activityStats.overtimeCount > 0) {
                    row.getCell(8).font = { color: { argb: 'FFE74C3C' }, bold: true };
                    row.getCell(9).font = { color: { argb: 'FFE74C3C' }, bold: true };
                }
            });
        });

        const lastRow = worksheet.lastRow.number;
        this.addBorders(worksheet, `A3:I${lastRow}`);
    }

    /**
     * 創建時段分析工作表
     */
    async createHourlyAnalysisSheet(workbook, statsData) {
        const worksheet = workbook.addWorksheet('🕐 時段分析', {
            tabColor: { argb: 'FF9B59B6' }
        });

        // 設置列寬
        const columns = [{ key: 'employee', width: 15 }];
        for (let hour = 0; hour < 24; hour++) {
            columns.push({ key: `hour${hour}`, width: 8 });
        }
        worksheet.columns = columns;

        // 標題
        worksheet.mergeCells('A1:Y1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = '🕐 24小時活動分析';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2C3E50' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F1FB' } };

        worksheet.addRow([]);

        // 表頭
        const headers = ['👤 員工姓名'];
        for (let hour = 0; hour < 24; hour++) {
            headers.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        const headerRow = worksheet.addRow(headers);
        
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B59B6' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // 時段數據
        Object.values(statsData.employees).forEach(employee => {
            const rowData = [employee.userName];
            employee.hourlyBreakdown.forEach(count => {
                rowData.push(count || 0);
            });
            
            const row = worksheet.addRow(rowData);
            row.getCell(1).font = { bold: true, color: { argb: 'FF2C3E50' } };
            
            // 為活動數據添加熱力圖效果
            for (let col = 2; col <= 25; col++) {
                const cell = row.getCell(col);
                const value = cell.value || 0;
                cell.alignment = { horizontal: 'center' };
                
                if (value > 0) {
                    const intensity = Math.min(value / 5, 1); // 最大值為5次活動
                    const green = Math.floor(255 * (1 - intensity));
                    const red = Math.floor(255 * intensity);
                    cell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: `FF${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}00` }
                    };
                    if (intensity > 0.5) {
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                    }
                }
            }
        });

        const lastRow = worksheet.lastRow.number;
        this.addBorders(worksheet, `A3:Y${lastRow}`);
    }

    /**
     * 創建即時狀態工作表
     */
    async createLiveStatusSheet(workbook, statsData) {
        const worksheet = workbook.addWorksheet('🔴 即時狀態', {
            tabColor: { argb: 'FFE74C3C' }
        });

        // 設置列寬
        worksheet.columns = [
            { key: 'employee', width: 15 },
            { key: 'activity', width: 15 },
            { key: 'duration', width: 15 },
            { key: 'status', width: 12 },
            { key: 'startTime', width: 20 }
        ];

        // 標題
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = '🔴 目前活動狀態';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2C3E50' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEDEC' } };

        worksheet.addRow([]);

        if (statsData.ongoingActivities.length === 0) {
            worksheet.addRow(['📋 目前沒有員工在進行活動', '', '', '', '']);
            worksheet.mergeCells('A3:E3');
            const noActivityCell = worksheet.getCell('A3');
            noActivityCell.alignment = { horizontal: 'center' };
            noActivityCell.font = { italic: true, color: { argb: 'FF7F8C8D' } };
            return;
        }

        // 表頭
        const headerRow = worksheet.addRow([
            '👤 員工姓名',
            '📝 活動類型',
            '⏱️ 活動時長',
            '🚦 狀態',
            '🕐 開始時間'
        ]);
        
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE74C3C' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // 即時狀態數據
        statsData.ongoingActivities.forEach(activity => {
            const status = this.getActivityStatus(activity.activityType, activity.duration);
            const statusText = status === 'overtime' ? '🚨 超時' : 
                             status === 'warning' ? '⚠️ 接近超時' : '✅ 正常';
            
            const row = worksheet.addRow([
                activity.userName,
                this.getActivityName(activity.activityType),
                this.formatDurationForExcel(activity.duration),
                statusText,
                moment(activity.startTime).tz(this.timezone).format('YYYY-MM-DD HH:mm:ss')
            ]);

            // 員工姓名加粗
            row.getCell(1).font = { bold: true, color: { argb: 'FF2C3E50' } };
            
            // 狀態顏色
            const statusCell = row.getCell(4);
            if (status === 'overtime') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE74C3C' } };
                statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (status === 'warning') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF39C12' } };
                statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
                statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            }
            
            // 居中對齊
            [2, 3, 4, 5].forEach(colIndex => {
                row.getCell(colIndex).alignment = { horizontal: 'center' };
            });
        });

        const lastRow = worksheet.lastRow.number;
        this.addBorders(worksheet, `A3:E${lastRow}`);
    }

    /**
     * 創建日期分析工作表
     */
    async createDailyBreakdownSheet(workbook, statsData) {
        const worksheet = workbook.addWorksheet('📅 日期分析', {
            tabColor: { argb: 'FF17A2B8' }
        });

        // 收集所有日期
        const allDates = new Set();
        Object.values(statsData.employees).forEach(employee => {
            Object.keys(employee.dailyBreakdown).forEach(date => {
                allDates.add(date);
            });
        });
        
        const sortedDates = Array.from(allDates).sort();

        // 設置列寬
        const columns = [{ key: 'employee', width: 15 }];
        sortedDates.forEach((date, index) => {
            columns.push({ key: `date${index}`, width: 12 });
        });
        worksheet.columns = columns;

        // 標題
        worksheet.mergeCells(`A1:${String.fromCharCode(65 + sortedDates.length)}1`);
        const titleCell = worksheet.getCell('A1');
        titleCell.value = '📅 每日活動分析';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2C3E50' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F8F5' } };

        worksheet.addRow([]);

        // 表頭
        const headers = ['👤 員工姓名'];
        sortedDates.forEach(date => {
            headers.push(moment(date).format('MM/DD'));
        });
        const headerRow = worksheet.addRow(headers);
        
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17A2B8' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // 日期數據
        Object.values(statsData.employees).forEach(employee => {
            const rowData = [employee.userName];
            sortedDates.forEach(date => {
                const dayData = employee.dailyBreakdown[date];
                rowData.push(dayData ? dayData.activities : 0);
            });
            
            const row = worksheet.addRow(rowData);
            row.getCell(1).font = { bold: true, color: { argb: 'FF2C3E50' } };
            
            // 為活動數據添加顏色
            for (let col = 2; col <= sortedDates.length + 1; col++) {
                const cell = row.getCell(col);
                const value = cell.value || 0;
                cell.alignment = { horizontal: 'center' };
                
                if (value > 0) {
                    const intensity = Math.min(value / 10, 1); // 最大值為10次活動
                    const blue = Math.floor(255 * intensity);
                    cell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: `FF${(255-blue).toString(16).padStart(2, '0')}${(255-blue).toString(16).padStart(2, '0')}FF` }
                    };
                    if (intensity > 0.5) {
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                    }
                }
            }
        });

        const lastRow = worksheet.lastRow.number;
        this.addBorders(worksheet, `A3:${String.fromCharCode(65 + sortedDates.length)}${lastRow}`);
    }

    /**
     * 添加邊框
     */
    addBorders(worksheet, range) {
        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        
        worksheet.getCell(range).border = borderStyle;
        
        // 為範圍內的所有儲存格添加邊框
        const cells = worksheet.getCell(range);
        if (cells.isMerged) {
            return;
        }
        
        // 解析範圍
        const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (match) {
            const [, startCol, startRow, endCol, endRow] = match;
            const startColNum = this.columnToNumber(startCol);
            const endColNum = this.columnToNumber(endCol);
            
            for (let row = parseInt(startRow); row <= parseInt(endRow); row++) {
                for (let col = startColNum; col <= endColNum; col++) {
                    const cellRef = this.numberToColumn(col) + row;
                    worksheet.getCell(cellRef).border = borderStyle;
                }
            }
        }
    }

    /**
     * 列號轉數字
     */
    columnToNumber(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result;
    }

    /**
     * 數字轉列號
     */
    numberToColumn(number) {
        let result = '';
        while (number > 0) {
            number--;
            result = String.fromCharCode(65 + (number % 26)) + result;
            number = Math.floor(number / 26);
        }
        return result;
    }

    /**
     * 格式化時間給 Excel
     */
    formatDurationForExcel(seconds) {
        if (!seconds || seconds < 0) return '0分0秒';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}分${remainingSeconds}秒`;
    }

    /**
     * 獲取活動名稱
     */
    getActivityName(activityType) {
        const names = {
            toilet: '🚽 上廁所',
            smoking: '🚬 抽菸',
            poop_10: '💩 大便(10分)',
            poop_15: '💩 大便(15分)',
            phone: '📱 使用手機'
        };
        return names[activityType] || activityType;
    }

    /**
     * 獲取活動狀態
     */
    getActivityStatus(activityType, duration) {
        const limits = {
            toilet: 6 * 60,
            smoking: 5 * 60,
            poop_10: 10 * 60,
            poop_15: 15 * 60,
            phone: 10 * 60
        };

        const limit = limits[activityType] || 5 * 60;
        const percentage = (duration / limit) * 100;

        if (percentage < 70) return 'normal';
        if (percentage < 100) return 'warning';
        return 'overtime';
    }
}

module.exports = ExcelReportGenerator;