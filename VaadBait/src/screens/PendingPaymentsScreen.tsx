import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { Card, ActivityIndicator, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CommitteeIncomeService, CommitteeIncome } from '../services/firebaseService';

export default function PendingPaymentsScreen({ navigation }: any) {
  const [incomes, setIncomes] = useState<CommitteeIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const loadData = async () => {
    try {
      const data = await CommitteeIncomeService.getAll();
      setIncomes(data);
    } catch (error) {
      console.error('Error loading data:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לטעון את הנתונים');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לטעון את הנתונים');
      }
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

  const handleTogglePaid = async (income: CommitteeIncome) => {
    try {
      const newIsPaid = !income.isPaid;
      await CommitteeIncomeService.update(income.id!, {
        isPaid: newIsPaid,
      });

      setIncomes(incomes.map(i =>
        i.id === income.id ? { ...i, isPaid: newIsPaid } : i
      ));

      const successMsg = newIsPaid ? 'התשלום סומן כהתקבל' : 'התשלום סומן כממתין';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('עודכן', successMsg);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לעדכן את סטטוס התשלום');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לעדכן את סטטוס התשלום');
      }
    }
  };

  const handleSendReminder = (income: CommitteeIncome) => {
    if (!income.payerPhone) {
      if (Platform.OS === 'web') {
        window.alert('לא קיים מספר טלפון לתשלום זה.\nניתן להוסיף טלפון דרך עריכת התשלום.');
      } else {
        Alert.alert('שגיאה', 'לא קיים מספר טלפון לתשלום זה.\nניתן להוסיף טלפון דרך עריכת התשלום.');
      }
      return;
    }

    const payerName = income.payerName || income.description;
    const message = `שלום ${payerName},\nתזכורת לתשלום ${income.category} בסך ₪${income.amount.toLocaleString()}.\n${income.description}\nתודה, ועד הבית עונות השנה 23`;
    const phoneNumber = income.payerPhone.replace(/[^0-9]/g, '');
    const israelPhone = phoneNumber.startsWith('0') ? '972' + phoneNumber.slice(1) : phoneNumber;

    // Use different URL for web vs mobile
    if (Platform.OS === 'web') {
      // For web: use WhatsApp Web URL
      const whatsappWebUrl = `https://wa.me/${israelPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappWebUrl, '_blank');
    } else {
      // For mobile: use app URL scheme
      const whatsappUrl = `whatsapp://send?phone=${israelPhone}&text=${encodeURIComponent(message)}`;
      const smsUrl = `sms:${income.payerPhone}?body=${encodeURIComponent(message)}`;

      Linking.canOpenURL(whatsappUrl)
        .then(supported => {
          if (supported) {
            return Linking.openURL(whatsappUrl);
          } else {
            if (Platform.OS === 'web') {
              if (window.confirm('WhatsApp לא מותקן. לשלוח SMS?')) {
                Linking.openURL(smsUrl);
              }
            } else {
              Alert.alert(
                'שלח תזכורת',
                'WhatsApp לא מותקן. מה תרצה לעשות?',
                [
                  { text: 'ביטול', style: 'cancel' },
                  { text: 'שלח SMS', onPress: () => Linking.openURL(smsUrl) },
                ]
              );
            }
          }
        })
        .catch(err => {
          console.error('Error opening WhatsApp:', err);
          Linking.openURL(smsUrl);
        });
    }
  };

  // Filter by month first
  const monthFilteredIncomes = incomes.filter(income => {
    const incDate = income.date instanceof Date ? income.date : new Date(income.date);
    return incDate.getMonth() === selectedMonth && incDate.getFullYear() === selectedYear;
  });

  // Then filter by paid status
  const filteredIncomes = monthFilteredIncomes.filter(income => {
    if (filter === 'unpaid') return !income.isPaid;
    if (filter === 'paid') return income.isPaid;
    return true;
  });

  // Calculate totals based on month filtered incomes
  const totalPending = monthFilteredIncomes.filter(i => !i.isPaid).reduce((sum, i) => sum + i.amount, 0);
  const totalReceived = monthFilteredIncomes.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('he-IL');
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'ועד בית': 'office-building',
      'חניה': 'car',
      'אחזקה': 'wrench',
      'חשמל': 'lightning-bolt',
      'מים': 'water',
      'גינון': 'flower',
      'ניקיון': 'broom',
      'ביטוח': 'shield-check',
      'שיפוצים': 'hammer',
      'אחר': 'dots-horizontal',
    };
    return icons[category] || 'cash';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>טוען תשלומים...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>תשלומים צפויים</Text>
      </SafeAreaView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Month Navigator */}
        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthNames[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={styles.pendingCard}>
            <Card.Content>
              <Text style={styles.summaryLabel}>ממתין לקבלה</Text>
              <Text style={styles.pendingAmount}>₪{totalPending.toLocaleString()}</Text>
              <Text style={styles.summaryCount}>
                {monthFilteredIncomes.filter(i => !i.isPaid).length} תשלומים
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.receivedCard}>
            <Card.Content>
              <Text style={styles.summaryLabel}>התקבל</Text>
              <Text style={styles.receivedAmount}>₪{totalReceived.toLocaleString()}</Text>
              <Text style={styles.summaryCount}>
                {monthFilteredIncomes.filter(i => i.isPaid).length} תשלומים
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={[styles.chip, filter === 'all' && styles.chipSelected]}
            textStyle={filter === 'all' ? styles.chipTextSelected : undefined}
          >
            הכל ({monthFilteredIncomes.length})
          </Chip>
          <Chip
            selected={filter === 'unpaid'}
            onPress={() => setFilter('unpaid')}
            style={[styles.chip, filter === 'unpaid' && styles.chipUnpaid]}
            textStyle={filter === 'unpaid' ? styles.chipTextSelected : undefined}
          >
            ממתין ({monthFilteredIncomes.filter(i => !i.isPaid).length})
          </Chip>
          <Chip
            selected={filter === 'paid'}
            onPress={() => setFilter('paid')}
            style={[styles.chip, filter === 'paid' && styles.chipPaid]}
            textStyle={filter === 'paid' ? styles.chipTextSelected : undefined}
          >
            התקבל ({monthFilteredIncomes.filter(i => i.isPaid).length})
          </Chip>
        </View>

        {/* Payments List */}
        <View style={styles.content}>
          {filteredIncomes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>
                  {filter === 'unpaid' ? 'אין תשלומים ממתינים' : 'אין תשלומים להצגה'}
                </Text>
                <Text style={styles.emptySubtext}>
                  הוסף הכנסות דרך מסך הכנסות הוועד
                </Text>
              </Card.Content>
            </Card>
          ) : (
            filteredIncomes.map((income) => (
              <Card key={income.id} style={styles.paymentCard}>
                <Card.Content>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentInfo}>
                      <View style={[
                        styles.paymentIcon,
                        { backgroundColor: income.isPaid ? '#E8F5E9' : '#FFF3E0' }
                      ]}>
                        <MaterialCommunityIcons
                          name={getCategoryIcon(income.category) as any}
                          size={24}
                          color={income.isPaid ? '#4CAF50' : '#FF9800'}
                        />
                      </View>
                      <View style={styles.paymentText}>
                        <Text style={styles.paymentCategory}>{income.category}</Text>
                        <Text style={styles.paymentDescription}>{income.description}</Text>
                        <Text style={styles.paymentDate}>{formatDate(income.date)}</Text>
                      </View>
                    </View>
                    <View style={styles.paymentAmount}>
                      <Text style={[
                        styles.amountText,
                        income.isPaid ? styles.receivedAmountText : styles.pendingAmountText
                      ]}>
                        ₪{income.amount.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.statusBadge,
                          income.isPaid ? styles.receivedBadge : styles.pendingBadge
                        ]}
                        onPress={() => handleTogglePaid(income)}
                      >
                        <Text style={[
                          styles.statusText,
                          { color: income.isPaid ? '#2E7D32' : '#E65100' }
                        ]}>
                          {income.isPaid ? 'התקבל ✓' : 'ממתין'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {income.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesText}>{income.notes}</Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => navigation.navigate('EditPendingPayment', { income })}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#2196F3" />
                      <Text style={styles.editButtonText}>ערוך</Text>
                    </TouchableOpacity>

                    {!income.isPaid && (
                      <TouchableOpacity
                        style={styles.reminderButton}
                        onPress={() => handleSendReminder(income)}
                      >
                        <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
                        <Text style={styles.reminderButtonText}>תזכורת</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
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
    backgroundColor: '#2196F3',
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
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  monthArrow: {
    padding: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  pendingCard: {
    flex: 1,
    backgroundColor: '#FFF3E0',
  },
  receivedCard: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 4,
  },
  pendingAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E65100',
    textAlign: 'right',
  },
  receivedAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'right',
  },
  summaryCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    justifyContent: 'flex-end',
  },
  chip: {
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#2196F3',
  },
  chipUnpaid: {
    backgroundColor: '#FF9800',
  },
  chipPaid: {
    backgroundColor: '#4CAF50',
  },
  chipTextSelected: {
    color: '#fff',
  },
  content: {
    padding: 16,
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
  paymentCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  paymentText: {
    flex: 1,
  },
  paymentCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  paymentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    textAlign: 'right',
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  receivedAmountText: {
    color: '#2E7D32',
  },
  pendingAmountText: {
    color: '#E65100',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  receivedBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'center',
    gap: 24,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderButtonText: {
    color: '#25D366',
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    height: 32,
  },
});
