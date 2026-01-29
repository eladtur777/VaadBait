import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, Image, Dimensions, Platform } from 'react-native';
import { Card, FAB, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CommitteeExpensesService, CommitteeExpense } from '../services/firebaseService';

export default function CommitteeExpensesScreen({ navigation, route }: any) {
  const [expenses, setExpenses] = useState<CommitteeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // Load expenses from Firebase
  const loadExpenses = async () => {
    try {
      const data = await CommitteeExpensesService.getAll();
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      if (Platform.OS === 'web') {
        window.alert('אירעה שגיאה בטעינת ההוצאות');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בטעינת ההוצאות');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  // Reload data when screen is focused or when refresh param changes
  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [route?.params?.refresh])
  );

  // Filter expenses by selected month
  const filteredExpenses = expenses.filter(exp => {
    const expDate = exp.date instanceof Date ? exp.date : new Date(exp.date);
    return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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

  const handleEditExpense = (expense: CommitteeExpense) => {
    navigation.navigate('AddCommitteeExpense', { expense });
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const doDelete = async () => {
      try {
        await CommitteeExpensesService.delete(expenseId);
        setExpenses(expenses.filter(e => e.id !== expenseId));
      } catch (error) {
        console.error('Error deleting expense:', error);
        if (Platform.OS === 'web') {
          window.alert('שגיאה: אירעה שגיאה במחיקת ההוצאה');
        } else {
          Alert.alert('שגיאה', 'אירעה שגיאה במחיקת ההוצאה');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('האם אתה בטוח שברצונך למחוק הוצאה זו?')) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'מחק הוצאה',
        'האם אתה בטוח שברצונך למחוק הוצאה זו?',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'מחק', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ניקיון': return 'broom';
      case 'אבטחה': return 'shield-account';
      case 'תחזוקה': return 'tools';
      case 'גינון': return 'flower';
      default: return 'cash';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ניקיון': return '#4CAF50';
      case 'אבטחה': return '#2196F3';
      case 'תחזוקה': return '#FF9800';
      case 'גינון': return '#8BC34A';
      default: return '#999';
    }
  };

  const getReceiptImage = (expense: CommitteeExpense) => {
    return expense.receiptImageBase64 || expense.receiptUrl || null;
  };

  const isPdfReceipt = (receipt: string) => {
    return receipt?.startsWith('data:application/pdf');
  };

  const handleViewReceipt = (expense: CommitteeExpense) => {
    const receiptImage = getReceiptImage(expense);
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

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>הוצאות ועד</Text>
      </SafeAreaView>

      <View style={styles.content}>
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

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryAmount}>₪{totalExpenses.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>סה"כ הוצאות</Text>
            <Text style={styles.summaryCount}>{filteredExpenses.length} תנועות</Text>
          </Card.Content>
        </Card>

        {/* Expenses List */}
        <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>טוען הוצאות...</Text>
            </View>
          ) : filteredExpenses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>אין הוצאות בחודש זה</Text>
                <Text style={styles.emptySubtext}>לחץ על + להוספת הוצאה חדשה</Text>
              </Card.Content>
            </Card>
          ) : (
            filteredExpenses.map((expense) => (
              <Card key={expense.id} style={styles.expenseCard}>
                <Card.Content>
                  <View style={styles.expenseHeader}>
                    <View style={styles.expenseInfo}>
                      <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(expense.category) }]}>
                        <MaterialCommunityIcons
                          name={getCategoryIcon(expense.category)}
                          size={24}
                          color="#fff"
                        />
                      </View>
                      <View style={styles.expenseText}>
                        <Text style={styles.expenseCategory}>{expense.category}</Text>
                        <Text style={styles.expenseDescription}>{expense.description}</Text>
                        {expense.notes ? (
                          <Text style={styles.expenseNotes}>{expense.notes}</Text>
                        ) : null}
                      </View>
                      {getReceiptImage(expense) ? (
                        <TouchableOpacity
                          style={styles.receiptIconButton}
                          onPress={() => handleViewReceipt(expense)}
                        >
                          <MaterialCommunityIcons name="image" size={24} color="#4CAF50" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.expenseAmount}>
                      <Text style={styles.amountText}>₪{expense.amount.toLocaleString()}</Text>
                      <Text style={styles.dateText}>
                        {expense.date instanceof Date
                          ? expense.date.toLocaleDateString('he-IL')
                          : expense.date}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionButtons}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      iconColor="#2196F3"
                      onPress={() => handleEditExpense(expense)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor="#f44336"
                      onPress={() => handleDeleteExpense(expense.id!)}
                    />
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
          label="הוצאה חדשה"
          onPress={() => navigation.navigate('AddCommitteeExpense')}
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
    backgroundColor: '#E3F2FD',
    marginBottom: 16,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
    marginTop: 4,
  },
  summaryCount: {
    fontSize: 12,
    color: '#64B5F6',
    textAlign: 'center',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  expenseCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
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
  expenseText: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  expenseNotes: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  expenseAmount: {
    alignItems: 'flex-start',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
