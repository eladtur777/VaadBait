import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaintenanceTasksService, MaintenanceTask } from '../services/firebaseService';

const TASK_TYPES = [
  { value: 'issue', label: 'תקלה', icon: 'alert-circle', color: '#f44336' },
  { value: 'improvement', label: 'הצעת שיפור', icon: 'lightbulb', color: '#FF9800' },
  { value: 'general', label: 'משימה כללית', icon: 'wrench', color: '#2196F3' },
];

const PRIORITIES = [
  { value: 'low', label: 'נמוך', color: '#4CAF50' },
  { value: 'medium', label: 'בינוני', color: '#2196F3' },
  { value: 'high', label: 'גבוה', color: '#FF9800' },
  { value: 'urgent', label: 'דחוף', color: '#f44336' },
];

export default function AddMaintenanceTaskScreen({ navigation }: any) {
  const [type, setType] = useState<'issue' | 'improvement' | 'general'>('issue');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [location, setLocation] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [reportedByPhone, setReportedByPhone] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

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

    setSaving(true);
    try {
      const taskData: Omit<MaintenanceTask, 'id'> = {
        type,
        title: title.trim(),
        description: description.trim(),
        status: 'open',
        priority,
        ...(location.trim() && { location: location.trim() }),
        ...(reportedBy.trim() && { reportedBy: reportedBy.trim() }),
        ...(reportedByPhone.trim() && { reportedByPhone: reportedByPhone.trim() }),
        ...(estimatedCost && { estimatedCost: parseFloat(estimatedCost) }),
        ...(notes.trim() && { notes: notes.trim() }),
      };

      await MaintenanceTasksService.add(taskData);

      if (Platform.OS === 'web') {
        window.alert('המשימה נוספה בהצלחה');
        navigation.goBack();
      } else {
        Alert.alert('הצלחה', 'המשימה נוספה בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה בשמירת המשימה');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לשמור את המשימה');
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedType = TASK_TYPES.find(t => t.value === type)!;
  const selectedPriority = PRIORITIES.find(p => p.value === priority)!;

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>פתיחת משימה חדשה</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Task Type */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <View style={styles.selectContent}>
                <View style={[styles.typeIconContainer, { backgroundColor: selectedType.color + '20' }]}>
                  <MaterialCommunityIcons
                    name={selectedType.icon as any}
                    size={24}
                    color={selectedType.color}
                  />
                </View>
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>סוג משימה *</Text>
                  <Text style={[styles.selectValue, { color: selectedType.color }]}>
                    {selectedType.label}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showTypePicker ? "chevron-down" : "chevron-left"}
                  size={24}
                  color="#666"
                />
              </View>
            </TouchableOpacity>

            {showTypePicker && (
              <View style={styles.optionsList}>
                {TASK_TYPES.map((taskType) => (
                  <TouchableOpacity
                    key={taskType.value}
                    style={[
                      styles.optionItem,
                      type === taskType.value && styles.optionItemSelected,
                      { borderLeftColor: taskType.color }
                    ]}
                    onPress={() => {
                      setType(taskType.value as any);
                      setShowTypePicker(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={taskType.icon as any}
                      size={20}
                      color={taskType.color}
                    />
                    <Text style={[
                      styles.optionText,
                      type === taskType.value && { color: taskType.color, fontWeight: 'bold' }
                    ]}>
                      {taskType.label}
                    </Text>
                    {type === taskType.value && (
                      <MaterialCommunityIcons name="check" size={20} color={taskType.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Title */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="כותרת *"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
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
              numberOfLines={4}
              right={<TextInput.Icon icon="text" />}
            />
          </Card.Content>
        </Card>

        {/* Priority */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowPriorityPicker(!showPriorityPicker)}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons name="flag" size={24} color={selectedPriority.color} />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>עדיפות</Text>
                  <Text style={[styles.selectValue, { color: selectedPriority.color }]}>
                    {selectedPriority.label}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showPriorityPicker ? "chevron-down" : "chevron-left"}
                  size={24}
                  color="#666"
                />
              </View>
            </TouchableOpacity>

            {showPriorityPicker && (
              <View style={styles.optionsList}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.optionItem,
                      priority === p.value && styles.optionItemSelected,
                      { borderLeftColor: p.color }
                    ]}
                    onPress={() => {
                      setPriority(p.value as any);
                      setShowPriorityPicker(false);
                    }}
                  >
                    <MaterialCommunityIcons name="flag" size={20} color={p.color} />
                    <Text style={[
                      styles.optionText,
                      priority === p.value && { color: p.color, fontWeight: 'bold' }
                    ]}>
                      {p.label}
                    </Text>
                    {priority === p.value && (
                      <MaterialCommunityIcons name="check" size={20} color={p.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Location */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="מיקום (אופציונלי)"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              placeholder="למשל: חדר מדרגות קומה 2, גג, חניון"
              right={<TextInput.Icon icon="map-marker" />}
            />
          </Card.Content>
        </Card>

        {/* Reported By */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="דווח על ידי (אופציונלי)"
              value={reportedBy}
              onChangeText={setReportedBy}
              mode="outlined"
              right={<TextInput.Icon icon="account" />}
            />
            <TextInput
              label="טלפון מדווח (אופציונלי)"
              value={reportedByPhone}
              onChangeText={setReportedByPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.inputMargin}
              right={<TextInput.Icon icon="phone" />}
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
              label="הערות נוספות (אופציונלי)"
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
          שמור משימה
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
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '500',
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    gap: 12,
  },
  optionItemSelected: {
    backgroundColor: '#f5f5f5',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  inputMargin: {
    marginTop: 12,
  },
  saveButton: {
    marginTop: 8,
  },
  spacer: {
    height: 32,
  },
});
