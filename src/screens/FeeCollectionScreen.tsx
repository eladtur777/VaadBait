import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Linking } from 'react-native';
import { Button, Card, Searchbar, Chip, ActivityIndicator, Portal, Modal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ResidentsService, Resident, FeePaymentsService } from '../services/firebaseService';

interface ResidentWithStatus extends Resident {
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: Date;
  paymentId?: string;
}

export default function FeeCollectionScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [residents, setResidents] = useState<ResidentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentWithStatus | null>(null);
  const [newMonthlyFee, setNewMonthlyFee] = useState('');

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const loadData = async () => {
    try {
      const [allResidents, payments] = await Promise.all([
        ResidentsService.getAll(),
        FeePaymentsService.getByMonth(selectedYear, selectedMonth)
      ]);

      const residentsWithStatus: ResidentWithStatus[] = allResidents
        .filter(r => r.isActive)
        .map(resident => {
          const payment = payments.find(p => p.residentId === resident.id && p.isPaid);
          const now = new Date();
          const dueDate = new Date(selectedYear, selectedMonth - 1, 1);

          let status: 'paid' | 'pending' | 'overdue' = 'pending';
          if (payment) {
            status = 'paid';
          } else if (dueDate < now && !(selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1)) {
            status = 'overdue';
          }

          return {
            ...resident,
            status,
            paidDate: payment?.paymentDate,
            paymentId: payment?.id,
          };
        });

      setResidents(residentsWithStatus);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את הנתונים');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [selectedYear, selectedMonth])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const paidCount = residents.filter(r => r.status === 'paid').length;
  const pendingCount = residents.filter(r => r.status === 'pending').length;
  const overdueCount = residents.filter(r => r.status === 'overdue').length;
  const totalCollected = residents.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.monthlyFee, 0);

  const handleRecordPayment = async (resident: ResidentWithStatus) => {
    Alert.alert(
      'רשום תשלום',
      `לרשום תשלום של ₪${resident.monthlyFee} עבור ${resident.name}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'רשום',
          onPress: async () => {
            try {
              await FeePaymentsService.add({
                residentId: resident.id!,
                residentName: resident.name,
                apartmentNumber: resident.apartmentNumber,
                amount: resident.monthlyFee,
                month: selectedMonth,
                year: selectedYear,
                paymentDate: new Date(),
                isPaid: true,
              });
              Alert.alert('הצלחה', 'התשלום נרשם בהצלחה');
              loadData();
            } catch (error) {
              console.error('Error recording payment:', error);
              Alert.alert('שגיאה', 'לא ניתן לרשום את התשלום');
            }
          },
        },
      ]
    );
  };

  const handleEditFee = (resident: ResidentWithStatus) => {
    setSelectedResident(resident);
    setNewMonthlyFee(resident.monthlyFee.toString());
    setEditModalVisible(true);
  };

  const handleSaveFee = async () => {
    if (!selectedResident || !newMonthlyFee) return;

    try {
      await ResidentsService.update(selectedResident.id!, {
        monthlyFee: parseFloat(newMonthlyFee),
      });
      Alert.alert('הצלחה', 'דמי הועד עודכנו בהצלחה');
      setEditModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error updating fee:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן את דמי הועד');
    }
  };

  const handleSendReminder = (resident: ResidentWithStatus) => {
    if (!resident.phone) {
      Alert.alert('שגיאה', 'לא קיים מספר טלפון לדייר זה');
      return;
    }

    const message = `שלום ${resident.name},\nתזכורת לתשלום דמי ועד בית לחודש ${monthNames[selectedMonth - 1]} ${selectedYear} בסך ₪${resident.monthlyFee}.\nתודה, ועד הבית עונות השנה 23`;
    const phoneNumber = resident.phone.replace(/[^0-9]/g, '');
    const israelPhone = phoneNumber.startsWith('0') ? '972' + phoneNumber.slice(1) : phoneNumber;
    const whatsappUrl = `whatsapp://send?phone=${israelPhone}&text=${encodeURIComponent(message)}`;
    const smsUrl = `sms:${resident.phone}?body=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          // WhatsApp not installed - offer SMS or copy
          Alert.alert(
            'שלח תזכורת',
            'WhatsApp לא מותקן. מה תרצה לעשות?',
            [
              { text: 'ביטול', style: 'cancel' },
              {
                text: 'שלח SMS',
                onPress: () => Linking.openURL(smsUrl),
              },
            ]
          );
        }
      })
      .catch(err => {
        console.error('Error opening WhatsApp:', err);
        Linking.openURL(smsUrl);
      });
  };

  const filteredResidents = residents.filter(r =>
    r.name.includes(searchQuery) || r.apartmentNumber.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'overdue': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'שולם';
      case 'pending': return 'ממתין';
      case 'overdue': return 'באיחור';
      default: return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
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
        <Text style={styles.title}>גביית דמי ועד</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Month Selector */}
        <Card style={styles.monthCard}>
          <Card.Content>
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={handleNextMonth}>
                <MaterialCommunityIcons name="chevron-left" size={32} color="#666" />
              </TouchableOpacity>
              <Text style={styles.monthText}>{monthNames[selectedMonth - 1]} {selectedYear}</Text>
              <TouchableOpacity onPress={handlePreviousMonth}>
                <MaterialCommunityIcons name="chevron-right" size={32} color="#666" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Summary */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryLabel}>נגבה</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                ₪{totalCollected.toLocaleString()}
              </Text>
              <Text style={styles.summarySubtext}>{paidCount} דיירים</Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryLabel}>ממתינים</Text>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                {pendingCount}
              </Text>
              <Text style={styles.summarySubtext}>דיירים</Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryLabel}>באיחור</Text>
              <Text style={[styles.summaryValue, { color: '#f44336' }]}>
                {overdueCount}
              </Text>
              <Text style={styles.summarySubtext}>דיירים</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="חפש דייר..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {/* Residents List */}
        <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {filteredResidents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>אין דיירים פעילים</Text>
                <Text style={styles.emptySubtext}>הוסף דיירים במסך ניהול דיירים</Text>
              </Card.Content>
            </Card>
          ) : (
            filteredResidents.map((resident) => (
              <Card key={resident.id} style={styles.residentCard}>
                <Card.Content>
                  <View style={styles.residentHeader}>
                    <View style={styles.residentInfo}>
                      <View style={styles.apartmentBadge}>
                        <Text style={styles.apartmentNumber}>{resident.apartmentNumber}</Text>
                      </View>
                      <Text style={styles.residentName}>{resident.name}</Text>
                    </View>
                    <Chip
                      style={[styles.statusChip, { backgroundColor: getStatusColor(resident.status) + '20' }]}
                      textStyle={[styles.statusText, { color: getStatusColor(resident.status) }]}
                    >
                      {getStatusText(resident.status)}
                    </Chip>
                  </View>

                  <View style={styles.residentDetails}>
                    <TouchableOpacity style={styles.detailRow} onPress={() => handleEditFee(resident)}>
                      <View style={styles.feeEditRow}>
                        <Text style={styles.detailValue}>₪{resident.monthlyFee}</Text>
                        <MaterialCommunityIcons name="pencil" size={16} color="#2196F3" />
                      </View>
                      <Text style={styles.detailLabel}>סכום</Text>
                    </TouchableOpacity>

                    {resident.status === 'paid' && resident.paidDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>
                          {resident.paidDate.toLocaleDateString('he-IL')}
                        </Text>
                        <Text style={styles.detailLabel}>תאריך תשלום</Text>
                      </View>
                    )}
                  </View>

                  {resident.status !== 'paid' && (
                    <View style={styles.actionButtons}>
                      <Button
                        mode="contained"
                        onPress={() => handleRecordPayment(resident)}
                        style={styles.payButton}
                        icon="cash-check"
                      >
                        רשום תשלום
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleSendReminder(resident)}
                        style={styles.reminderButton}
                        icon="whatsapp"
                        textColor="#25D366"
                      >
                        תזכורת
                      </Button>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
      </View>

      {/* Edit Fee Modal */}
      <Portal>
        <Modal visible={editModalVisible} onDismiss={() => setEditModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>עדכון דמי ועד</Text>
          <Text style={styles.modalSubtitle}>{selectedResident?.name}</Text>
          <TextInput
            label="דמי ועד חודשיים (₪)"
            value={newMonthlyFee}
            onChangeText={setNewMonthlyFee}
            keyboardType="numeric"
            mode="outlined"
            style={styles.modalInput}
          />
          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setEditModalVisible(false)} style={styles.modalButton}>
              ביטול
            </Button>
            <Button mode="contained" onPress={handleSaveFee} style={styles.modalButton}>
              שמור
            </Button>
          </View>
        </Modal>
      </Portal>
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
  summaryGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  summarySubtext: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  searchBar: {
    marginBottom: 16,
  },
  list: {
    flex: 1,
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
  residentCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  residentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  residentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  apartmentBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  apartmentNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  residentName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  residentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feeEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  payButton: {
    flex: 1,
  },
  reminderButton: {
    flex: 1,
    borderColor: '#25D366',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
