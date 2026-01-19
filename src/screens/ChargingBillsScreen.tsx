import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Linking } from 'react-native';
import { Card, ActivityIndicator, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChargingStationsService,
  ChargingStation,
  MeterReadingsService,
  MeterReading,
  ResidentsService,
  Resident,
} from '../services/firebaseService';

interface BillWithStation extends MeterReading {
  stationName: string;
  apartmentNumber: string;
  residentPhone?: string;
}

export default function ChargingBillsScreen({ navigation }: any) {
  const [bills, setBills] = useState<BillWithStation[]>([]);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
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
      const [stationsData, readingsData, residentsData] = await Promise.all([
        ChargingStationsService.getAll(),
        MeterReadingsService.getAll(),
        ResidentsService.getAll(),
      ]);

      setStations(stationsData);

      // Combine readings with station info and resident phone
      const billsWithStations: BillWithStation[] = readingsData.map(reading => {
        const station = stationsData.find(s => s.id === reading.stationId);
        // Find resident by apartment number to get phone
        const resident = residentsData.find(r => r.apartmentNumber === station?.apartmentNumber);
        return {
          ...reading,
          stationName: station?.residentName || 'לא ידוע',
          apartmentNumber: station?.apartmentNumber || '',
          residentPhone: resident?.phone,
        };
      });

      setBills(billsWithStations);
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
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTogglePaid = async (bill: BillWithStation) => {
    try {
      const newIsPaid = !bill.isPaid;
      await MeterReadingsService.update(bill.id!, {
        isPaid: newIsPaid,
        paidDate: newIsPaid ? new Date() : undefined,
      });

      setBills(bills.map(b =>
        b.id === bill.id
          ? { ...b, isPaid: newIsPaid, paidDate: newIsPaid ? new Date() : undefined }
          : b
      ));

      Alert.alert(
        'עודכן',
        newIsPaid ? 'החשבון סומן כשולם' : 'החשבון סומן כלא שולם'
      );
    } catch (error) {
      console.error('Error updating payment status:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן את סטטוס התשלום');
    }
  };

  const handleSendReminder = (bill: BillWithStation) => {
    if (!bill.residentPhone) {
      Alert.alert('שגיאה', 'לא קיים מספר טלפון לדייר זה');
      return;
    }

    const message = `שלום ${bill.stationName},\nתזכורת לתשלום חשבון טעינת רכב לחודש ${monthNames[bill.month - 1]} ${bill.year} בסך ₪${bill.totalCost.toFixed(2)}.\nצריכה: ${bill.consumption.toFixed(2)} קוט"ש\nתודה, ועד הבית עונות השנה 23`;
    const phoneNumber = bill.residentPhone.replace(/[^0-9]/g, '');
    const israelPhone = phoneNumber.startsWith('0') ? '972' + phoneNumber.slice(1) : phoneNumber;
    const whatsappUrl = `whatsapp://send?phone=${israelPhone}&text=${encodeURIComponent(message)}`;
    const smsUrl = `sms:${bill.residentPhone}?body=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
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
      })
      .catch(err => {
        console.error('Error opening WhatsApp:', err);
        Linking.openURL(smsUrl);
      });
  };

  // First filter by selected month
  const monthlyBills = bills.filter(bill =>
    bill.month === selectedMonth + 1 && bill.year === selectedYear
  );

  // Then apply paid/unpaid filter
  const filteredBills = monthlyBills.filter(bill => {
    if (filter === 'unpaid') return !bill.isPaid;
    if (filter === 'paid') return bill.isPaid;
    return true;
  });

  // Calculate totals for selected month
  const totalUnpaid = monthlyBills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.totalCost, 0);
  const totalPaid = monthlyBills.filter(b => b.isPaid).reduce((sum, b) => sum + b.totalCost, 0);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('he-IL');
  };

  const getMonthName = (month: number) => {
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return months[month - 1] || '';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>טוען חשבונות...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>חשבונות טעינה</Text>
      </SafeAreaView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Month Selector */}
        <View style={styles.monthSelectorContainer}>
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
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={styles.unpaidCard}>
            <Card.Content>
              <Text style={styles.summaryLabel}>ממתין לתשלום</Text>
              <Text style={styles.unpaidAmount}>₪{totalUnpaid.toFixed(2)}</Text>
            </Card.Content>
          </Card>

          <Card style={styles.paidCard}>
            <Card.Content>
              <Text style={styles.summaryLabel}>שולם</Text>
              <Text style={styles.paidAmount}>₪{totalPaid.toFixed(2)}</Text>
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
            הכל ({monthlyBills.length})
          </Chip>
          <Chip
            selected={filter === 'unpaid'}
            onPress={() => setFilter('unpaid')}
            style={[styles.chip, filter === 'unpaid' && styles.chipUnpaid]}
            textStyle={filter === 'unpaid' ? styles.chipTextSelected : undefined}
          >
            לא שולם ({monthlyBills.filter(b => !b.isPaid).length})
          </Chip>
          <Chip
            selected={filter === 'paid'}
            onPress={() => setFilter('paid')}
            style={[styles.chip, filter === 'paid' && styles.chipPaid]}
            textStyle={filter === 'paid' ? styles.chipTextSelected : undefined}
          >
            שולם ({monthlyBills.filter(b => b.isPaid).length})
          </Chip>
        </View>

        {/* Bills List */}
        <View style={styles.content}>
          {filteredBills.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>אין חשבונות להצגה</Text>
                <Text style={styles.emptySubtext}>רשום קריאות מונה כדי ליצור חשבונות</Text>
              </Card.Content>
            </Card>
          ) : (
            filteredBills.map((bill) => (
              <Card key={bill.id} style={styles.billCard}>
                <Card.Content>
                  <View style={styles.billHeader}>
                    <View style={styles.billInfo}>
                      <View style={[
                        styles.billIcon,
                        { backgroundColor: bill.isPaid ? '#E8F5E9' : '#FFEBEE' }
                      ]}>
                        <MaterialCommunityIcons
                          name="ev-station"
                          size={24}
                          color={bill.isPaid ? '#4CAF50' : '#f44336'}
                        />
                      </View>
                      <View style={styles.billText}>
                        <Text style={styles.billName}>{bill.stationName}</Text>
                        <Text style={styles.billApartment}>דירה {bill.apartmentNumber}</Text>
                        <Text style={styles.billPeriod}>
                          {getMonthName(bill.month)} {bill.year}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.billAmount}>
                      <Text style={[
                        styles.amountText,
                        bill.isPaid ? styles.paidAmountText : styles.unpaidAmountText
                      ]}>
                        ₪{bill.totalCost.toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.statusBadge,
                          bill.isPaid ? styles.paidBadge : styles.unpaidBadge
                        ]}
                        onPress={() => handleTogglePaid(bill)}
                      >
                        <Text style={[
                          styles.statusText,
                          { color: bill.isPaid ? '#2E7D32' : '#C62828' }
                        ]}>
                          {bill.isPaid ? 'שולם ✓' : 'לא שולם'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.billDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailValue}>{bill.consumption.toFixed(2)} קוט"ש</Text>
                      <Text style={styles.detailLabel}>צריכה:</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailValue}>₪{bill.pricePerKwh.toFixed(2)}</Text>
                      <Text style={styles.detailLabel}>מחיר לקוט"ש:</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailValue}>{formatDate(bill.readingDate)}</Text>
                      <Text style={styles.detailLabel}>תאריך קריאה:</Text>
                    </View>
                    {bill.isPaid && bill.paidDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{formatDate(bill.paidDate)}</Text>
                        <Text style={styles.detailLabel}>תאריך תשלום:</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => navigation.navigate('EditChargingBill', { bill })}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#2196F3" />
                      <Text style={styles.editButtonText}>ערוך</Text>
                    </TouchableOpacity>

                    {!bill.isPaid && (
                      <TouchableOpacity
                        style={styles.reminderButton}
                        onPress={() => handleSendReminder(bill)}
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
  monthSelectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  monthCard: {
    backgroundColor: '#fff',
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  unpaidCard: {
    flex: 1,
    backgroundColor: '#FFEBEE',
  },
  paidCard: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 4,
  },
  unpaidAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C62828',
    textAlign: 'right',
  },
  paidAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'right',
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
    backgroundColor: '#4CAF50',
  },
  chipUnpaid: {
    backgroundColor: '#f44336',
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
  billCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  billIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  billText: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  billApartment: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  billPeriod: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    textAlign: 'right',
  },
  billAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paidAmountText: {
    color: '#2E7D32',
  },
  unpaidAmountText: {
    color: '#C62828',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  paidBadge: {
    backgroundColor: '#E8F5E9',
  },
  unpaidBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  billDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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
