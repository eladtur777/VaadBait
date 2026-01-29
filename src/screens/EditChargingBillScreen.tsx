import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  MeterReadingsService,
  MeterReading,
  ChargingStationsService,
  ChargingStation,
} from '../services/firebaseService';

export default function EditChargingBillScreen({ navigation, route }: any) {
  const bill: MeterReading = route?.params?.bill;
  const [station, setStation] = useState<ChargingStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [previousReading, setPreviousReading] = useState(bill?.previousReading?.toString() || '0');
  const [currentReading, setCurrentReading] = useState(bill?.currentReading?.toString() || '0');
  const [pricePerKwh, setPricePerKwh] = useState(bill?.pricePerKwh?.toString() || '0.55');
  const [readingDate, setReadingDate] = useState(
    bill?.readingDate instanceof Date ? bill.readingDate : new Date(bill?.readingDate || Date.now())
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPaid, setIsPaid] = useState(bill?.isPaid || false);
  const [paidDate, setPaidDate] = useState<Date | undefined>(
    bill?.paidDate instanceof Date ? bill.paidDate : bill?.paidDate ? new Date(bill.paidDate) : undefined
  );
  const [showPaidDatePicker, setShowPaidDatePicker] = useState(false);

  useEffect(() => {
    loadStation();
  }, []);

  const loadStation = async () => {
    try {
      if (bill?.stationId) {
        const stations = await ChargingStationsService.getAll();
        const foundStation = stations.find(s => s.id === bill.stationId);
        setStation(foundStation || null);
      }
    } catch (error) {
      console.error('Error loading station:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setReadingDate(selectedDate);
    }
  };

  const handlePaidDateChange = (event: any, selectedDate?: Date) => {
    setShowPaidDatePicker(false);
    if (selectedDate) {
      setPaidDate(selectedDate);
    }
  };

  // Calculate consumption and total cost
  const consumption = parseFloat(currentReading) - parseFloat(previousReading);
  const totalCost = consumption * parseFloat(pricePerKwh || '0');

  const handleSave = async () => {
    if (!currentReading || parseFloat(currentReading) <= parseFloat(previousReading)) {
      Alert.alert('שגיאה', 'הקריאה הנוכחית חייבת להיות גדולה מהקריאה הקודמת');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        previousReading: parseFloat(previousReading),
        currentReading: parseFloat(currentReading),
        consumption: consumption,
        pricePerKwh: parseFloat(pricePerKwh),
        totalCost: totalCost,
        month: readingDate.getMonth() + 1,
        year: readingDate.getFullYear(),
        readingDate: readingDate,
        isPaid: isPaid,
      };

      // Only include paidDate if payment was made
      if (isPaid && paidDate) {
        updateData.paidDate = paidDate;
      }

      await MeterReadingsService.update(bill.id!, updateData);

      Alert.alert('הצלחה', 'החשבון עודכן בהצלחה', [
        { text: 'אישור', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving bill:', error);
      Alert.alert('שגיאה', 'לא ניתן לשמור את החשבון');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'מחק חשבון',
      'האם אתה בטוח שברצונך למחוק חשבון זה? פעולה זו אינה ניתנת לביטול.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await MeterReadingsService.delete(bill.id!);
              Alert.alert('הצלחה', 'החשבון נמחק בהצלחה', [
                { text: 'אישור', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Error deleting bill:', error);
              Alert.alert('שגיאה', 'לא ניתן למחוק את החשבון');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>עריכת חשבון</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Station Info (Read-only) */}
        <Card style={styles.stationCard}>
          <Card.Content>
            <View style={styles.stationInfo}>
              <MaterialCommunityIcons name="ev-station" size={32} color="#4CAF50" />
              <View style={styles.stationText}>
                <Text style={styles.stationName}>{station?.residentName || 'לא ידוע'}</Text>
                <Text style={styles.stationApartment}>דירה {station?.apartmentNumber || ''}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Previous Reading */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label='קריאה קודמת (קוט"ש)'
              value={previousReading}
              onChangeText={setPreviousReading}
              mode="outlined"
              keyboardType="numeric"
              right={<TextInput.Icon icon="counter" />}
            />
          </Card.Content>
        </Card>

        {/* Current Reading */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label='קריאה נוכחית (קוט"ש)'
              value={currentReading}
              onChangeText={setCurrentReading}
              mode="outlined"
              keyboardType="numeric"
              right={<TextInput.Icon icon="counter" />}
            />
          </Card.Content>
        </Card>

        {/* Price per kWh */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label='מחיר לקוט"ש (₪)'
              value={pricePerKwh}
              onChangeText={setPricePerKwh}
              mode="outlined"
              keyboardType="numeric"
              right={<TextInput.Icon icon="cash" />}
            />
          </Card.Content>
        </Card>

        {/* Reading Date */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons name="calendar" size={24} color="#666" />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>תאריך קריאה</Text>
                  <Text style={styles.selectValue}>
                    {readingDate.toLocaleDateString('he-IL')}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {showDatePicker && (
          <DateTimePicker
            value={readingDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {/* Payment Status */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                setIsPaid(!isPaid);
                if (!isPaid) {
                  setPaidDate(new Date());
                }
              }}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons
                  name={isPaid ? "check-circle" : "circle-outline"}
                  size={24}
                  color={isPaid ? "#4CAF50" : "#666"}
                />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>סטטוס תשלום</Text>
                  <Text style={[styles.selectValue, { color: isPaid ? '#4CAF50' : '#f44336' }]}>
                    {isPaid ? 'שולם' : 'לא שולם'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Paid Date (only if paid) */}
        {isPaid && (
          <Card style={styles.card}>
            <Card.Content>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowPaidDatePicker(true)}
              >
                <View style={styles.selectContent}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color="#4CAF50" />
                  <View style={styles.selectText}>
                    <Text style={styles.selectLabel}>תאריך תשלום</Text>
                    <Text style={styles.selectValue}>
                      {paidDate ? paidDate.toLocaleDateString('he-IL') : 'בחר תאריך'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
                </View>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        {showPaidDatePicker && (
          <DateTimePicker
            value={paidDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handlePaidDateChange}
          />
        )}

        {/* Calculation Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>סיכום חישוב</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {consumption.toFixed(2)} קוט"ש
              </Text>
              <Text style={styles.summaryLabel}>צריכה</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                ₪{pricePerKwh}
              </Text>
              <Text style={styles.summaryLabel}>מחיר לקוט"ש</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalValue}>
                ₪{totalCost.toFixed(2)}
              </Text>
              <Text style={styles.totalLabel}>סך לתשלום</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          buttonColor="#4CAF50"
          icon="check"
          loading={saving}
          disabled={saving || deleting || parseFloat(currentReading) <= parseFloat(previousReading)}
        >
          שמור שינויים
        </Button>

        {/* Delete Button */}
        <Button
          mode="outlined"
          onPress={handleDelete}
          style={styles.deleteButton}
          textColor="#f44336"
          icon="delete"
          loading={deleting}
          disabled={saving || deleting}
        >
          מחק חשבון
        </Button>

        {parseFloat(currentReading) <= parseFloat(previousReading) && currentReading && (
          <Text style={styles.errorText}>
            הקריאה הנוכחית חייבת להיות גדולה מהקריאה הקודמת
          </Text>
        )}

        <View style={styles.spacer} />
      </View>
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
    padding: 16,
  },
  stationCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationText: {
    flex: 1,
    marginRight: 12,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  stationApartment: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  selectButton: {
    borderRadius: 8,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectText: {
    flex: 1,
    marginHorizontal: 12,
  },
  selectLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  selectValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
    textAlign: 'right',
  },
  summaryCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#4CAF50',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  saveButton: {
    marginTop: 8,
  },
  deleteButton: {
    marginTop: 12,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  spacer: {
    height: 32,
  },
});
