import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, List, IconButton, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChargingStationsService,
  ChargingStation,
  MeterReadingsService,
  MeterReading,
  SettingsService
} from '../services/firebaseService';

export default function ChargingStationScreen({ navigation }: any) {
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kwhPrice, setKwhPrice] = useState(0);
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
      const [stationsData, readingsData, settings] = await Promise.all([
        ChargingStationsService.getAll(),
        MeterReadingsService.getAll(),
        SettingsService.get()
      ]);
      setStations(stationsData);
      setReadings(readingsData);
      if (settings?.kwhPrice) {
        setKwhPrice(settings.kwhPrice);
      }
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

  const handleEditStation = (station: ChargingStation) => {
    navigation.navigate('AddChargingStation', { station });
  };

  const handleDeleteStation = async (stationId: string) => {
    const performDelete = async () => {
      try {
        await ChargingStationsService.delete(stationId);
        setStations(stations.filter(s => s.id !== stationId));
        if (Platform.OS === 'web') {
          window.alert('העמדה נמחקה בהצלחה');
        }
      } catch (error) {
        console.error('Error deleting station:', error);
        if (Platform.OS === 'web') {
          window.alert('לא ניתן למחוק את העמדה');
        } else {
          Alert.alert('שגיאה', 'לא ניתן למחוק את העמדה');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('האם אתה בטוח שברצונך למחוק עמדה זו?')) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'מחק עמדת טעינה',
        'האם אתה בטוח שברצונך למחוק עמדה זו?',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'מחק', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const handleToggleActive = async (station: ChargingStation) => {
    try {
      await ChargingStationsService.update(station.id!, {
        isActive: !station.isActive,
      });
      setStations(stations.map(s =>
        s.id === station.id ? { ...s, isActive: !s.isActive } : s
      ));
    } catch (error) {
      console.error('Error toggling station status:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לעדכן את סטטוס העמדה');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לעדכן את סטטוס העמדה');
      }
    }
  };

  // Calculate stats
  const activeStations = stations.filter(s => s.isActive).length;

  // Get selected month readings
  const selectedMonthReadings = readings.filter(r =>
    r.month === selectedMonth + 1 && r.year === selectedYear
  );

  const monthlyTotal = selectedMonthReadings.reduce((sum, r) => sum + r.totalCost, 0);
  const monthlyConsumption = selectedMonthReadings.reduce((sum, r) => sum + r.consumption, 0);
  const paidCount = selectedMonthReadings.filter(r => r.isPaid).length;
  const unpaidCount = selectedMonthReadings.length - paidCount;

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
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>עמדות טעינה</Text>
        </View>

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
          <View style={styles.summaryRow}>
            <Card style={styles.smallSummaryCard}>
              <Card.Content>
                <MaterialCommunityIcons name="ev-station" size={24} color="#4CAF50" />
                <Text style={styles.smallSummaryLabel}>עמדות פעילות</Text>
                <Text style={styles.smallSummaryAmount}>{activeStations}</Text>
              </Card.Content>
            </Card>

            <Card style={styles.smallSummaryCard}>
              <Card.Content>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFC107" />
                <Text style={styles.smallSummaryLabel}>קוט"ש</Text>
                <Text style={styles.smallSummaryAmount}>{monthlyConsumption.toFixed(1)}</Text>
              </Card.Content>
            </Card>

            <Card style={styles.smallSummaryCard}>
              <Card.Content>
                <MaterialCommunityIcons name="cash" size={24} color="#2196F3" />
                <Text style={styles.smallSummaryLabel}>מחיר קוט"ש</Text>
                <Text style={styles.smallSummaryAmount}>₪{kwhPrice.toFixed(2)}</Text>
              </Card.Content>
            </Card>
          </View>

          <Card style={styles.balanceCard}>
            <Card.Content>
              <Text style={styles.summaryLabel}>סה"כ לחודש {monthNames[selectedMonth]}</Text>
              <Text style={styles.balanceAmount}>₪{monthlyTotal.toLocaleString()}</Text>
              <View style={styles.paymentStatusRow}>
                <Text style={styles.paidText}>שולם: {paidCount}</Text>
                <Text style={styles.unpaidText}>לא שולם: {unpaidCount}</Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פעולות</Text>

          <Card style={styles.actionCard}>
            <List.Item
              title="הוסף עמדת טעינה"
              description="רשום עמדה חדשה לדייר"
              left={() => <List.Icon icon="ev-station" />}
              right={() => <List.Icon icon="chevron-left" />}
              onPress={() => navigation.navigate('AddChargingStation')}
            />
          </Card>

          <Card style={styles.actionCard}>
            <List.Item
              title="רשום קריאת מונה"
              description="תיעוד צריכת חשמל חודשית"
              left={() => <List.Icon icon="counter" />}
              right={() => <List.Icon icon="chevron-left" />}
              onPress={() => navigation.navigate('RecordMeterReading')}
            />
          </Card>

          <Card style={styles.actionCard}>
            <List.Item
              title='עדכן מחיר קוט"ש'
              description={`מחיר נוכחי: ₪${kwhPrice.toFixed(2)}`}
              left={() => <List.Icon icon="cash" />}
              right={() => <List.Icon icon="chevron-left" />}
              onPress={() => navigation.navigate('UpdateKwhPrice')}
            />
          </Card>

          <Card style={styles.actionCard}>
            <List.Item
              title="חשבונות טעינה"
              description="צפה בחשבונות וסמן תשלומים"
              left={() => <List.Icon icon="receipt" />}
              right={() => <List.Icon icon="chevron-left" />}
              onPress={() => navigation.navigate('ChargingBills')}
            />
          </Card>
        </View>

        {/* Charging Stations List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>עמדות טעינה ({stations.length})</Text>

          {stations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>אין עמדות טעינה רשומות</Text>
                <Text style={styles.emptySubtext}>לחץ על + להוספת עמדה ראשונה</Text>
              </Card.Content>
            </Card>
          ) : (
            stations.map((station) => (
              <Card key={station.id} style={styles.stationCard}>
                <Card.Content>
                  <View style={styles.stationHeader}>
                    <View style={styles.stationInfo}>
                      <View style={[
                        styles.stationIcon,
                        { backgroundColor: station.isActive ? '#E8F5E9' : '#FFEBEE' }
                      ]}>
                        <MaterialCommunityIcons
                          name="ev-station"
                          size={24}
                          color={station.isActive ? '#4CAF50' : '#f44336'}
                        />
                      </View>
                      <View style={styles.stationText}>
                        <Text style={styles.stationName}>{station.residentName}</Text>
                        <Text style={styles.stationApartment}>דירה {station.apartmentNumber}</Text>
                        {station.meterNumber && (
                          <Text style={styles.stationMeter}>מונה: {station.meterNumber}</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.statusBadge,
                        station.isActive ? styles.activeBadge : styles.inactiveBadge
                      ]}
                      onPress={() => handleToggleActive(station)}
                    >
                      <Text style={[
                        styles.statusText,
                        { color: station.isActive ? '#2E7D32' : '#C62828' }
                      ]}>
                        {station.isActive ? 'פעיל' : 'לא פעיל'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionButtons}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      iconColor="#2196F3"
                      onPress={() => handleEditStation(station)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor="#f44336"
                      onPress={() => handleDeleteStation(station.id!)}
                    />
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
  spacer: {
    height: 32,
  },
  header: {
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
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
    padding: 16,
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  smallSummaryCard: {
    flex: 1,
    backgroundColor: '#fff',
  },
  smallSummaryLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  smallSummaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  balanceCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 12,
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
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 20,
  },
  paidText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  unpaidText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  stationCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  stationText: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  stationApartment: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  stationMeter: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
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
});
