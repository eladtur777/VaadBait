import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  CommitteeIncomeService,
  CommitteeExpensesService,
  FeePaymentsService,
  MeterReadingsService,
  CommitteeIncome,
  CommitteeExpense,
  FeePayment,
  MeterReading
} from '../services/firebaseService';

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export default function MonthlyReportScreen({ navigation }: any) {
  // Current month only - no navigation
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<CommitteeIncome[]>([]);
  const [expenses, setExpenses] = useState<CommitteeExpense[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const loadData = async () => {
    try {
      const [incomesData, expensesData, feePaymentsData, meterReadingsData] = await Promise.all([
        CommitteeIncomeService.getAll(),
        CommitteeExpensesService.getAll(),
        FeePaymentsService.getAll(),
        MeterReadingsService.getAll(),
      ]);
      setIncomes(incomesData);
      setExpenses(expensesData);
      setFeePayments(feePaymentsData);
      setMeterReadings(meterReadingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את הנתונים');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Filter data by current month
  const filteredIncomes = incomes.filter(i => {
    const date = i.date instanceof Date ? i.date : new Date(i.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear && i.isPaid;
  });

  const filteredExpenses = expenses.filter(e => {
    const date = e.date instanceof Date ? e.date : new Date(e.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const filteredFeePayments = feePayments.filter(p => {
    if (!p.isPaid || !p.paymentDate) return false;
    const date = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const filteredMeterReadings = meterReadings.filter(r => {
    return r.month === currentMonth + 1 && r.year === currentYear && r.isPaid;
  });

  // Calculate totals
  const incomeFromCommittee = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const incomeFromFees = filteredFeePayments.reduce((sum, p) => sum + p.amount, 0);
  const incomeFromCharging = filteredMeterReadings.reduce((sum, r) => sum + r.totalCost, 0);
  const totalIncome = incomeFromCommittee + incomeFromFees + incomeFromCharging;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Calculate income by category
  const incomeByCategory: CategoryData[] = [];
  if (incomeFromCommittee > 0) {
    // Group committee incomes by category
    const categoryMap = new Map<string, number>();
    filteredIncomes.forEach(i => {
      categoryMap.set(i.category, (categoryMap.get(i.category) || 0) + i.amount);
    });
    categoryMap.forEach((amount, category) => {
      incomeByCategory.push({
        category,
        amount,
        percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0
      });
    });
  }
  if (incomeFromFees > 0) {
    incomeByCategory.push({
      category: 'דמי ועד',
      amount: incomeFromFees,
      percentage: totalIncome > 0 ? Math.round((incomeFromFees / totalIncome) * 100) : 0
    });
  }
  if (incomeFromCharging > 0) {
    incomeByCategory.push({
      category: 'עמדות טעינה',
      amount: incomeFromCharging,
      percentage: totalIncome > 0 ? Math.round((incomeFromCharging / totalIncome) * 100) : 0
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
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
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

      // Create HTML content for the monthly report PDF
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
              .balance {
                font-size: 20px;
                font-weight: bold;
                text-align: center;
                padding: 15px;
                margin: 20px 0;
                background-color: ${balance >= 0 ? '#E8F5E9' : '#FFEBEE'};
                border-radius: 8px;
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
            <h1>דוח חודשי</h1>
            <h2>${monthNames[currentMonth]} ${currentYear}</h2>

            <div class="summary-section">
              <div class="summary-row">
                <span class="label">סה"כ הכנסות:</span>
                <span class="value income">₪${totalIncome.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ הוצאות:</span>
                <span class="value expense">₪${totalExpenses.toLocaleString()}</span>
              </div>
            </div>

            <div class="balance">
              <div>מאזן חודשי</div>
              <div class="${balance >= 0 ? 'income' : 'expense'}">${balance >= 0 ? '+' : ''}₪${balance.toLocaleString()}</div>
              <div style="font-size: 14px; color: #666; margin-top: 5px;">${balance >= 0 ? 'עודף' : 'גירעון'}</div>
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

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      } else {
        Alert.alert('הצלחה', 'הדוח נשמר בהצלחה');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בייצוא הדוח ל-PDF');
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
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>דוח חודשי</Text>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {/* Current Month Display */}
        <Card style={styles.monthCard}>
          <Card.Content>
            <Text style={styles.monthText}>{monthNames[currentMonth]} {currentYear}</Text>
          </Card.Content>
        </Card>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, styles.incomeCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="arrow-up" size={32} color="#4CAF50" />
              <Text style={styles.summaryLabel}>הכנסות</Text>
              <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                ₪{totalIncome.toLocaleString()}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.expenseCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="arrow-down" size={32} color="#f44336" />
              <Text style={styles.summaryLabel}>הוצאות</Text>
              <Text style={[styles.summaryAmount, { color: '#f44336' }]}>
                ₪{totalExpenses.toLocaleString()}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Balance Card */}
        <Card style={[styles.balanceCard, balance < 0 && styles.negativeBalanceCard]}>
          <Card.Content>
            <Text style={[styles.balanceLabel, balance < 0 && styles.negativeBalanceLabel]}>מאזן חודשי</Text>
            <Text style={[
              styles.balanceAmount,
              { color: balance >= 0 ? '#4CAF50' : '#f44336' }
            ]}>
              {balance >= 0 ? '+' : ''}₪{balance.toLocaleString()}
            </Text>
            <Text style={styles.balanceSubtext}>
              {balance >= 0 ? 'עודף' : 'גירעון'}
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

        {/* Export Button */}
        <Button
          mode="contained"
          icon="file-pdf-box"
          onPress={handleExportPDF}
          style={styles.exportButton}
        >
          ייצא ל-PDF
        </Button>

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
    backgroundColor: '#FF9800',
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
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
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
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 20,
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
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  negativeBalanceLabel: {
    color: '#C62828',
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
  balanceAmount: {
    fontSize: 36,
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
  exportButton: {
    marginTop: 8,
  },
  spacer: {
    height: 32,
  },
});
