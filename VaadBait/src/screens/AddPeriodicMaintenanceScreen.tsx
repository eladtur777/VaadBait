import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, TextInput, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PeriodicMaintenanceService, PeriodicMaintenance } from '../services/firebaseService';

const FREQUENCIES = [
  { value: 'weekly', label: 'שבועי', days: 7 },
  { value: 'monthly', label: 'חודשי', days: 30 },
  { value: 'quarterly', label: 'רבעוני', days: 90 },
  { value: 'semi_annual', label: 'חצי שנתי', days: 180 },
  { value: 'annual', label: 'שנתי', days: 365 },
];

export default function AddPeriodicMaintenanceScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'>('monthly');
  const [nextDue, setNextDue] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNextDue(selectedDate);
    }
  };

  const handleReminderDateChange = (event: any, selectedDate?: Date) => {
    setShowReminderDatePicker(false);
    if (selectedDate) {
      setReminderDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') {
        window.alert('נא להזין כותרת');
      } else {
        Alert.alert('שגיאה', 'נא להזין כותרת');
      }
      return;
    }

    if (!description.trim()) {
      if (Platform.OS === 'web') {
        window.alert('נא להזין תיאור');
      } else {
        Alert.alert('שגיאה', 'נא להזין תיאור');
      }
      return;
    }

    if (reminderEnabled && !reminderEmail.trim()) {
      if (Platform.OS === 'web') {
        window.alert('נא להזין כתובת מייל לתזכורת');
      } else {
        Alert.alert('שגיאה', 'נא להזין כתובת מייל לתזכורת');
      }
      return;
    }

    setSaving(true);
    try {
      const maintenanceData: Omit<PeriodicMaintenance, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        frequency,
        nextDue,
        isActive: true,
        ...(reminderEnabled && reminderEmail.trim() && {
          reminderEmail: reminderEmail.trim(),
          reminderDate,
        }),
        ...(estimatedCost && { estimatedCost: parseFloat(estimatedCost) }),
        ...(assignedTo.trim() && { assignedTo: assignedTo.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
      };

      await PeriodicMaintenanceService.add(maintenanceData);

      if (Platform.OS === 'web') {
        window.alert('הטיפול התקופתי נוסף בהצלחה');
        navigation.goBack();
      } else {
        Alert.alert('הצלחה', 'הטיפול התקופתי נוסף בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving periodic maintenance:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה בשמירה');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לשמור את הטיפול התקופתי');
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedFrequency = FREQUENCIES.find(f => f.value === frequency)!;

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>הוספת טיפול תקופתי</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Title */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="כותרת *"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              placeholder="למשל: בדיקת מעלית, ריסוס, ניקוי גג"
              right={<TextInput.Icon icon="format-title" />}
            />
          </Card.Content>
        </Card>

        {/* Description */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="תיאור *"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              right={<TextInput.Icon icon="text" />}
            />
          </Card.Content>
        </Card>

        {/* Frequency */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowFrequencyPicker(!showFrequencyPicker)}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons name="repeat" size={24} color="#9C27B0" />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>תדירות *</Text>
                  <Text style={styles.selectValue}>{selectedFrequency.label}</Text>
                </View>
                <MaterialCommunityIcons
                  name={showFrequencyPicker ? "chevron-down" : "chevron-left"}
                  size={24}
                  color="#666"
                />
              </View>
            </TouchableOpacity>

            {showFrequencyPicker && (
              <View style={styles.optionsList}>
                {FREQUENCIES.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.optionItem,
                      frequency === freq.value && styles.optionItemSelected
                    ]}
                    onPress={() => {
                      setFrequency(freq.value as any);
                      setShowFrequencyPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      frequency === freq.value && styles.optionTextSelected
                    ]}>
                      {freq.label}
                    </Text>
                    {frequency === freq.value && (
                      <MaterialCommunityIcons name="check" size={20} color="#9C27B0" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Next Due Date */}
        <Card style={styles.card}>
          <Card.Content>
            {Platform.OS === 'web' ? (
              <View style={styles.webDateContainer}>
                <Text style={styles.webDateLabel}>תאריך ביצוע הבא *</Text>
                <input
                  type="date"
                  value={nextDue.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      setNextDue(newDate);
                    }
                  }}
                  style={{
                    padding: 12,
                    fontSize: 16,
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    direction: 'rtl',
                    width: '100%',
                  }}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.selectContent}>
                    <MaterialCommunityIcons name="calendar" size={24} color="#9C27B0" />
                    <View style={styles.selectText}>
                      <Text style={styles.selectLabel}>תאריך ביצוע הבא *</Text>
                      <Text style={styles.selectValue}>
                        {nextDue.toLocaleDateString('he-IL')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
                  </View>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={nextDue}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Reminder Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>תזכורת במייל</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                color="#9C27B0"
              />
            </View>

            {reminderEnabled && (
              <>
                <TextInput
                  label="כתובת מייל לתזכורת"
                  value={reminderEmail}
                  onChangeText={setReminderEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  style={styles.inputMargin}
                  right={<TextInput.Icon icon="email" />}
                />

                {Platform.OS === 'web' ? (
                  <View style={[styles.webDateContainer, styles.inputMargin]}>
                    <Text style={styles.webDateLabel}>תאריך תזכורת</Text>
                    <input
                      type="date"
                      value={reminderDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                          setReminderDate(newDate);
                        }
                      }}
                      style={{
                        padding: 12,
                        fontSize: 16,
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        direction: 'rtl',
                        width: '100%',
                      }}
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.selectButton, styles.inputMargin]}
                      onPress={() => setShowReminderDatePicker(true)}
                    >
                      <View style={styles.selectContent}>
                        <MaterialCommunityIcons name="bell" size={24} color="#FF9800" />
                        <View style={styles.selectText}>
                          <Text style={styles.selectLabel}>תאריך תזכורת</Text>
                          <Text style={styles.selectValue}>
                            {reminderDate.toLocaleDateString('he-IL')}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
                      </View>
                    </TouchableOpacity>
                    {showReminderDatePicker && (
                      <DateTimePicker
                        value={reminderDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleReminderDateChange}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Assigned To */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="אחראי ביצוע (אופציונלי)"
              value={assignedTo}
              onChangeText={setAssignedTo}
              mode="outlined"
              placeholder="למשל: חברת מעליות, קבלן ניקיון"
              right={<TextInput.Icon icon="account" />}
            />
          </Card.Content>
        </Card>

        {/* Estimated Cost */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="הערכת עלות (אופציונלי)"
              value={estimatedCost}
              onChangeText={setEstimatedCost}
              mode="outlined"
              keyboardType="numeric"
              right={<TextInput.Icon icon="currency-ils" />}
            />
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
            />
          </Card.Content>
        </Card>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          buttonColor="#9C27B0"
          icon="check"
          loading={saving}
          disabled={saving}
        >
          שמור טיפול תקופתי
        </Button>

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
  header: {
    padding: 20,
    backgroundColor: '#9C27B0',
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
  optionsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  optionItemSelected: {
    backgroundColor: '#F3E5F5',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  inputMargin: {
    marginTop: 12,
  },
  webDateContainer: {
    paddingVertical: 8,
  },
  webDateLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 8,
  },
  spacer: {
    height: 32,
  },
});
