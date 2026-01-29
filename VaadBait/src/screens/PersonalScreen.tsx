import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  CommitteeIncomeService,
  CommitteeExpensesService,
  FeePaymentsService,
  MeterReadingsService,
  ChargingStationsService,
  ResidentsService,
  CommitteeIncome,
  CommitteeExpense,
  FeePayment,
  MeterReading,
  ChargingStation,
  Resident
} from '../services/firebaseService';

interface UnifiedTransaction {
  id: string;
  type: 'income' | 'expense';
  source: 'committee_income' | 'committee_expense' | 'fee_payment' | 'charging_bill';
  amount: number;
  description: string;
  category: string;
  date: Date;
  isPaid?: boolean;
}

export default function PersonalScreen({ navigation }: any) {
  const [allTransactions, setAllTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const loadData = async () => {
    try {
      const [incomes, expenses, feePayments, meterReadings, stations, residents] = await Promise.all([
        CommitteeIncomeService.getAll(),
        CommitteeExpensesService.getAll(),
        FeePaymentsService.getAll(),
        MeterReadingsService.getAll(),
        ChargingStationsService.getAll(),
        ResidentsService.getAll(),
      ]);

      // Convert all to unified format
      const unifiedTransactions: UnifiedTransaction[] = [];

      // Add committee incomes (only paid ones)
      incomes.filter((i: CommitteeIncome) => i.isPaid).forEach((income: CommitteeIncome) => {
        unifiedTransactions.push({
          id: income.id!,
          type: 'income',
          source: 'committee_income',
          amount: income.amount,
          description: income.description,
          category: income.category,
          date: income.date instanceof Date ? income.date : new Date(income.date),
          isPaid: income.isPaid,
        });
      });

      // Add committee expenses
      expenses.forEach((expense: CommitteeExpense) => {
        unifiedTransactions.push({
          id: expense.id!,
          type: 'expense',
          source: 'committee_expense',
          amount: expense.amount,
          description: expense.description,
          category: expense.category,
          date: expense.date instanceof Date ? expense.date : new Date(expense.date),
        });
      });

      // Add fee payments (only paid ones)
      feePayments.filter((p: FeePayment) => p.isPaid).forEach((payment: FeePayment) => {
        unifiedTransactions.push({
          id: payment.id!,
          type: 'income',
          source: 'fee_payment',
          amount: payment.amount,
          description: `תשלום דמי ועד - ${payment.residentName} (דירה ${payment.apartmentNumber})`,
          category: 'דמי ועד',
          date: payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate),
          isPaid: true,
        });
      });

      // Add meter readings (charging bills) - only paid ones
      meterReadings.filter((r: MeterReading) => r.isPaid).forEach((reading: MeterReading) => {
        const readingDate = reading.readingDate instanceof Date ? reading.readingDate : new Date(reading.readingDate);
        // Find station and resident info
        const station = stations.find((s: ChargingStation) => s.id === reading.stationId);
        const resident = residents.find((r: Resident) =>
          r.apartmentNumber?.toString().trim() === station?.apartmentNumber?.toString().trim()
        );
        const residentName = resident?.name || station?.residentName || 'לא ידוע';
        const apartmentNumber = station?.apartmentNumber || '';

        unifiedTransactions.push({
          id: reading.id!,
          type: 'income',
          source: 'charging_bill',
          amount: reading.totalCost,
          description: `חשבון טעינה - ${residentName} (דירה ${apartmentNumber}) - ${monthNames[reading.month - 1]} ${reading.year}`,
          category: 'טעינת רכב',
          date: readingDate,
          isPaid: true,
        });
      });

      // Sort by date descending
      unifiedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      setAllTransactions(unifiedTransactions);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Filter transactions by selected month
  const selectedMonthTransactions = allTransactions.filter(t => {
    return t.date.getMonth() === selectedMonth && t.date.getFullYear() === selectedYear;
  });

  const totalIncome = selectedMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = selectedMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate monthly balance (income - expenses for selected month)
  const monthlyBalance = totalIncome - totalExpenses;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'committee_income': return 'cash-plus';
      case 'committee_expense': return 'cash-minus';
      case 'fee_payment': return 'account-cash';
      case 'charging_bill': return 'ev-station';
      default: return 'cash';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'committee_income': return 'הכנסת ועד';
      case 'committee_expense': return 'הוצאת ועד';
      case 'fee_payment': return 'תשלום דייר';
      case 'charging_bill': return 'חשבון טעינה';
      default: return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>טוען נתונים...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>משק בית - עונות השנה 23</Text>
      </View>

      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryLabel}>הכנסות החודש</Text>
            <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>₪{totalIncome.toLocaleString()}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryLabel}>הוצאות החודש</Text>
            <Text style={[styles.summaryAmount, { color: '#f44336' }]}>₪{totalExpenses.toLocaleString()}</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.balanceCard, monthlyBalance < 0 && styles.negativeBalanceCard]}>
          <Card.Content>
            <Text style={styles.summaryLabel}>מאזן כללי</Text>
            <Text style={[styles.balanceAmount, monthlyBalance < 0 && styles.negativeBalance]}>
              ₪{monthlyBalance.toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Month Navigator for Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>תנועות</Text>

        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#6200EE" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthNames[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#6200EE" />
          </TouchableOpacity>
        </View>

        {selectedMonthTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>אין תנועות בחודש זה</Text>
            </Card.Content>
          </Card>
        ) : (
          selectedMonthTransactions.map((transaction) => (
            <Card
              key={`${transaction.source}-${transaction.id}`}
              style={[
                styles.transactionCard,
                transaction.type === 'income' ? styles.incomeCard : styles.expenseCard
              ]}
            >
              <Card.Content>
                <View style={styles.transactionRow}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === 'income' ? '#E8F5E9' : '#FFEBEE' }
                  ]}>
                    <MaterialCommunityIcons
                      name={getSourceIcon(transaction.source)}
                      size={24}
                      color={transaction.type === 'income' ? '#4CAF50' : '#f44336'}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionCategory}>{transaction.category}</Text>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <View style={styles.transactionMeta}>
                      <Text style={styles.transactionDate}>
                        {transaction.date.toLocaleDateString('he-IL')}
                      </Text>
                      <Text style={styles.transactionSource}>{getSourceLabel(transaction.source)}</Text>
                    </View>
                  </View>
                  <View style={styles.transactionAmountContainer}>
                    <Text style={[
                      styles.transactionAmount,
                      transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}₪{transaction.amount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  header: { padding: 20, backgroundColor: '#6200EE' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  summaryContainer: { padding: 16 },
  summaryCard: { backgroundColor: '#fff', marginBottom: 12 },
  balanceCard: { backgroundColor: '#E8F5E9', marginBottom: 12 },
  negativeBalanceCard: { backgroundColor: '#FFEBEE' },
  summaryLabel: { fontSize: 14, color: '#666', textAlign: 'right', marginBottom: 8 },
  summaryAmount: { fontSize: 32, fontWeight: 'bold', color: '#333', textAlign: 'right' },
  balanceAmount: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50', textAlign: 'right' },
  negativeBalance: { color: '#f44336' },
  section: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  monthArrow: {
    padding: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyCard: {
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  transactionCard: {
    marginBottom: 8,
    borderRightWidth: 4,
  },
  incomeCard: {
    backgroundColor: '#fff',
    borderRightColor: '#4CAF50',
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRightColor: '#f44336',
  },
  transactionRow: { flexDirection: 'row', alignItems: 'center' },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: { flex: 1, marginHorizontal: 12 },
  transactionCategory: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  transactionDescription: { fontSize: 14, color: '#666', textAlign: 'right' },
  transactionMeta: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, gap: 12 },
  transactionDate: { fontSize: 12, color: '#999' },
  transactionSource: { fontSize: 12, color: '#2196F3', fontWeight: '500' },
  transactionAmountContainer: { alignItems: 'flex-start' },
  transactionAmount: { fontSize: 18, fontWeight: 'bold' },
  incomeAmount: { color: '#4CAF50' },
  expenseAmount: { color: '#f44336' },
});
