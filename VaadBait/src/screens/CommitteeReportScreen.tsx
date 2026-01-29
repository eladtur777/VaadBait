import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import {
  CommitteeIncomeService,
  CommitteeExpensesService,
  FeePaymentsService,
  MeterReadingsService,
  SettingsService,
  CommitteeIncome,
  CommitteeExpense,
  FeePayment,
  MeterReading,
  Settings
} from '../services/firebaseService';

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export default function CommitteeReportScreen({ navigation }: any) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<CommitteeIncome[]>([]);
  const [expenses, setExpenses] = useState<CommitteeExpense[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const loadData = async () => {
    try {
      const [incomesData, expensesData, feePaymentsData, meterReadingsData, settingsData] = await Promise.all([
        CommitteeIncomeService.getAll(),
        CommitteeExpensesService.getAll(),
        FeePaymentsService.getAll(),
        MeterReadingsService.getAll(),
        SettingsService.get(),
      ]);
      setIncomes(incomesData);
      setExpenses(expensesData);
      setFeePayments(feePaymentsData);
      setMeterReadings(meterReadingsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לטעון את הנתונים');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לטעון את הנתונים');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

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

  // Filter data by selected month
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

  const filteredMeterReadings = meterReadings.filter(r => {
    return r.month === selectedMonth + 1 && r.year === selectedYear && r.isPaid;
  });

  // Calculate monthly totals
  const incomeFromCommittee = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const incomeFromFees = filteredFeePayments.reduce((sum, p) => sum + p.amount, 0);
  const incomeFromCharging = filteredMeterReadings.reduce((sum, r) => sum + r.totalCost, 0);
  const totalMonthlyIncome = incomeFromCommittee + incomeFromFees + incomeFromCharging;
  const totalMonthlyExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlyBalance = totalMonthlyIncome - totalMonthlyExpenses;

  // Calculate cumulative balance (initial balance + paid incomes - expenses)
  const initialBalance = settings?.personalBalance || 0;
  const allPaidIncomes = incomes.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
  const allPaidFees = feePayments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
  const allPaidCharging = meterReadings.filter(r => r.isPaid).reduce((sum, r) => sum + r.totalCost, 0);
  const totalAllIncome = allPaidIncomes + allPaidFees + allPaidCharging;
  const totalAllExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cumulativeBalance = initialBalance + totalAllIncome - totalAllExpenses;

  // Calculate income by category
  const incomeByCategory: CategoryData[] = [];
  if (incomeFromCommittee > 0) {
    const categoryMap = new Map<string, number>();
    filteredIncomes.forEach(i => {
      categoryMap.set(i.category, (categoryMap.get(i.category) || 0) + i.amount);
    });
    categoryMap.forEach((amount, category) => {
      incomeByCategory.push({
        category,
        amount,
        percentage: totalMonthlyIncome > 0 ? Math.round((amount / totalMonthlyIncome) * 100) : 0
      });
    });
  }
  if (incomeFromFees > 0) {
    incomeByCategory.push({
      category: 'דמי ועד',
      amount: incomeFromFees,
      percentage: totalMonthlyIncome > 0 ? Math.round((incomeFromFees / totalMonthlyIncome) * 100) : 0
    });
  }
  if (incomeFromCharging > 0) {
    incomeByCategory.push({
      category: 'עמדות טעינה',
      amount: incomeFromCharging,
      percentage: totalMonthlyIncome > 0 ? Math.round((incomeFromCharging / totalMonthlyIncome) * 100) : 0
    });
  }

  // Calculate expenses by category
  const expensesCategoryMap = new Map<string, number>();
  filteredExpenses.forEach(e => {
    expensesCategoryMap.set(e.category, (expensesCategoryMap.get(e.category) || 0) + e.amount);
  });
  const expensesByCategory: CategoryData[] = [];
  expensesCategoryMap.forEach((amount, category) => {
    expensesByCategory.push({
      category,
      amount,
      percentage: totalMonthlyExpenses > 0 ? Math.round((amount / totalMonthlyExpenses) * 100) : 0
    });
  });
  expensesByCategory.sort((a, b) => b.amount - a.amount);

  const handleExportPDF = async () => {
    try {
      // Build income categories HTML
      const incomeCategoriesHtml = incomeByCategory.map(item =>
        `<div class="category-row">
          <span>${item.category}</span>
          <span>₪${item.amount.toLocaleString()} (${item.percentage}%)</span>
        </div>`
      ).join('');

      // Build expense categories HTML
      const expenseCategoriesHtml = expensesByCategory.map(item =>
        `<div class="category-row">
          <span>${item.category}</span>
          <span>₪${item.amount.toLocaleString()} (${item.percentage}%)</span>
        </div>`
      ).join('');

      // Create HTML content for the committee report PDF
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
                color: #3F51B5;
                text-align: center;
                margin-bottom: 10px;
              }
              h2 {
                color: #666;
                text-align: center;
                font-size: 18px;
                margin-bottom: 30px;
              }
              .summary-section {
                margin: 20px 0;
                padding: 15px;
                background-color: #f5f5f5;
                border-radius: 8px;
              }
              .summary-row {
                display: flex;
                justify-content: space-between;
                margin: 12px 0;
                padding: 10px;
                border-bottom: 1px solid #ddd;
              }
              .label {
                font-weight: bold;
                font-size: 16px;
              }
              .value {
                font-size: 16px;
              }
              .income {
                color: #4CAF50;
              }
              .expense {
                color: #f44336;
              }
              .balance-section {
                display: flex;
                gap: 20px;
                margin: 20px 0;
              }
              .balance-card {
                flex: 1;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
              }
              .monthly-balance {
                background-color: ${monthlyBalance >= 0 ? '#E8F5E9' : '#FFEBEE'};
              }
              .cumulative-balance {
                background-color: ${cumulativeBalance >= 0 ? '#E3F2FD' : '#FFEBEE'};
              }
              .balance-title {
                font-size: 14px;
                color: #666;
                margin-bottom: 8px;
              }
              .balance-amount {
                font-size: 24px;
                font-weight: bold;
              }
              .section-title {
                font-size: 18px;
                font-weight: bold;
                margin: 25px 0 15px 0;
                color: #333;
              }
              .category-row {
                display: flex;
                justify-content: space-between;
                padding: 8px;
                border-bottom: 1px solid #eee;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <h1>דוח ועד בית</h1>
            <h2>${monthNames[selectedMonth]} ${selectedYear}</h2>

            <div class="summary-section">
              <div class="summary-row">
                <span class="label">סה"כ הכנסות החודש:</span>
                <span class="value income">₪${totalMonthlyIncome.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ הוצאות החודש:</span>
                <span class="value expense">₪${totalMonthlyExpenses.toLocaleString()}</span>
              </div>
            </div>

            <div class="balance-section">
              <div class="balance-card monthly-balance">
                <div class="balance-title">מאזן חודשי</div>
                <div class="balance-amount" style="color: ${monthlyBalance >= 0 ? '#4CAF50' : '#f44336'}">
                  ${monthlyBalance >= 0 ? '+' : ''}₪${monthlyBalance.toLocaleString()}
                </div>
              </div>
              <div class="balance-card cumulative-balance">
                <div class="balance-title">יתרה מצטברת בקופה</div>
                <div class="balance-amount" style="color: ${cumulativeBalance >= 0 ? '#1976D2' : '#f44336'}">
                  ₪${cumulativeBalance.toLocaleString()}
                </div>
              </div>
            </div>

            ${incomeByCategory.length > 0 ? `
              <div class="section-title">פירוט הכנסות</div>
              <div class="summary-section">
                ${incomeCategoriesHtml}
              </div>
            ` : ''}

            ${expensesByCategory.length > 0 ? `
              <div class="section-title">פירוט הוצאות</div>
              <div class="summary-section">
                ${expenseCategoriesHtml}
              </div>
            ` : ''}

            <div class="footer">
              <p>נוצר באמצעות אפליקציית ועד בית</p>
              <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
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
          setTimeout(() => {
            printWindow.print();
          }, 250);
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
          if (Platform.OS === 'web') {
            window.alert('הדוח נשמר בהצלחה');
          } else {
            Alert.alert('הצלחה', 'הדוח נשמר בהצלחה');
          }
        }
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      if (Platform.OS === 'web') {
        window.alert('אירעה שגיאה בייצוא הדוח ל-PDF');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בייצוא הדוח ל-PDF');
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      // Build data for Excel
      const data: any[][] = [
        ['דוח ועד בית - ' + monthNames[selectedMonth] + ' ' + selectedYear],
        [],
        ['סיכום'],
        ['סה"כ הכנסות החודש', totalMonthlyIncome],
        ['סה"כ הוצאות החודש', totalMonthlyExpenses],
        ['מאזן חודשי', monthlyBalance],
        ['יתרה מצטברת בקופה', cumulativeBalance],
        [],
      ];

      // Add income breakdown
      if (incomeByCategory.length > 0) {
        data.push(['פירוט הכנסות']);
        data.push(['קטגוריה', 'סכום', 'אחוז']);
        incomeByCategory.forEach(item => {
          data.push([item.category, item.amount, item.percentage + '%']);
        });
        data.push([]);
      }

      // Add expense breakdown
      if (expensesByCategory.length > 0) {
        data.push(['פירוט הוצאות']);
        data.push(['קטגוריה', 'סכום', 'אחוז']);
        expensesByCategory.forEach(item => {
          data.push([item.category, item.amount, item.percentage + '%']);
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'דוח ועד');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `דוח_ועד_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = require('expo-file-system/legacy');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.documentDirectory + 'דוח_ועד_' + Date.now() + '.xlsx';
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            UTI: 'com.microsoft.excel.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        } else {
          if (Platform.OS === 'web') {
            window.alert('הקובץ נשמר בהצלחה');
          } else {
            Alert.alert('הצלחה', 'הקובץ נשמר בהצלחה');
          }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3F51B5" />
        <Text style={styles.loadingText}>טוען נתונים...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>דוח ועד בית</Text>
      </SafeAreaView>

      <ScrollView style={styles.content}>
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
        <Card style={[styles.cumulativeCard, cumulativeBalance < 0 && styles.negativeCumulativeCard]}>
          <Card.Content>
            <Text style={styles.cumulativeLabel}>יתרה מצטברת בקופה</Text>
            <Text style={[
              styles.cumulativeAmount,
              { color: cumulativeBalance >= 0 ? '#1976D2' : '#f44336' }
            ]}>
              ₪{cumulativeBalance.toLocaleString()}
            </Text>
            <Text style={styles.cumulativeSubtext}>סה"כ מאז תחילת הפעילות</Text>
          </Card.Content>
        </Card>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, styles.incomeCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="arrow-up" size={32} color="#4CAF50" />
              <Text style={styles.summaryLabel}>הכנסות החודש</Text>
              <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                ₪{totalMonthlyIncome.toLocaleString()}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.expenseCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="arrow-down" size={32} color="#f44336" />
              <Text style={styles.summaryLabel}>הוצאות החודש</Text>
              <Text style={[styles.summaryAmount, { color: '#f44336' }]}>
                ₪{totalMonthlyExpenses.toLocaleString()}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Monthly Balance Card */}
        <Card style={[styles.balanceCard, monthlyBalance < 0 && styles.negativeBalanceCard]}>
          <Card.Content>
            <Text style={[styles.balanceLabel, monthlyBalance < 0 && styles.negativeBalanceLabel]}>מאזן חודשי</Text>
            <Text style={[
              styles.balanceAmount,
              { color: monthlyBalance >= 0 ? '#4CAF50' : '#f44336' }
            ]}>
              {monthlyBalance >= 0 ? '+' : ''}₪{monthlyBalance.toLocaleString()}
            </Text>
            <Text style={styles.balanceSubtext}>
              {monthlyBalance >= 0 ? 'עודף' : 'גירעון'}
            </Text>
          </Card.Content>
        </Card>

        {/* Income Breakdown */}
        {incomeByCategory.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>פירוט הכנסות</Text>
              {incomeByCategory.map((item, index) => (
                <View key={index} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${item.percentage}%`, backgroundColor: '#4CAF50' }]} />
                    </View>
                  </View>
                  <View style={styles.categoryAmount}>
                    <Text style={styles.amountText}>₪{item.amount.toLocaleString()}</Text>
                    <Text style={styles.percentageText}>{item.percentage}%</Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Expenses Breakdown */}
        {expensesByCategory.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>פירוט הוצאות</Text>
              {expensesByCategory.map((item, index) => (
                <View key={index} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${item.percentage}%`, backgroundColor: '#f44336' }]} />
                    </View>
                  </View>
                  <View style={styles.categoryAmount}>
                    <Text style={styles.amountText}>₪{item.amount.toLocaleString()}</Text>
                    <Text style={styles.percentageText}>{item.percentage}%</Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Empty State */}
        {incomeByCategory.length === 0 && expensesByCategory.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>אין נתונים לחודש זה</Text>
            </Card.Content>
          </Card>
        )}

        {/* Export Buttons */}
        <View style={styles.exportButtonsRow}>
          <Button
            mode="contained"
            icon="file-pdf-box"
            onPress={handleExportPDF}
            style={styles.exportButton}
            buttonColor="#3F51B5"
          >
            ייצא ל-PDF
          </Button>
          <Button
            mode="contained"
            icon="microsoft-excel"
            onPress={handleExportExcel}
            style={styles.exportButton}
            buttonColor="#217346"
          >
            ייצא ל-Excel
          </Button>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
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
  header: {
    padding: 20,
    backgroundColor: '#3F51B5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  monthCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
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
  cumulativeCard: {
    backgroundColor: '#E3F2FD',
    marginBottom: 16,
  },
  negativeCumulativeCard: {
    backgroundColor: '#FFEBEE',
  },
  cumulativeLabel: {
    fontSize: 16,
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 8,
  },
  cumulativeAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cumulativeSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
  },
  negativeBalanceCard: {
    backgroundColor: '#FFEBEE',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  negativeBalanceLabel: {
    color: '#C62828',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 16,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    marginBottom: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryAmount: {
    alignItems: 'flex-start',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  percentageText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  exportButton: {
    flex: 1,
  },
  spacer: {
    height: 32,
  },
});
