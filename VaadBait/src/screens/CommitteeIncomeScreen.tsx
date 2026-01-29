import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, Image, Dimensions, Platform } from 'react-native';
import { Card, FAB, IconButton, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CommitteeIncomeService, CommitteeIncome } from '../services/firebaseService';

export default function CommitteeIncomeScreen({ navigation, route }: any) {
  const [incomes, setIncomes] = useState<CommitteeIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const loadIncomes = async () => {
    try {
      const data = await CommitteeIncomeService.getAll();
      setIncomes(data);
    } catch (error) {
      console.error('Error loading incomes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadIncomes();
    }, [route?.params?.refresh])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadIncomes();
  };

  // Filter incomes by selected month
  const filteredIncomes = incomes.filter(inc => {
    const incDate = inc.date instanceof Date ? inc.date : new Date(inc.date);
    return incDate.getMonth() === selectedMonth && incDate.getFullYear() === selectedYear;
  });

  const totalIncome = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const paidIncome = filteredIncomes.filter(inc => inc.isPaid).reduce((sum, inc) => sum + inc.amount, 0);
  const pendingIncome = filteredIncomes.filter(inc => !inc.isPaid).reduce((sum, inc) => sum + inc.amount, 0);

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

  const handleEditIncome = (income: any) => {
    // TODO: Navigate to edit screen
    console.log('Edit income:', income);
    navigation.navigate('AddCommitteeIncome', { income });
  };

  const handleDeleteIncome = async (incomeId: string) => {
    const doDelete = async () => {
      try {
        await CommitteeIncomeService.delete(incomeId);
        setIncomes(incomes.filter(i => i.id !== incomeId));
      } catch (error) {
        console.error('Error deleting income:', error);
        if (Platform.OS === 'web') {
          window.alert('שגיאה: לא ניתן למחוק את ההכנסה');
        } else {
          Alert.alert('שגיאה', 'לא ניתן למחוק את ההכנסה');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('האם אתה בטוח שברצונך למחוק הכנסה זו?')) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'מחק הכנסה',
        'האם אתה בטוח שברצונך למחוק הכנסה זו?',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'מחק', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleTogglePaid = async (income: CommitteeIncome) => {
    try {
      await CommitteeIncomeService.update(income.id!, {
        isPaid: !income.isPaid,
      });
      setIncomes(incomes.map(i =>
        i.id === income.id ? { ...i, isPaid: !i.isPaid } : i
      ));
    } catch (error) {
      console.error('Error toggling payment status:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לעדכן את סטטוס התשלום');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לעדכן את סטטוס התשלום');
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'דמי ועד': return 'cash-multiple';
      case 'תרומות': return 'gift';
      case 'שכירות': return 'key';
      case 'אחר': return 'cash-plus';
      default: return 'cash';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'דמי ועד': return '#4CAF50';
      case 'תרומות': return '#2196F3';
      case 'שכירות': return '#FF9800';
      case 'אחר': return '#9C27B0';
      default: return '#999';
    }
  };

  const getReceiptImage = (income: CommitteeIncome) => {
    return income.receiptImageBase64 || income.receiptUrl || null;
  };

  const isPdfReceipt = (receipt: string) => {
    return receipt?.startsWith('data:application/pdf');
  };

  const handleViewReceipt = (income: CommitteeIncome) => {
    const receiptImage = getReceiptImage(income);
    if (receiptImage) {
      // If it's a PDF, open in new tab (web) or show message (mobile)
      if (isPdfReceipt(receiptImage)) {
        if (Platform.OS === 'web') {
          // Convert base64 to blob and open in new tab (browsers block data: URLs)
          try {
            const base64Data = receiptImage.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
          } catch (error) {
            console.error('Error opening PDF:', error);
            if (Platform.OS === 'web') {
              window.alert('לא ניתן לפתוח את ה-PDF');
            } else {
              Alert.alert('שגיאה', 'לא ניתן לפתוח את ה-PDF');
            }
          }
        } else {
          if (Platform.OS === 'web') {
            window.alert('צפייה ב-PDF זמינה רק בגרסת הווב');
          } else {
            Alert.alert('PDF', 'צפייה ב-PDF זמינה רק בגרסת הווב');
          }
        }
      } else {
        setSelectedReceiptImage(receiptImage);
        setReceiptModalVisible(true);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
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
        <Text style={styles.title}>הכנסות ועד</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Month Navigator */}
        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthNames[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryAmount}>₪{paidIncome.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>הכנסות ששולמו</Text>
            {pendingIncome > 0 && (
              <Text style={styles.pendingAmount}>₪{pendingIncome.toLocaleString()} ממתינים</Text>
            )}
            <Text style={styles.summaryCount}>{filteredIncomes.length} תנועות</Text>
          </Card.Content>
        </Card>

        {/* Income List */}
        <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {filteredIncomes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>אין הכנסות בחודש זה</Text>
                <Text style={styles.emptySubtext}>לחץ על + להוספת הכנסה חדשה</Text>
              </Card.Content>
            </Card>
          ) : (
            filteredIncomes.map((income) => (
              <Card key={income.id} style={styles.incomeCard}>
                <Card.Content>
                  <View style={styles.incomeHeader}>
                    <View style={styles.incomeInfo}>
                      <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(income.category) }]}>
                        <MaterialCommunityIcons
                          name={getCategoryIcon(income.category)}
                          size={24}
                          color="#fff"
                        />
                      </View>
                      <View style={styles.incomeText}>
                        <Text style={styles.incomeCategory}>{income.category}</Text>
                        <Text style={styles.incomeDescription}>{income.description}</Text>
                      </View>
                      {getReceiptImage(income) ? (
                        <TouchableOpacity
                          style={styles.receiptIconButton}
                          onPress={() => handleViewReceipt(income)}
                        >
                          <MaterialCommunityIcons name="image" size={24} color="#4CAF50" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.incomeAmount}>
                      <Text style={[styles.amountText, !income.isPaid && styles.pendingAmountText]}>
                        ₪{income.amount.toLocaleString()}
                      </Text>
                      <Text style={styles.dateText}>
                        {(income.date instanceof Date ? income.date : new Date(income.date)).toLocaleDateString('he-IL')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusAndActions}>
                    <TouchableOpacity
                      style={[styles.statusBadge, income.isPaid ? styles.paidBadge : styles.unpaidBadge]}
                      onPress={() => handleTogglePaid(income)}
                    >
                      <MaterialCommunityIcons
                        name={income.isPaid ? 'check-circle' : 'clock-outline'}
                        size={16}
                        color={income.isPaid ? '#2E7D32' : '#F57C00'}
                      />
                      <Text style={[styles.statusText, { color: income.isPaid ? '#2E7D32' : '#F57C00' }]}>
                        {income.isPaid ? 'שולם' : 'ממתין'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.actionButtons}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        iconColor="#2196F3"
                        onPress={() => handleEditIncome(income)}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor="#f44336"
                        onPress={() => handleDeleteIncome(income.id!)}
                      />
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>

        {/* Add Button */}
        <FAB
          style={styles.fab}
          icon="plus"
          label="הכנסה חדשה"
          onPress={() => navigation.navigate('AddCommitteeIncome')}
        />

        {/* Receipt Image Modal */}
        <Modal
          visible={receiptModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReceiptModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setReceiptModalVisible(false)}
              >
                <MaterialCommunityIcons name="close-circle" size={32} color="#fff" />
              </TouchableOpacity>
              {selectedReceiptImage && (
                <Image
                  source={{ uri: selectedReceiptImage }}
                  style={styles.receiptImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </Modal>
      </View>
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
    backgroundColor: '#4CAF50',
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
  summaryCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 4,
  },
  summaryCount: {
    fontSize: 12,
    color: '#66BB6A',
    textAlign: 'center',
    marginTop: 4,
  },
  pendingAmount: {
    fontSize: 14,
    color: '#FF9800',
    textAlign: 'center',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  incomeCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  incomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  incomeText: {
    flex: 1,
  },
  incomeCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  incomeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  incomeAmount: {
    alignItems: 'flex-start',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pendingAmountText: {
    color: '#FF9800',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusAndActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  paidBadge: {
    backgroundColor: '#E8F5E9',
  },
  unpaidBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    left: 16,
    bottom: 16,
  },
  receiptIconButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  receiptImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 150,
  },
});
