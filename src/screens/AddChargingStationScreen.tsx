import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChargingStationsService, ResidentsService, Resident } from '../services/firebaseService';

export default function AddChargingStationScreen({ navigation, route }: any) {
  const editingStation = route?.params?.station;
  const isEditing = !!editingStation;

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [showResidentPicker, setShowResidentPicker] = useState(false);

  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [meterNumber, setMeterNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [installedDate, setInstalledDate] = useState(new Date());

  useEffect(() => {
    loadResidents();
  }, []);

  useEffect(() => {
    if (editingStation) {
      setMeterNumber(editingStation.meterNumber || '');
      // Find the resident from the list
      if (editingStation.apartmentNumber && residents.length > 0) {
        const resident = residents.find(r => r.apartmentNumber === editingStation.apartmentNumber);
        if (resident) {
          setSelectedResident(resident);
        }
      }
    }
  }, [editingStation, residents]);

  const loadResidents = async () => {
    try {
      const data = await ResidentsService.getAll();
      setResidents(data.filter(r => r.isActive));
    } catch (error) {
      console.error('Error loading residents:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את רשימת הדיירים');
    } finally {
      setLoadingResidents(false);
    }
  };

  const handleSelectResident = (resident: Resident) => {
    setSelectedResident(resident);
    setShowResidentPicker(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setInstalledDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!selectedResident) {
      Alert.alert('שגיאה', 'נא לבחור דייר');
      return;
    }

    setSaving(true);
    try {
      const stationData = {
        apartmentNumber: selectedResident.apartmentNumber,
        residentName: selectedResident.name,
        meterNumber: meterNumber || undefined,
        isActive: true,
      };

      if (isEditing && editingStation.id) {
        await ChargingStationsService.update(editingStation.id, stationData);
        Alert.alert('הצלחה', 'העמדה עודכנה בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      } else {
        await ChargingStationsService.add(stationData);
        Alert.alert('הצלחה', 'העמדה נוספה בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving station:', error);
      Alert.alert('שגיאה', 'לא ניתן לשמור את העמדה');
    } finally {
      setSaving(false);
    }
  };

  if (loadingResidents) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>טוען דיירים...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'עריכת עמדת טעינה' : 'הוסף עמדת טעינה'}</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Resident Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowResidentPicker(!showResidentPicker)}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons name="account" size={24} color="#666" />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>דייר *</Text>
                  <Text style={styles.selectValue}>
                    {selectedResident
                      ? `${selectedResident.name} - דירה ${selectedResident.apartmentNumber}`
                      : 'בחר דייר'}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showResidentPicker ? "chevron-down" : "chevron-left"}
                  size={24}
                  color="#666"
                />
              </View>
            </TouchableOpacity>

            {showResidentPicker && (
              <View style={styles.residentList}>
                {residents.length === 0 ? (
                  <Text style={styles.noResidentsText}>
                    אין דיירים רשומים. הוסף דיירים דרך מסך הועד.
                  </Text>
                ) : (
                  residents.map((resident) => (
                    <TouchableOpacity
                      key={resident.id}
                      style={[
                        styles.residentItem,
                        selectedResident?.id === resident.id && styles.residentItemSelected
                      ]}
                      onPress={() => handleSelectResident(resident)}
                    >
                      <View style={styles.residentInfo}>
                        <Text style={[
                          styles.residentName,
                          selectedResident?.id === resident.id && styles.residentNameSelected
                        ]}>
                          {resident.name}
                        </Text>
                        <Text style={[
                          styles.residentApartment,
                          selectedResident?.id === resident.id && styles.residentApartmentSelected
                        ]}>
                          דירה {resident.apartmentNumber}
                        </Text>
                      </View>
                      {selectedResident?.id === resident.id && (
                        <MaterialCommunityIcons name="check" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Meter Number */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="מספר מונה (אופציונלי)"
              value={meterNumber}
              onChangeText={setMeterNumber}
              mode="outlined"
              placeholder="לדוגמה: 12345"
              right={<TextInput.Icon icon="counter" />}
            />
          </Card.Content>
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="information" size={24} color="#4CAF50" />
              <Text style={styles.infoText}>
                לאחר רישום העמדה, תוכל לתעד קריאות מונה חודשיות ולחשב חשבונות אוטומטית
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          icon="check"
          loading={saving}
          disabled={saving || !selectedResident}
        >
          {isEditing ? 'עדכן עמדה' : 'שמור עמדה'}
        </Button>

        {!selectedResident && (
          <Text style={styles.errorText}>נא לבחור דייר</Text>
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
  residentList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  noResidentsText: {
    textAlign: 'center',
    color: '#999',
    padding: 16,
  },
  residentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  residentItemSelected: {
    backgroundColor: '#4CAF50',
  },
  residentInfo: {
    flex: 1,
  },
  residentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  residentNameSelected: {
    color: '#fff',
  },
  residentApartment: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  residentApartmentSelected: {
    color: '#E8F5E9',
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'right',
    marginRight: 12,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#4CAF50',
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
