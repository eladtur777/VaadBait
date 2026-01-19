import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, List, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { ResidentsService, FeePaymentsService, CommitteeIncomeService, Resident, FeePayment, CommitteeIncome } from '../services/firebaseService';

export default function CommitteeScreen({ navigation }: any) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [committeeIncomes, setCommitteeIncomes] = useState<CommitteeIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const loadData = async () => {
    try {
      const [residentsData, allPayments, incomesData] = await Promise.all([
        ResidentsService.getAll(),
        FeePaymentsService.getAll(),
        CommitteeIncomeService.getAll(),
      ]);
      // Filter payments for current month
      const paymentsData = allPayments.filter(p => p.year === currentYear && p.month === currentMonth);
      setResidents(residentsData);
      setPayments(paymentsData);
      setCommitteeIncomes(incomesData);
    } catch (error) {
      console.error('Error loading committee data:', error);
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

  // Calculate summary values
  const activeResidents = residents.filter(r => r.isActive);
  const totalResidents = activeResidents.length;

  // Total expected this month = sum of all active residents' monthly fees
  const totalExpectedThisMonth = activeResidents.reduce((sum, r) => sum + r.monthlyFee, 0);

  // Collected this month = paid fee payments only (from residents)
  const collectedThisMonth = payments
    .filter(p => p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  // Pending payments = total expected - what was actually collected this month
  // Make sure it's not negative (in case more was collected than expected)
  const pendingPayments = Math.max(0, totalExpectedThisMonth - collectedThisMonth);

  // Debug log
  console.log('Committee Summary:', {
    currentMonth,
    currentYear,
    activeResidents: totalResidents,
    totalExpectedThisMonth,
    collectedThisMonth,
    pendingPayments,
    paymentsCount: payments.length,
    paymentsData: payments.map(p => ({ residentName: p.residentName, amount: p.amount, month: p.month, year: p.year, isPaid: p.isPaid })),
    residentsData: activeResidents.map(r => ({ name: r.name, monthlyFee: r.monthlyFee }))
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#03DAC6" />
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
        <Text style={styles.title}>ועד בית</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryLabel}>סה"כ דיירים פעילים</Text>
            <Text style={styles.summaryAmount}>{totalResidents}</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
          <Card.Content>
            <Text style={styles.summaryLabel}>דמי ועד שנגבו החודש</Text>
            <Text style={[styles.summaryAmount, { color: '#2E7D32' }]}>₪{collectedThisMonth.toLocaleString()}</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, { backgroundColor: pendingPayments > 0 ? '#FFEBEE' : '#E8F5E9' }]}>
          <Card.Content>
            <Text style={styles.summaryLabel}>תשלומים ממתינים</Text>
            <Text style={[styles.summaryAmount, { color: pendingPayments > 0 ? '#C62828' : '#2E7D32' }]}>
              ₪{pendingPayments.toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>פעולות</Text>

        <Card style={styles.actionCard}>
          <List.Item
            title="ניהול דיירים"
            description="הוסף וערוך פרטי דיירים"
            left={() => <List.Icon icon="account-group" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => navigation.navigate('ManageResidents')}
          />
        </Card>

        <Card style={styles.actionCard}>
          <List.Item
            title="גביית דמי ועד"
            description="רשום תשלומים חודשיים"
            left={() => <List.Icon icon="cash-multiple" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => navigation.navigate('FeeCollection')}
          />
        </Card>

        <Card style={styles.actionCard}>
          <List.Item
            title="הכנסות ועד"
            description="רשום הכנסות נוספות"
            left={() => <List.Icon icon="cash-plus" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => navigation.navigate('CommitteeIncome')}
          />
        </Card>

        <Card style={styles.actionCard}>
          <List.Item
            title="הוצאות ועד"
            description="רשום הוצאות משותפות"
            left={() => <List.Icon icon="receipt" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => navigation.navigate('CommitteeExpenses')}
          />
        </Card>

        <Card style={styles.actionCard}>
          <List.Item
            title="תשלומים צפויים"
            description={`${committeeIncomes.filter(i => !i.isPaid).length} תשלומים ממתינים`}
            left={() => <List.Icon icon="clock-outline" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => navigation.navigate('PendingPayments')}
          />
        </Card>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>סיכום חודשי</Text>
        {residents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>אין דיירים רשומים</Text>
              <Text style={styles.emptySubtext}>התחל בהוספת דיירים</Text>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.summaryDetailCard}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryDetailValue}>{residents.length}</Text>
                <Text style={styles.summaryDetailLabel}>סה"כ דיירים במערכת</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryDetailValue}>{totalResidents}</Text>
                <Text style={styles.summaryDetailLabel}>דיירים פעילים</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryDetailValue, { color: '#2E7D32' }]}>
                  {payments.filter(p => p.isPaid).length}
                </Text>
                <Text style={styles.summaryDetailLabel}>שילמו החודש</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryDetailValue, { color: pendingPayments > 0 ? '#C62828' : '#2E7D32' }]}>
                  {totalResidents - payments.filter(p => p.isPaid).length}
                </Text>
                <Text style={styles.summaryDetailLabel}>טרם שילמו</Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </View>

      <View style={{ height: 32 }} />
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
  header: {
    padding: 20,
    backgroundColor: '#03DAC6',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
  },
  summaryContainer: {
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
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
  actionCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  summaryDetailCard: {
    backgroundColor: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});
