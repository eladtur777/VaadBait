import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Button, Card, Searchbar, ActivityIndicator, Portal, Modal, TextInput, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ResidentsService, Resident } from '../services/firebaseService';

export default function ManageResidentsScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhone2, setEditPhone2] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMonthlyFee, setEditMonthlyFee] = useState('');
  const [editApartment, setEditApartment] = useState('');

  const loadResidents = async () => {
    try {
      const data = await ResidentsService.getAll();
      setResidents(data);
    } catch (error) {
      console.error('Error loading residents:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את רשימת הדיירים');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadResidents();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadResidents();
  };

  const handleAddResident = () => {
    navigation.navigate('AddResident');
  };

  const handleEditResident = (resident: Resident) => {
    setSelectedResident(resident);
    setEditName(resident.name);
    setEditPhone(resident.phone || '');
    setEditPhone2(resident.phone2 || '');
    setEditEmail(resident.email || '');
    setEditMonthlyFee(resident.monthlyFee.toString());
    setEditApartment(resident.apartmentNumber);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedResident || !editName || !editApartment || !editMonthlyFee) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      await ResidentsService.update(selectedResident.id!, {
        name: editName,
        phone: editPhone,
        phone2: editPhone2,
        email: editEmail,
        monthlyFee: parseFloat(editMonthlyFee),
        apartmentNumber: editApartment,
      });
      Alert.alert('הצלחה', 'פרטי הדייר עודכנו בהצלחה');
      setEditModalVisible(false);
      loadResidents();
    } catch (error) {
      console.error('Error updating resident:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן את פרטי הדייר');
    }
  };

  const handleDeleteResident = (resident: Resident) => {
    Alert.alert(
      'מחק דייר',
      `האם אתה בטוח שברצונך למחוק את ${resident.name}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await ResidentsService.delete(resident.id!);
              Alert.alert('הצלחה', 'הדייר נמחק בהצלחה');
              loadResidents();
            } catch (error) {
              console.error('Error deleting resident:', error);
              Alert.alert('שגיאה', 'לא ניתן למחוק את הדייר');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (resident: Resident) => {
    try {
      await ResidentsService.update(resident.id!, {
        isActive: !resident.isActive,
      });
      loadResidents();
    } catch (error) {
      console.error('Error toggling resident status:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן את סטטוס הדייר');
    }
  };

  const filteredResidents = residents.filter(r =>
    r.name.includes(searchQuery) ||
    r.apartmentNumber.includes(searchQuery) ||
    (r.phone && r.phone.includes(searchQuery))
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>טוען דיירים...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>ניהול דיירים</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Search */}
        <Searchbar
          placeholder="חפש לפי שם, דירה או טלפון..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{residents.length}</Text>
              <Text style={styles.summaryLabel}>סך דיירים</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {residents.filter(r => r.isActive).length}
              </Text>
              <Text style={styles.summaryLabel}>פעילים</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Residents List */}
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredResidents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'לא נמצאו דיירים תואמים' : 'אין דיירים רשומים'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'נסה לחפש במילים אחרות' : 'לחץ על + להוספת דייר ראשון'}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            filteredResidents.map((resident) => (
              <Card key={resident.id} style={styles.residentCard}>
                <Card.Content>
                  <View style={styles.residentHeader}>
                    <View style={styles.apartmentBadge}>
                      <MaterialCommunityIcons name="home" size={16} color="#fff" />
                      <Text style={styles.apartmentNumber}>{resident.apartmentNumber}</Text>
                    </View>
                    <Text style={styles.residentName}>{resident.name}</Text>
                    <View style={styles.actionButtons}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        iconColor="#2196F3"
                        onPress={() => handleEditResident(resident)}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor="#f44336"
                        onPress={() => handleDeleteResident(resident)}
                      />
                    </View>
                  </View>

                  <View style={styles.residentDetails}>
                    {resident.phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{resident.phone}</Text>
                        <MaterialCommunityIcons name="phone" size={16} color="#666" />
                      </View>
                    )}

                    {resident.phone2 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{resident.phone2}</Text>
                        <MaterialCommunityIcons name="phone-plus" size={16} color="#666" />
                      </View>
                    )}

                    {resident.email && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{resident.email}</Text>
                        <MaterialCommunityIcons name="email" size={16} color="#666" />
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailValue}>₪{resident.monthlyFee} / חודש</Text>
                      <MaterialCommunityIcons name="cash" size={16} color="#666" />
                    </View>

                    <TouchableOpacity
                      style={styles.detailRow}
                      onPress={() => handleToggleActive(resident)}
                    >
                      <View style={[
                        styles.statusBadge,
                        resident.isActive ? styles.activeBadge : styles.inactiveBadge
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: resident.isActive ? '#2E7D32' : '#C62828' }
                        ]}>
                          {resident.isActive ? 'פעיל' : 'לא פעיל'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name={resident.isActive ? 'check-circle' : 'close-circle'}
                        size={16}
                        color={resident.isActive ? '#4CAF50' : '#f44336'}
                      />
                    </TouchableOpacity>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>

        {/* Add Button */}
        <Button
          mode="contained"
          onPress={handleAddResident}
          style={styles.addButton}
          icon="plus"
        >
          הוסף דייר חדש
        </Button>
      </View>

      {/* Edit Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <Text style={styles.modalTitle}>עריכת דייר</Text>

            <TextInput
              label="מספר דירה"
              value={editApartment}
              onChangeText={setEditApartment}
              mode="outlined"
              style={styles.modalInput}
              keyboardType="numeric"
            />

            <TextInput
              label="שם הדייר/משפחה"
              value={editName}
              onChangeText={setEditName}
              mode="outlined"
              style={styles.modalInput}
            />

            <TextInput
              label="טלפון"
              value={editPhone}
              onChangeText={setEditPhone}
              mode="outlined"
              style={styles.modalInput}
              keyboardType="phone-pad"
            />

            <TextInput
              label="טלפון נוסף (אופציונלי)"
              value={editPhone2}
              onChangeText={setEditPhone2}
              mode="outlined"
              style={styles.modalInput}
              keyboardType="phone-pad"
            />

            <TextInput
              label="אימייל"
              value={editEmail}
              onChangeText={setEditEmail}
              mode="outlined"
              style={styles.modalInput}
              keyboardType="email-address"
            />

            <TextInput
              label="דמי ועד חודשיים (₪)"
              value={editMonthlyFee}
              onChangeText={setEditMonthlyFee}
              mode="outlined"
              style={styles.modalInput}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setEditModalVisible(false)}
                style={styles.modalButton}
              >
                ביטול
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveEdit}
                style={styles.modalButton}
              >
                שמור
              </Button>
            </View>
          </ScrollView>
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
  searchBar: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#E3F2FD',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#1976D2',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  list: {
    flex: 1,
  },
  residentCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  residentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  apartmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  apartmentNumber: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 4,
    fontSize: 14,
  },
  residentName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
    marginHorizontal: 12,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  residentDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#C8E6C9',
  },
  inactiveBadge: {
    backgroundColor: '#FFCDD2',
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
  addButton: {
    marginTop: 16,
    marginBottom: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});
