import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Card, Button, ActivityIndicator, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import {
  CommitteeIncomeService,
  CommitteeExpensesService,
  FeePaymentsService,
  MeterReadingsService,
  ChargingStationsService,
  SettingsService,
  CommitteeIncome,
  CommitteeExpense,
  FeePayment,
  MeterReading,
  ChargingStation,
  Settings
} from '../services/firebaseService';

export default function ReportsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<CommitteeIncome[]>([]);
  const [expenses, setExpenses] = useState<CommitteeExpense[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedExportYear, setSelectedExportYear] = useState(new Date().getFullYear());

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const loadData = async () => {
    try {
      const [incomesData, expensesData, feePaymentsData, meterReadingsData, stationsData, settingsData] = await Promise.all([
        CommitteeIncomeService.getAll(),
        CommitteeExpensesService.getAll(),
        FeePaymentsService.getAll(),
        MeterReadingsService.getAll(),
        ChargingStationsService.getAll(),
        SettingsService.get(),
      ]);
      setIncomes(incomesData);
      setExpenses(expensesData);
      setFeePayments(feePaymentsData);
      setMeterReadings(meterReadingsData);
      setStations(stationsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Calculate selected month data
  const filteredIncomes = incomes.filter(i => {
    const date = i.date instanceof Date ? i.date : new Date(i.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear && i.isPaid;
  });

  const filteredExpenses = expenses.filter(e => {
    const date = e.date instanceof Date ? e.date : new Date(e.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const filteredFeePayments = feePayments.filter(p => {
    if (!p.isPaid || !p.paymentDate) return false;
    const date = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const filteredMeterReadings = meterReadings.filter(r =>
    r.month === selectedMonth + 1 && r.year === selectedYear && r.isPaid
  );

  const totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0) +
                      filteredFeePayments.reduce((sum, p) => sum + p.amount, 0) +
                      filteredMeterReadings.reduce((sum, r) => sum + r.totalCost, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Calculate cumulative balance (initial balance + paid incomes - expenses)
  const initialBalance = settings?.personalBalance || 0;
  const allPaidIncomes = incomes.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
  const allPaidFees = feePayments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
  const allPaidCharging = meterReadings.filter(r => r.isPaid).reduce((sum, r) => sum + r.totalCost, 0);
  const totalAllIncome = allPaidIncomes + allPaidFees + allPaidCharging;
  const totalAllExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cumulativeBalance = initialBalance + totalAllIncome - totalAllExpenses;

  const handleExportPDF = async () => {
    try {
      // Build detailed data like Excel
      const detailedData: { date: string; category: string; description: string; type: string; amount: number }[] = [];

      // Add incomes
      filteredIncomes.forEach(income => {
        const date = income.date instanceof Date ? income.date : new Date(income.date);
        detailedData.push({
          date: date.toLocaleDateString('he-IL'),
          category: income.category,
          description: income.description,
          type: 'הכנסה',
          amount: income.amount
        });
      });

      // Add fee payments
      filteredFeePayments.forEach(payment => {
        const date = payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate);
        detailedData.push({
          date: date.toLocaleDateString('he-IL'),
          category: 'דמי ועד',
          description: `תשלום - ${payment.residentName}`,
          type: 'הכנסה',
          amount: payment.amount
        });
      });

      // Add charging bills
      filteredMeterReadings.forEach(reading => {
        const station = stations.find(s => s.id === reading.stationId);
        const date = reading.readingDate instanceof Date ? reading.readingDate : new Date(reading.readingDate);
        detailedData.push({
          date: date.toLocaleDateString('he-IL'),
          category: 'עמדות טעינה',
          description: `חשבון טעינה - ${station?.residentName || 'לא ידוע'}`,
          type: 'הכנסה',
          amount: reading.totalCost
        });
      });

      // Add expenses
      filteredExpenses.forEach(expense => {
        const date = expense.date instanceof Date ? expense.date : new Date(expense.date);
        detailedData.push({
          date: date.toLocaleDateString('he-IL'),
          category: expense.category,
          description: expense.description,
          type: 'הוצאה',
          amount: expense.amount
        });
      });

      // Sort by date descending
      detailedData.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });

      // Build transactions table HTML
      const transactionsHtml = detailedData.map(item => `
        <tr>
          <td>${item.date}</td>
          <td>${item.category}</td>
          <td>${item.description}</td>
          <td style="color: ${item.type === 'הכנסה' ? '#4CAF50' : '#f44336'}">${item.type}</td>
          <td style="color: ${item.type === 'הכנסה' ? '#4CAF50' : '#f44336'}; font-weight: bold;">
            ${item.type === 'הכנסה' ? '+' : '-'}₪${item.amount.toLocaleString()}
          </td>
        </tr>
      `).join('');

      // Create HTML content for the PDF
      const html = `
        <html dir="rtl">
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                direction: rtl;
              }
              h1 {
                color: #FF9800;
                text-align: center;
                margin-bottom: 10px;
              }
              h2 {
                color: #666;
                text-align: center;
                font-size: 16px;
                margin-bottom: 20px;
              }
              .summary {
                margin: 20px 0;
                padding: 15px;
                background-color: #f5f5f5;
                border-radius: 8px;
              }
              .row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 8px;
                border-bottom: 1px solid #ddd;
              }
              .label {
                font-weight: bold;
              }
              .transactions-section {
                margin: 30px 0;
              }
              .section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #333;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              th {
                background-color: #FF9800;
                color: white;
                padding: 12px 8px;
                text-align: right;
                font-weight: bold;
              }
              td {
                padding: 10px 8px;
                border-bottom: 1px solid #eee;
                text-align: right;
              }
              tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
              .no-data {
                text-align: center;
                color: #999;
                padding: 20px;
              }
            </style>
          </head>
          <body>
            <h1>דוח כספי חודשי</h1>
            <h2>${monthNames[selectedMonth]} ${selectedYear}</h2>

            <div class="summary">
              <div class="row">
                <span class="label">תאריך הפקה:</span>
                <span>${new Date().toLocaleDateString('he-IL')}</span>
              </div>
              <div class="row">
                <span class="label">סה"כ הכנסות:</span>
                <span style="color: #4CAF50; font-weight: bold;">₪${totalIncome.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">סה"כ הוצאות:</span>
                <span style="color: #f44336; font-weight: bold;">₪${totalExpenses.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">מאזן חודשי:</span>
                <span style="color: ${balance >= 0 ? '#4CAF50' : '#f44336'}; font-weight: bold; font-size: 18px;">
                  ${balance >= 0 ? '+' : ''}₪${balance.toLocaleString()}
                </span>
              </div>
            </div>

            <div class="transactions-section">
              <div class="section-title">פירוט עסקאות (${detailedData.length})</div>
              ${detailedData.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th>תאריך</th>
                      <th>קטגוריה</th>
                      <th>תיאור</th>
                      <th>סוג</th>
                      <th>סכום</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${transactionsHtml}
                  </tbody>
                </table>
              ` : '<p class="no-data">אין עסקאות בחודש זה</p>'}
            </div>

            <div class="footer">
              <p>נוצר באמצעות אפליקציית ועד בית</p>
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        // For web: open print dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        // For mobile: use expo-print
        const { uri } = await Print.printToFileAsync({ html });

        // Share the PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
          });
        } else {
          Alert.alert('הצלחה', 'הקובץ נשמר בהצלחה');
        }
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      if (Platform.OS === 'web') {
        window.alert('אירעה שגיאה בייצוא ל-PDF');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בייצוא ל-PDF');
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      // Build data from real transactions
      const data: any[] = [];

      // Add incomes
      filteredIncomes.forEach(income => {
        const date = income.date instanceof Date ? income.date : new Date(income.date);
        data.push({
          תאריך: date.toLocaleDateString('he-IL'),
          קטגוריה: income.category,
          תיאור: income.description,
          סוג: 'הכנסה',
          סכום: income.amount
        });
      });

      // Add fee payments
      filteredFeePayments.forEach(payment => {
        const date = payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate);
        data.push({
          תאריך: date.toLocaleDateString('he-IL'),
          קטגוריה: 'דמי ועד',
          תיאור: `תשלום - ${payment.residentName}`,
          סוג: 'הכנסה',
          סכום: payment.amount
        });
      });

      // Add charging bills
      filteredMeterReadings.forEach(reading => {
        const station = stations.find(s => s.id === reading.stationId);
        const date = reading.readingDate instanceof Date ? reading.readingDate : new Date(reading.readingDate);
        data.push({
          תאריך: date.toLocaleDateString('he-IL'),
          קטגוריה: 'עמדות טעינה',
          תיאור: `חשבון טעינה - ${station?.residentName || 'לא ידוע'}`,
          סוג: 'הכנסה',
          סכום: reading.totalCost
        });
      });

      // Add expenses
      filteredExpenses.forEach(expense => {
        const date = expense.date instanceof Date ? expense.date : new Date(expense.date);
        data.push({
          תאריך: date.toLocaleDateString('he-IL'),
          קטגוריה: expense.category,
          תיאור: expense.description,
          סוג: 'הוצאה',
          סכום: -expense.amount
        });
      });

      // Sort by date
      data.sort((a, b) => {
        const dateA = new Date(a.תאריך.split('/').reverse().join('-'));
        const dateB = new Date(b.תאריך.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });

      if (data.length === 0) {
        if (Platform.OS === 'web') {
          window.alert('אין נתונים לייצוא בחודש הנוכחי');
        } else {
          Alert.alert('אין נתונים', 'אין נתונים לייצוא בחודש הנוכחי');
        }
        return;
      }

      // Create a new workbook
      const ws = XLSX.utils.json_to_sheet(data);

      // Add summary rows
      const summaryStartRow = data.length + 2; // Leave one empty row
      XLSX.utils.sheet_add_aoa(ws, [
        [''], // Empty row
        [`סיכום חודשי - ${monthNames[selectedMonth]} ${selectedYear}`, '', '', '', ''],
        ['סה"כ הכנסות:', '', '', '', totalIncome],
        ['סה"כ הוצאות:', '', '', '', totalExpenses],
        ['מאזן:', '', '', '', balance],
      ], { origin: summaryStartRow });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'דוח חודשי');

      if (Platform.OS === 'web') {
        // For web: download directly
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `דוח_כספי_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For mobile: use file system and sharing
        const FileSystem = require('expo-file-system/legacy');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.documentDirectory + 'דוח_כספי_' + Date.now() + '.xlsx';
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Share the Excel file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            UTI: 'com.microsoft.excel.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        } else {
          Alert.alert('הצלחה', 'הקובץ נשמר בהצלחה');
        }
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
      if (Platform.OS === 'web') {
        window.alert('אירעה שגיאה בייצוא ל-Excel');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בייצוא ל-Excel');
      }
    }
  };

  // Get available years from data
  const getAvailableYears = () => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    // Add years from incomes
    incomes.forEach(i => {
      const date = i.date instanceof Date ? i.date : new Date(i.date);
      years.add(date.getFullYear());
    });

    // Add years from expenses
    expenses.forEach(e => {
      const date = e.date instanceof Date ? e.date : new Date(e.date);
      years.add(date.getFullYear());
    });

    // Add years from fee payments
    feePayments.forEach(p => {
      if (p.paymentDate) {
        const date = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
        years.add(date.getFullYear());
      }
    });

    // Add years from meter readings
    meterReadings.forEach(r => {
      years.add(r.year);
    });

    // Always include current year
    years.add(currentYear);

    // Sort descending
    return Array.from(years).sort((a, b) => b - a);
  };

  const handleExportYearlyPDF = async () => {
    setShowYearPicker(false);
    try {
      // Filter data for selected year
      const yearIncomes = incomes.filter(i => {
        const date = i.date instanceof Date ? i.date : new Date(i.date);
        return date.getFullYear() === selectedExportYear && i.isPaid;
      });

      const yearExpenses = expenses.filter(e => {
        const date = e.date instanceof Date ? e.date : new Date(e.date);
        return date.getFullYear() === selectedExportYear;
      });

      const yearFeePayments = feePayments.filter(p => {
        if (!p.isPaid || !p.paymentDate) return false;
        const date = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
        return date.getFullYear() === selectedExportYear;
      });

      const yearMeterReadings = meterReadings.filter(r =>
        r.year === selectedExportYear && r.isPaid
      );

      // Calculate totals
      const totalYearIncomes = yearIncomes.reduce((sum, i) => sum + i.amount, 0);
      const totalYearFees = yearFeePayments.reduce((sum, p) => sum + p.amount, 0);
      const totalYearCharging = yearMeterReadings.reduce((sum, r) => sum + r.totalCost, 0);
      const totalYearIncome = totalYearIncomes + totalYearFees + totalYearCharging;
      const totalYearExpenses = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
      const yearBalance = totalYearIncome - totalYearExpenses;

      // Group by month for detailed breakdown
      const monthlyData = monthNames.map((monthName, monthIndex) => {
        const monthIncomes = yearIncomes.filter(i => {
          const date = i.date instanceof Date ? i.date : new Date(i.date);
          return date.getMonth() === monthIndex;
        }).reduce((sum, i) => sum + i.amount, 0);

        const monthFees = yearFeePayments.filter(p => {
          const date = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
          return date.getMonth() === monthIndex;
        }).reduce((sum, p) => sum + p.amount, 0);

        const monthCharging = yearMeterReadings.filter(r => r.month === monthIndex + 1)
          .reduce((sum, r) => sum + r.totalCost, 0);

        const monthExpenses = yearExpenses.filter(e => {
          const date = e.date instanceof Date ? e.date : new Date(e.date);
          return date.getMonth() === monthIndex;
        }).reduce((sum, e) => sum + e.amount, 0);

        const monthTotal = monthIncomes + monthFees + monthCharging;

        return {
          month: monthName,
          income: monthTotal,
          expenses: monthExpenses,
          balance: monthTotal - monthExpenses
        };
      });

      // Build monthly breakdown HTML
      const monthlyHtml = monthlyData.map(m => `
        <div class="month-row">
          <span class="month-name">${m.month}</span>
          <span class="income">₪${m.income.toLocaleString()}</span>
          <span class="expense">₪${m.expenses.toLocaleString()}</span>
          <span class="balance" style="color: ${m.balance >= 0 ? '#4CAF50' : '#f44336'}">${m.balance >= 0 ? '+' : ''}₪${m.balance.toLocaleString()}</span>
        </div>
      `).join('');

      const html = `
        <html dir="rtl">
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                direction: rtl;
              }
              h1 {
                color: #9C27B0;
                text-align: center;
                margin-bottom: 10px;
              }
              h2 {
                color: #666;
                text-align: center;
                font-size: 18px;
                margin-bottom: 30px;
              }
              .summary {
                margin: 20px 0;
                padding: 20px;
                background-color: #f5f5f5;
                border-radius: 8px;
              }
              .summary-row {
                display: flex;
                justify-content: space-between;
                margin: 12px 0;
                padding: 10px;
                border-bottom: 1px solid #ddd;
                font-size: 16px;
              }
              .label {
                font-weight: bold;
              }
              .monthly-section {
                margin: 30px 0;
              }
              .section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #333;
              }
              .month-header {
                display: flex;
                justify-content: space-between;
                padding: 10px;
                background-color: #9C27B0;
                color: white;
                font-weight: bold;
                border-radius: 4px 4px 0 0;
              }
              .month-row {
                display: flex;
                justify-content: space-between;
                padding: 10px;
                border-bottom: 1px solid #eee;
                background-color: #fff;
              }
              .month-row:last-child {
                border-radius: 0 0 4px 4px;
              }
              .month-name { width: 25%; }
              .income { width: 25%; text-align: center; color: #4CAF50; }
              .expense { width: 25%; text-align: center; color: #f44336; }
              .balance { width: 25%; text-align: left; font-weight: bold; }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <h1>דוח שנתי ${selectedExportYear}</h1>
            <h2>סיכום כספי שנתי</h2>

            <div class="summary">
              <div class="summary-row">
                <span class="label">סה"כ הכנסות מדמי ועד:</span>
                <span style="color: #4CAF50;">₪${totalYearFees.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ הכנסות מטעינה:</span>
                <span style="color: #4CAF50;">₪${totalYearCharging.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ הכנסות אחרות:</span>
                <span style="color: #4CAF50;">₪${totalYearIncomes.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ כל ההכנסות:</span>
                <span style="color: #4CAF50; font-weight: bold;">₪${totalYearIncome.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ הוצאות:</span>
                <span style="color: #f44336; font-weight: bold;">₪${totalYearExpenses.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="label">מאזן שנתי:</span>
                <span style="color: ${yearBalance >= 0 ? '#4CAF50' : '#f44336'}; font-weight: bold; font-size: 18px;">${yearBalance >= 0 ? '+' : ''}₪${yearBalance.toLocaleString()}</span>
              </div>
            </div>

            <div class="monthly-section">
              <div class="section-title">פירוט חודשי</div>
              <div class="month-header">
                <span class="month-name">חודש</span>
                <span style="width: 25%; text-align: center;">הכנסות</span>
                <span style="width: 25%; text-align: center;">הוצאות</span>
                <span style="width: 25%; text-align: left;">מאזן</span>
              </div>
              ${monthlyHtml}
            </div>

            <div class="footer">
              <p>נוצר באמצעות אפליקציית ועד בית</p>
              <p>תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}</p>
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
          });
        } else {
          Alert.alert('הצלחה', 'הדוח נשמר בהצלחה');
        }
      }
    } catch (error) {
      console.error('Error exporting yearly PDF:', error);
      if (Platform.OS === 'web') {
        window.alert('אירעה שגיאה בייצוא הדוח השנתי');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בייצוא הדוח השנתי');
      }
    }
  };

  const handleExportYearlyExcel = async () => {
    setShowYearPicker(false);
    try {
      // Filter data for selected year
      const yearIncomes = incomes.filter(i => {
        const date = i.date instanceof Date ? i.date : new Date(i.date);
        return date.getFullYear() === selectedExportYear && i.isPaid;
      });

      const yearExpenses = expenses.filter(e => {
        const date = e.date instanceof Date ? e.date : new Date(e.date);
        return date.getFullYear() === selectedExportYear;
      });

      const yearFeePayments = feePayments.filter(p => {
        if (!p.isPaid || !p.paymentDate) return false;
        const date = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
        return date.getFullYear() === selectedExportYear;
      });

      const yearMeterReadings = meterReadings.filter(r =>
        r.year === selectedExportYear && r.isPaid
      );

      // Build detailed data
      const data: any[] = [];

      // Add incomes
      yearIncomes.forEach(income => {
        const date = income.date instanceof Date ? income.date : new Date(income.date);
        data.push({
          תאריך: date.toLocaleDateString('he-IL'),
          חודש: monthNames[date.getMonth()],
          קטגוריה: income.category,
          תיאור: income.description,
          סוג: 'הכנסה',
          סכום: income.amount
        });
      });

      // Add fee payments
      yearFeePayments.forEach(payment => {
        const date = payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate);
        data.push({
          תאריך: date.toLocaleDateString('he-IL'),
          חודש: monthNames[date.getMonth()],
          קטגוריה: 'דמי ועד',
          תיאור: `תשלום - ${payment.residentName}`,
          סוג: 'הכנסה',
          סכום: payment.amount
        });
      });

      // Add charging bills
      yearMeterReadings.forEach(reading => {
        const station = stations.find(s => s.id === reading.stationId);
        const date = reading.readingDate instanceof Date ? reading.readingDate : new Date(reading.readingDate);
        data.push({
          תאריך: date.toLocaleDateString('he-IL'),
          חודש: monthNames[reading.month - 1],
          קטגוריה: 'עמדות טעינה',
          תיאור: `חשבון טעינה - ${station?.residentName || 'לא ידוע'}`,
          סוג: 'הכנסה',
          סכום: reading.totalCost
        });
      });

      // Add expenses
      yearExpenses.forEach(expense => {
        const date = expense.date instanceof Date ? expense.date : new Date(expense.date);
        data.push({
          תאריך: date.toLocaleDateString('he-IL'),
          חודש: monthNames[date.getMonth()],
          קטגוריה: expense.category,
          תיאור: expense.description,
          סוג: 'הוצאה',
          סכום: -expense.amount
        });
      });

      // Sort by date
      data.sort((a, b) => {
        const dateA = new Date(a.תאריך.split('/').reverse().join('-'));
        const dateB = new Date(b.תאריך.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });

      if (data.length === 0) {
        if (Platform.OS === 'web') {
          window.alert(`אין נתונים לייצוא בשנת ${selectedExportYear}`);
        } else {
          Alert.alert('אין נתונים', `אין נתונים לייצוא בשנת ${selectedExportYear}`);
        }
        return;
      }

      // Calculate totals
      const totalIncome = data.filter(d => d.סוג === 'הכנסה').reduce((sum, d) => sum + d.סכום, 0);
      const totalExpense = data.filter(d => d.סוג === 'הוצאה').reduce((sum, d) => sum + Math.abs(d.סכום), 0);
      const balance = totalIncome - totalExpense;

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Add summary
      const summaryStartRow = data.length + 3;
      XLSX.utils.sheet_add_aoa(ws, [
        [''],
        [`סיכום שנתי - ${selectedExportYear}`, '', '', '', '', ''],
        ['סה"כ הכנסות:', '', '', '', '', totalIncome],
        ['סה"כ הוצאות:', '', '', '', '', totalExpense],
        ['מאזן שנתי:', '', '', '', '', balance],
      ], { origin: summaryStartRow });

      // Add monthly summary sheet
      const monthlyData = monthNames.map((monthName, monthIndex) => {
        const monthIncome = data.filter(d => d.חודש === monthName && d.סוג === 'הכנסה')
          .reduce((sum, d) => sum + d.סכום, 0);
        const monthExpense = data.filter(d => d.חודש === monthName && d.סוג === 'הוצאה')
          .reduce((sum, d) => sum + Math.abs(d.סכום), 0);
        return {
          חודש: monthName,
          הכנסות: monthIncome,
          הוצאות: monthExpense,
          מאזן: monthIncome - monthExpense
        };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'פירוט שנתי');

      const monthlyWs = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, monthlyWs, 'סיכום חודשי');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `דוח_שנתי_${selectedExportYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = require('expo-file-system/legacy');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.documentDirectory + `דוח_שנתי_${selectedExportYear}_${Date.now()}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            UTI: 'com.microsoft.excel.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        } else {
          Alert.alert('הצלחה', 'הקובץ נשמר בהצלחה');
        }
      }
    } catch (error) {
      console.error('Error exporting yearly Excel:', error);
      if (Platform.OS === 'web') {
        window.alert('אירעה שגיאה בייצוא הדוח השנתי');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בייצוא הדוח השנתי');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>טוען נתונים...</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>דוחות וניתוחים</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>דוחות זמינים</Text>

        <Card style={styles.reportCard}>
          <Card.Content>
            <Text style={styles.reportTitle}>📊 דוח חודשי</Text>
            <Text style={styles.reportDesc}>סיכום הכנסות והוצאות החודש הנוכחי</Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="text" onPress={() => navigation.navigate('MonthlyReport')}>
              צפה בדוח
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.reportCard}>
          <Card.Content>
            <Text style={styles.reportTitle}>🏢 דוח ועד</Text>
            <Text style={styles.reportDesc}>דוח פיננסי מפורט עם יתרה מצטברת - ניתן לעבור בין חודשים</Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="text" onPress={() => navigation.navigate('CommitteeReport')}>
              צפה בדוח
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.reportCard}>
          <Card.Content>
            <Text style={styles.reportTitle}>⚡ דוח עמדות טעינה חודשי</Text>
            <Text style={styles.reportDesc}>צריכת חשמל ותשלומים לפי חודש</Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="text" onPress={() => navigation.navigate('ChargingStationReport')}>
              צפה בדוח
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.reportCard}>
          <Card.Content>
            <Text style={styles.reportTitle}>⚡ דוח עמדות טעינה שנתי</Text>
            <Text style={styles.reportDesc}>סיכום שנתי של צריכת חשמל ותשלומים</Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="text" onPress={() => navigation.navigate('YearlyChargingStationReport')}>
              צפה בדוח
            </Button>
          </Card.Actions>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ייצוא</Text>

        {/* Month Selector */}
        <Card style={styles.monthCard}>
          <Card.Content>
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={handleNextMonth}>
                <MaterialCommunityIcons name="chevron-left" size={32} color="#666" />
              </TouchableOpacity>
              <Text style={styles.monthText}>{monthNames[selectedMonth]} {selectedYear}</Text>
              <TouchableOpacity onPress={handlePreviousMonth}>
                <MaterialCommunityIcons name="chevron-right" size={32} color="#666" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Cumulative Balance Card */}
        <Card style={[styles.balanceCard, cumulativeBalance < 0 && styles.negativeBalanceCard]}>
          <Card.Content>
            <View style={styles.balanceRow}>
              <MaterialCommunityIcons
                name="bank"
                size={28}
                color={cumulativeBalance >= 0 ? '#1976D2' : '#f44336'}
              />
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>יתרה כוללת בקופה</Text>
                <Text style={[
                  styles.balanceAmount,
                  { color: cumulativeBalance >= 0 ? '#1976D2' : '#f44336' }
                ]}>
                  ₪{cumulativeBalance.toLocaleString()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.exportCard}>
          <Card.Content>
            <Text style={styles.exportText}>ייצא נתונים לחודש {monthNames[selectedMonth]} {selectedYear}</Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="text" icon="file-pdf-box" onPress={handleExportPDF}>
              PDF
            </Button>
            <Button mode="text" icon="file-excel" onPress={handleExportExcel}>
              Excel
            </Button>
          </Card.Actions>
        </Card>

        {/* Yearly Export Card */}
        <Card style={styles.yearlyExportCard}>
          <Card.Content>
            <View style={styles.yearlyExportHeader}>
              <MaterialCommunityIcons name="calendar-multiple" size={24} color="#9C27B0" />
              <Text style={styles.yearlyExportTitle}>ייצוא דוח שנתי</Text>
            </View>
            <Text style={styles.yearlyExportDesc}>סיכום כל ההכנסות וההוצאות לשנה שלמה</Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" icon="file-export" onPress={() => setShowYearPicker(true)} buttonColor="#9C27B0">
              בחר שנה לייצוא
            </Button>
          </Card.Actions>
        </Card>
      </View>

      {/* Year Picker Modal */}
      <Portal>
        <Modal visible={showYearPicker} onDismiss={() => setShowYearPicker(false)} contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>ייצוא דוח שנתי</Text>
          <Text style={styles.modalSubtitle}>בחר שנה</Text>

          <View style={styles.yearSelector}>
            <TouchableOpacity
              onPress={() => setSelectedExportYear(selectedExportYear + 1)}
              style={styles.yearArrow}
            >
              <MaterialCommunityIcons name="chevron-left" size={32} color="#666" />
            </TouchableOpacity>
            <Text style={styles.selectedYear}>{selectedExportYear}</Text>
            <TouchableOpacity
              onPress={() => setSelectedExportYear(selectedExportYear - 1)}
              style={styles.yearArrow}
            >
              <MaterialCommunityIcons name="chevron-right" size={32} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.availableYears}>
            <Text style={styles.availableYearsLabel}>שנים זמינות:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearsScrollView}>
              {getAvailableYears().map(year => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearChip, selectedExportYear === year && styles.yearChipSelected]}
                  onPress={() => setSelectedExportYear(year)}
                >
                  <Text style={[styles.yearChipText, selectedExportYear === year && styles.yearChipTextSelected]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.exportButtonsRow}>
            <Button
              mode="contained"
              icon="file-pdf-box"
              onPress={handleExportYearlyPDF}
              style={styles.exportModalButton}
              buttonColor="#f44336"
            >
              ייצא PDF
            </Button>
            <Button
              mode="contained"
              icon="microsoft-excel"
              onPress={handleExportYearlyExcel}
              style={styles.exportModalButton}
              buttonColor="#217346"
            >
              ייצא Excel
            </Button>
          </View>

          <Button mode="text" onPress={() => setShowYearPicker(false)} style={styles.cancelButton}>
            ביטול
          </Button>
        </Modal>
      </Portal>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  spacer: {
    height: 32,
  },
  header: {
    padding: 20,
    backgroundColor: '#FF9800',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  reportCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  reportDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  exportCard: {
    backgroundColor: '#fff',
  },
  exportText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  monthCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceCard: {
    backgroundColor: '#E3F2FD',
    marginBottom: 12,
  },
  negativeBalanceCard: {
    backgroundColor: '#FFEBEE',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceInfo: {
    flex: 1,
    marginRight: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  yearlyExportCard: {
    backgroundColor: '#F3E5F5',
    marginTop: 12,
  },
  yearlyExportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
    gap: 8,
  },
  yearlyExportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  yearlyExportDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#9C27B0',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearArrow: {
    padding: 8,
  },
  selectedYear: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginHorizontal: 20,
  },
  availableYears: {
    marginBottom: 20,
  },
  availableYearsLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
  },
  yearsScrollView: {
    flexDirection: 'row',
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  yearChipSelected: {
    backgroundColor: '#9C27B0',
  },
  yearChipText: {
    fontSize: 14,
    color: '#666',
  },
  yearChipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  exportButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  exportModalButton: {
    flex: 1,
  },
  cancelButton: {
    marginTop: 8,
  },
});
