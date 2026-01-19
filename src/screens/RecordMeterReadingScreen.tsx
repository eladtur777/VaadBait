import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChargingStationsService,
  ChargingStation,
  MeterReadingsService,
  MeterReading,
  SettingsService
} from '../services/firebaseService';

export default function RecordMeterReadingScreen({ navigation }: any) {
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [showStationPicker, setShowStationPicker] = useState(false);

  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [previousReading, setPreviousReading] = useState('0');
  const [currentReading, setCurrentReading] = useState('');
  const [readingDate, setReadingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [costPerKwh, setCostPerKwh] = useState('0.55');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastReading, setLastReading] = useState<MeterReading | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stationsData, settings] = await Promise.all([
        ChargingStationsService.getAll(),
        SettingsService.get()
      ]);
      // Only show active stations
      setStations(stationsData.filter(s => s.isActive));
      if (settings?.kwhPrice) {
        setCostPerKwh(settings.kwhPrice.toString());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את הנתונים');
    } finally {
      setLoadingStations(false);
    }
  };

  const handleSelectStation = async (station: ChargingStation) => {
    setSelectedStation(station);
    setShowStationPicker(false);

    // Load last reading for this station
    try {
      const readings = await MeterReadingsService.getAll();
      const stationReadings = readings.filter(r => r.stationId === station.id);
      if (stationReadings.length > 0) {
        // Get the most recent reading
        const latest = stationReadings.sort((a, b) => {
          const dateA = a.readingDate instanceof Date ? a.readingDate : new Date(a.readingDate);
          const dateB = b.readingDate instanceof Date ? b.readingDate : new Date(b.readingDate);
          return dateB.getTime() - dateA.getTime();
        })[0];
        setLastReading(latest);
        setPreviousReading(latest.currentReading.toString());
      } else {
        setLastReading(null);
        setPreviousReading('0');
      }
    } catch (error) {
      console.error('Error loading readings:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setReadingDate(selectedDate);
    }
  };

  // Calculate kWh used and total cost
  const kwhUsed = currentReading ? parseFloat(currentReading) - parseFloat(previousReading) : 0;
  const totalCost = kwhUsed * parseFloat(costPerKwh || '0');

  const handleSave = async () => {
    if (!selectedStation) {
      Alert.alert('שגיאה', 'נא לבחור עמדת טעינה');
      return;
    }

    if (!currentReading || parseFloat(currentReading) <= parseFloat(previousReading)) {
      Alert.alert('שגיאה', 'הקריאה הנוכחית חייבת להיות גדולה מהקריאה הקודמת');
      return;
    }

    setSaving(true);
    try {
      const readingData: Omit<MeterReading, 'id'> = {
        stationId: selectedStation.id!,
        previousReading: parseFloat(previousReading),
        currentReading: parseFloat(currentReading),
        consumption: kwhUsed,
        pricePerKwh: parseFloat(costPerKwh),
        totalCost: totalCost,
        month: readingDate.getMonth() + 1,
        year: readingDate.getFullYear(),
        readingDate: readingDate,
        isPaid: false,
      };

      await MeterReadingsService.add(readingData);

      Alert.alert(
        'הצלחה',
        `הקריאה נשמרה בהצלחה!\nצריכה: ${kwhUsed.toFixed(2)} קוט"ש\nסך לתשלום: ₪${totalCost.toFixed(2)}`,
        [{ text: 'אישור', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving reading:', error);
      Alert.alert('שגיאה', 'לא ניתן לשמור את הקריאה');
    } finally {
      setSaving(false);
    }
  };

  if (loadingStations) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>טוען עמדות...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>רשום קריאת מונה</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Station Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowStationPicker(!showStationPicker)}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons name="ev-station" size={24} color="#666" />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>עמדת טעינה *</Text>
                  <Text style={styles.selectValue}>
                    {selectedStation
                      ? `${selectedStation.residentName} - דירה ${selectedStation.apartmentNumber}`
                      : 'בחר עמדה'}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showStationPicker ? "chevron-down" : "chevron-left"}
                  size={24}
                  color="#666"
                />
              </View>
            </TouchableOpacity>

            {showStationPicker && (
              <View style={styles.stationList}>
                {stations.length === 0 ? (
                  <Text style={styles.noStationsText}>
                    אין עמדות טעינה פעילות. הוסף עמדות דרך מסך הטעינה.
                  </Text>
                ) : (
                  stations.map((station) => (
                    <TouchableOpacity
                      key={station.id}
                      style={[
                        styles.stationItem,
                        selectedStation?.id === station.id && styles.stationItemSelected
                      ]}
                      onPress={() => handleSelectStation(station)}
                    >
                      <View style={styles.stationInfo}>
                        <Text style={[
                          styles.stationName,
                          selectedStation?.id === station.id && styles.stationNameSelected
                        ]}>
                          {station.residentName}
                        </Text>
                        <Text style={[
                          styles.stationApartment,
                          selectedStation?.id === station.id && styles.stationApartmentSelected
                        ]}>
                          דירה {station.apartmentNumber}
                          {station.meterNumber && ` | מונה: ${station.meterNumber}`}
                        </Text>
                      </View>
                      {selectedStation?.id === station.id && (
                        <MaterialCommunityIcons name="check" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
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
              editable={!lastReading}
              right={<TextInput.Icon icon="counter" />}
            />
            <Text style={styles.helperText}>
              {lastReading
                ? `קריאה אחרונה מתאריך ${(lastReading.readingDate instanceof Date ? lastReading.readingDate : new Date(lastReading.readingDate)).toLocaleDateString('he-IL')}`
                : 'אין קריאות קודמות - הזן את הקריאה הראשונית מהמונה'}
            </Text>
          </Card.Content>
        </Card>

        {/* Current Reading */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label='קריאה נוכחית (קוט"ש)'
              value={currentReading}
              onChangeText={setCurrentReading}
              keyboardType="numeric"
              mode="outlined"
              placeholder="180.5"
              right={<TextInput.Icon icon="counter" />}
            />
            <Text style={styles.helperText}>
              הקריאה הנוכחית מהמונה
            </Text>
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

        {/* Cost per kWh */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label='מחיר לקוט"ש (₪)'
              value={costPerKwh}
              onChangeText={setCostPerKwh}
              keyboardType="numeric"
              mode="outlined"
              right={<TextInput.Icon icon="cash" />}
            />
            <Text style={styles.helperText}>
              המחיר הנוכחי לפי הגדרות המערכת
            </Text>
          </Card.Content>
        </Card>

        {/* Calculation Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>סיכום חישוב</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {kwhUsed.toFixed(2)} קוט"ש
              </Text>
              <Text style={styles.summaryLabel}>צריכה</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                ₪{costPerKwh}
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

        {/* Notes */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="הערות (אופציונלי)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={2}
            />
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
          disabled={saving || !selectedStation || !currentReading || parseFloat(currentReading) <= parseFloat(previousReading)}
        >
          שמור קריאה וצור חשבון
        </Button>

        {!selectedStation && (
          <Text style={styles.errorText}>נא לבחור עמדת טעינה</Text>
        )}

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
  stationList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  noStationsText: {
    textAlign: 'center',
    color: '#999',
    padding: 16,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  stationItemSelected: {
    backgroundColor: '#4CAF50',
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  stationNameSelected: {
    color: '#fff',
  },
  stationApartment: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  stationApartmentSelected: {
    color: '#E8F5E9',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
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
