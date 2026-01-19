import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
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
                margin-bottom: 30px;
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
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <h1>דוח כספי חודשי - ${monthNames[selectedMonth]} ${selectedYear}</h1>
            <div class="summary">
              <div class="row">
                <span class="label">תאריך:</span>
                <span>${new Date().toLocaleDateString('he-IL')}</span>
              </div>
              <div class="row">
                <span class="label">סה"כ הכנסות:</span>
                <span style="color: #4CAF50;">₪${totalIncome.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">סה"כ הוצאות:</span>
                <span style="color: #f44336;">₪${totalExpenses.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">מאזן:</span>
                <span style="color: ${balance >= 0 ? '#4CAF50' : '#f44336'};">${balance >= 0 ? '+' : ''}₪${balance.toLocaleString()}</span>
              </div>
            </div>
            <div class="footer">
              <p>נוצר באמצעות אפליקציית ועד בית</p>
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
        Alert.alert('הצלחה', 'הקובץ נשמר בהצלחה');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בייצוא ל-PDF');
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
        Alert.alert('אין נתונים', 'אין נתונים לייצוא בחודש הנוכחי');
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

      // Generate Excel file
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Save to file system using legacy API
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
    } catch (error) {
      console.error('Error exporting Excel:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בייצוא ל-Excel');
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
            <Text style={styles.reportTitle}>⚡ דוח עמדות טעינה</Text>
            <Text style={styles.reportDesc}>צריכת חשמל ותשלומים</Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="text" onPress={() => navigation.navigate('ChargingStationReport')}>
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
      </View>

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
});
