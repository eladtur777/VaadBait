import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Linking, Platform, Modal, Image, Dimensions } from 'react-native';
import { Card, ActivityIndicator, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
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
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);

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
        // Find resident by apartment number to get updated name and phone
        // Trim and normalize apartment numbers for comparison
        const resident = residentsData.find(r =>
          r.apartmentNumber?.toString().trim() === station?.apartmentNumber?.toString().trim()
        );
        return {
          ...reading,
          // Use resident name from residents list (most up-to-date) or fall back to station name
          stationName: resident?.name || station?.residentName || 'לא ידוע',
          apartmentNumber: station?.apartmentNumber || '',
          residentPhone: resident?.phone,
        };
      });

      setBills(billsWithStations);
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

  const doTogglePaid = async (bill: BillWithStation) => {
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

      const successMsg = newIsPaid ? 'החשבון סומן כשולם' : 'החשבון סומן כלא שולם';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('עודכן', successMsg);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      const errorMsg = 'לא ניתן לעדכן את סטטוס התשלום';
      if (Platform.OS === 'web') {
        window.alert('שגיאה: ' + errorMsg);
      } else {
        Alert.alert('שגיאה', errorMsg);
      }
    }
  };

  const handleTogglePaid = (bill: BillWithStation) => {
    // If already paid, ask for confirmation before cancelling
    if (bill.isPaid) {
      const confirmMsg = `האם לבטל את התשלום של ₪${bill.totalCost.toFixed(2)} עבור ${bill.stationName}?`;
      if (Platform.OS === 'web') {
        if (window.confirm(confirmMsg)) {
          doTogglePaid(bill);
        }
      } else {
        Alert.alert(
          'ביטול תשלום',
          confirmMsg,
          [
            { text: 'לא', style: 'cancel' },
            { text: 'כן, בטל', style: 'destructive', onPress: () => doTogglePaid(bill) },
          ]
        );
      }
    } else {
      // Mark as paid directly
      doTogglePaid(bill);
    }
  };

  const generateBillPDF = async (bill: BillWithStation) => {
    const readingDate = bill.readingDate instanceof Date ? bill.readingDate : new Date(bill.readingDate);

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              direction: rtl;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #4CAF50;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            h1 {
              color: #4CAF50;
              margin-bottom: 5px;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
            }
            .bill-info {
              background-color: #f5f5f5;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #ddd;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              color: #666;
            }
            .value {
              font-weight: bold;
              color: #333;
            }
            .readings-section {
              background-color: #E3F2FD;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .readings-title {
              font-size: 16px;
              font-weight: bold;
              color: #1976D2;
              margin-bottom: 15px;
            }
            .total-section {
              background-color: #E8F5E9;
              padding: 25px;
              border-radius: 8px;
              text-align: center;
            }
            .total-label {
              font-size: 16px;
              color: #2E7D32;
              margin-bottom: 10px;
            }
            .total-amount {
              font-size: 36px;
              font-weight: bold;
              color: #2E7D32;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>⚡ חשבון טעינת רכב חשמלי</h1>
            <div class="subtitle">ועד הבית - עונות השנה 23</div>
          </div>

          <div class="bill-info">
            <div class="info-row">
              <span class="label">שם הדייר:</span>
              <span class="value">${bill.stationName}</span>
            </div>
            <div class="info-row">
              <span class="label">מספר דירה:</span>
              <span class="value">${bill.apartmentNumber}</span>
            </div>
            <div class="info-row">
              <span class="label">תקופת חיוב:</span>
              <span class="value">${monthNames[bill.month - 1]} ${bill.year}</span>
            </div>
            <div class="info-row">
              <span class="label">תאריך קריאה:</span>
              <span class="value">${readingDate.toLocaleDateString('he-IL')}</span>
            </div>
          </div>

          <div class="readings-section">
            <div class="readings-title">פרטי קריאת מונה</div>
            <div class="info-row">
              <span class="label">קריאה קודמת:</span>
              <span class="value">${bill.previousReading.toFixed(2)} kWh</span>
            </div>
            <div class="info-row">
              <span class="label">קריאה נוכחית:</span>
              <span class="value">${bill.currentReading.toFixed(2)} kWh</span>
            </div>
            <div class="info-row">
              <span class="label">צריכה:</span>
              <span class="value">${bill.consumption.toFixed(2)} kWh</span>
            </div>
            <div class="info-row">
              <span class="label">מחיר לקוט"ש:</span>
              <span class="value">₪${bill.pricePerKwh.toFixed(2)}</span>
            </div>
          </div>

          <div class="total-section">
            <div class="total-label">סכום לתשלום</div>
            <div class="total-amount">₪${bill.totalCost.toFixed(2)}</div>
          </div>

          <div class="footer">
            <p>חשבון זה הופק אוטומטית ע"י מערכת ועד הבית</p>
            <p>תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}</p>
          </div>
        </body>
      </html>
    `;

    return html;
  };

  const handleSendReminder = async (bill: BillWithStation) => {
    if (!bill.residentPhone) {
      if (Platform.OS === 'web') {
        window.alert('לא קיים מספר טלפון לדייר זה');
      } else {
        Alert.alert('שגיאה', 'לא קיים מספר טלפון לדייר זה');
      }
      return;
    }

    // Build message with previous and current readings
    const message = `שלום ${bill.stationName},
תזכורת לתשלום חשבון טעינת רכב לחודש ${monthNames[bill.month - 1]} ${bill.year}.

📊 פרטי הקריאה:
• קריאה קודמת: ${bill.previousReading.toFixed(2)} kWh
• קריאה נוכחית: ${bill.currentReading.toFixed(2)} kWh
• צריכה: ${bill.consumption.toFixed(2)} kWh
• מחיר לקוט"ש: ₪${bill.pricePerKwh.toFixed(2)}

💰 סכום לתשלום: ₪${bill.totalCost.toFixed(2)}

תודה, ועד הבית עונות השנה 23`;

    const phoneNumber = bill.residentPhone.replace(/[^0-9]/g, '');
    const israelPhone = phoneNumber.startsWith('0') ? '972' + phoneNumber.slice(1) : phoneNumber;

    if (Platform.OS === 'web') {
      // For web: open PDF in new window for printing, then open WhatsApp
      try {
        const html = await generateBillPDF(bill);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
      }

      // Open WhatsApp Web with message
      const webWhatsappUrl = `https://wa.me/${israelPhone}?text=${encodeURIComponent(message)}`;
      window.open(webWhatsappUrl, '_blank');
    } else {
      // For mobile: Generate PDF and share directly to WhatsApp
      try {
        const html = await generateBillPDF(bill);
        const { uri } = await Print.printToFileAsync({ html });

        // Copy message to clipboard so user can paste it after sharing PDF
        await Clipboard.setStringAsync(message);

        if (await Sharing.isAvailableAsync()) {
          // Show instructions to user
          Alert.alert(
            'שליחת חשבון',
            'ההודעה הועתקה ללוח.\n\n1. בחר WhatsApp מתפריט השיתוף\n2. שלח את ה-PDF\n3. הדבק את ההודעה (לחיצה ארוכה → הדבק)',
            [
              {
                text: 'המשך',
                onPress: async () => {
                  await Sharing.shareAsync(uri, {
                    UTI: '.pdf',
                    mimeType: 'application/pdf',
                    dialogTitle: `חשבון טעינה - ${bill.stationName}`,
                  });
                }
              }
            ]
          );
        } else {
          // Fallback to WhatsApp URL if sharing not available
          const whatsappUrl = `whatsapp://send?phone=${israelPhone}&text=${encodeURIComponent(message)}`;
          Linking.openURL(whatsappUrl);
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
        // Fallback to just WhatsApp message
        const whatsappUrl = `whatsapp://send?phone=${israelPhone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(whatsappUrl);
      }
    }
  };

  const isPdfReceipt = (receipt: string) => {
    return receipt?.startsWith('data:application/pdf');
  };

  const handleViewReceipt = (bill: BillWithStation) => {
    const receiptImage = bill.receiptImageBase64;
    if (receiptImage) {
      if (isPdfReceipt(receiptImage)) {
        if (Platform.OS === 'web') {
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
                      {bill.receiptImageBase64 ? (
                        <TouchableOpacity
                          style={styles.receiptIconButton}
                          onPress={() => handleViewReceipt(bill)}
                        >
                          <MaterialCommunityIcons name="image" size={24} color="#4CAF50" />
                        </TouchableOpacity>
                      ) : null}
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
