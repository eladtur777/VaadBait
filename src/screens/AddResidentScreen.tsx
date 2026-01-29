import React, { useState } from 'react';
import { Alert } from 'react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Button, Card, TextInput, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ResidentsService } from '../services/firebaseService';

export default function AddResidentScreen({ navigation }: any) {
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [residentName, setResidentName] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('350');
  const [joinDate, setJoinDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setJoinDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!apartmentNumber || !residentName || !monthlyFee) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      return;
    }

    setSaving(true);
    try {
      const residentData: any = {
        name: residentName,
        apartmentNumber,
        joinDate,
        monthlyFee: parseFloat(monthlyFee),
        isActive,
      };

      // Only add optional fields if they have values (Firebase doesn't accept undefined)
      if (phone) residentData.phone = phone;
      if (phone2) residentData.phone2 = phone2;
      if (email) residentData.email = email;

      await ResidentsService.add(residentData);
      Alert.alert('הצלחה', 'הדייר נוסף בהצלחה', [
        { text: 'אישור', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving resident:', error);
      Alert.alert('שגיאה', 'לא ניתן לשמור את הדייר. נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>הוסף דייר חדש</Text>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {/* Apartment Number */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="מספר דירה"
              value={apartmentNumber}
              onChangeText={setApartmentNumber}
              mode="outlined"
              keyboardType="numeric"
              placeholder="15"
              right={<TextInput.Icon icon="home" />}
            />
          </Card.Content>
        </Card>

        {/* Resident Name */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="שם הדייר/משפחה"
              value={residentName}
              onChangeText={setResidentName}
              mode="outlined"
              placeholder="משפחת כהן"
              right={<TextInput.Icon icon="account" />}
            />
          </Card.Content>
        </Card>

        {/* Phone */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="טלפון ראשי"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              placeholder="050-1234567"
              right={<TextInput.Icon icon="phone" />}
            />
          </Card.Content>
        </Card>

        {/* Phone 2 */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="טלפון נוסף (אופציונלי)"
              value={phone2}
              onChangeText={setPhone2}
              mode="outlined"
              keyboardType="phone-pad"
              placeholder="050-7654321"
              right={<TextInput.Icon icon="phone-plus" />}
            />
          </Card.Content>
        </Card>

        {/* Email */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="אימייל (אופציונלי)"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              placeholder="example@gmail.com"
              right={<TextInput.Icon icon="email" />}
            />
          </Card.Content>
        </Card>

        {/* Monthly Fee */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="דמי ועד חודשיים (₪)"
              value={monthlyFee}
              onChangeText={setMonthlyFee}
              mode="outlined"
              keyboardType="numeric"
              placeholder="350"
              right={<TextInput.Icon icon="cash" />}
            />
            <Text style={styles.helperText}>
              הסכום שהדייר משלם בכל חודש
            </Text>
          </Card.Content>
        </Card>

        {/* Join Date */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons name="calendar" size={24} color="#666" />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>תאריך הצטרפות</Text>
                  <Text style={styles.selectValue}>
                    {joinDate.toLocaleDateString('he-IL')}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {showDatePicker && (
          <DateTimePicker
            value={joinDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {/* Active Status */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.switchRow}>
              <Switch value={isActive} onValueChange={setIsActive} />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>דייר פעיל</Text>
                <Text style={styles.switchSubtext}>
                  {isActive ? 'הדייר גר בדירה ומשלם דמי ועד' : 'הדירה ריקה או הדייר לא משלם'}
                </Text>
              </View>
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
              numberOfLines={3}
              placeholder="הערות נוספות על הדייר"
            />
          </Card.Content>
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="information" size={24} color="#2196F3" />
              <Text style={styles.infoText}>
                לאחר הוספת הדייר, תוכל לרשום תשלומי דמי ועד חודשיים ולעקוב אחר חובות
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
          disabled={!apartmentNumber || !residentName || !monthlyFee || saving}
          loading={saving}
        >
          {saving ? 'שומר...' : 'שמור דייר'}
        </Button>

        {(!apartmentNumber || !residentName || !monthlyFee) && (
          <Text style={styles.errorText}>
            נא למלא: מספר דירה, שם דייר ודמי ועד
          </Text>
        )}

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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  switchSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'right',
    marginRight: 12,
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
