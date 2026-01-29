import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
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

const STATUSES = [
  { value: 'open', label: 'פתוח', color: '#FF9800', icon: 'clock-outline' },
  { value: 'in_progress', label: 'בטיפול', color: '#2196F3', icon: 'progress-wrench' },
  { value: 'completed', label: 'הושלם', color: '#4CAF50', icon: 'check-circle' },
  { value: 'cancelled', label: 'בוטל', color: '#9E9E9E', icon: 'cancel' },
];

export default function EditMaintenanceTaskScreen({ navigation, route }: any) {
  const task: MaintenanceTask = route?.params?.task;

  const [type, setType] = useState<'issue' | 'improvement' | 'general'>(task?.type || 'issue');
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<'open' | 'in_progress' | 'completed' | 'cancelled'>(task?.status || 'open');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(task?.priority || 'medium');
  const [location, setLocation] = useState(task?.location || '');
  const [reportedBy, setReportedBy] = useState(task?.reportedBy || '');
  const [reportedByPhone, setReportedByPhone] = useState(task?.reportedByPhone || '');
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo || '');
  const [estimatedCost, setEstimatedCost] = useState(task?.estimatedCost?.toString() || '');
  const [actualCost, setActualCost] = useState(task?.actualCost?.toString() || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

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
      const updateData: Partial<MaintenanceTask> = {
        type,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        location: location.trim() || undefined,
        reportedBy: reportedBy.trim() || undefined,
        reportedByPhone: reportedByPhone.trim() || undefined,
        assignedTo: assignedTo.trim() || undefined,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        actualCost: actualCost ? parseFloat(actualCost) : undefined,
        notes: notes.trim() || undefined,
      };

      // If status changed to completed, set completedAt
      if (status === 'completed' && task?.status !== 'completed') {
        updateData.completedAt = new Date();
      }

      await MaintenanceTasksService.update(task.id!, updateData);

      if (Platform.OS === 'web') {
        window.alert('המשימה עודכנה בהצלחה');
        navigation.goBack();
      } else {
        Alert.alert('הצלחה', 'המשימה עודכנה בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה בעדכון המשימה');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לעדכן את המשימה');
      }
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await MaintenanceTasksService.delete(task.id!);
      if (Platform.OS === 'web') {
        window.alert('המשימה נמחקה בהצלחה');
        navigation.goBack();
      } else {
        Alert.alert('הצלחה', 'המשימה נמחקה בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה במחיקת המשימה');
      } else {
        Alert.alert('שגיאה', 'לא ניתן למחוק את המשימה');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    const confirmMsg = 'האם אתה בטוח שברצונך למחוק משימה זו?';
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        doDelete();
      }
    } else {
      Alert.alert('מחיקת משימה', confirmMsg, [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const selectedType = TASK_TYPES.find(t => t.value === type)!;
  const selectedPriority = PRIORITIES.find(p => p.value === priority)!;
  const selectedStatus = STATUSES.find(s => s.value === status)!;

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>עריכת משימה</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Status */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowStatusPicker(!showStatusPicker)}
            >
              <View style={styles.selectContent}>
                <View style={[styles.statusIcon, { backgroundColor: selectedStatus.color + '20' }]}>
                  <MaterialCommunityIcons
                    name={selectedStatus.icon as any}
                    size={24}
                    color={selectedStatus.color}
                  />
                </View>
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>סטטוס</Text>
                  <Text style={[styles.selectValue, { color: selectedStatus.color }]}>
                    {selectedStatus.label}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showStatusPicker ? "chevron-down" : "chevron-left"}
                  size={24}
                  color="#666"
                />
              </View>
            </TouchableOpacity>

            {showStatusPicker && (
              <View style={styles.optionsList}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.optionItem,
                      status === s.value && styles.optionItemSelected,
                      { borderLeftColor: s.color }
                    ]}
                    onPress={() => {
                      setStatus(s.value as any);
                      setShowStatusPicker(false);
                    }}
                  >
                    <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
                    <Text style={[
                      styles.optionText,
                      status === s.value && { color: s.color, fontWeight: 'bold' }
                    ]}>
                      {s.label}
                    </Text>
                    {status === s.value && (
                      <MaterialCommunityIcons name="check" size={20} color={s.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

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
                  <Text style={styles.selectLabel}>סוג משימה</Text>
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
              label="מיקום"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              right={<TextInput.Icon icon="map-marker" />}
            />
          </Card.Content>
        </Card>

        {/* Assigned To */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="אחראי ביצוע"
              value={assignedTo}
              onChangeText={setAssignedTo}
              mode="outlined"
              right={<TextInput.Icon icon="account-hard-hat" />}
            />
          </Card.Content>
        </Card>

        {/* Reported By */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="דווח על ידי"
              value={reportedBy}
              onChangeText={setReportedBy}
              mode="outlined"
              right={<TextInput.Icon icon="account" />}
            />
            <TextInput
              label="טלפון מדווח"
              value={reportedByPhone}
              onChangeText={setReportedByPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.inputMargin}
              right={<TextInput.Icon icon="phone" />}
            />
          </Card.Content>
        </Card>

        {/* Costs */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="הערכת עלות"
              value={estimatedCost}
              onChangeText={setEstimatedCost}
              mode="outlined"
              keyboardType="numeric"
              right={<TextInput.Icon icon="currency-ils" />}
            />
            <TextInput
              label="עלות בפועל"
              value={actualCost}
              onChangeText={setActualCost}
              mode="outlined"
              keyboardType="numeric"
              style={styles.inputMargin}
              right={<TextInput.Icon icon="cash" />}
            />
          </Card.Content>
        </Card>

        {/* Notes */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="הערות"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
          </Card.Content>
        </Card>

        {/* Info */}
        {task?.createdAt && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text style={styles.infoText}>
                נוצר: {task.createdAt.toLocaleDateString('he-IL')}
              </Text>
              {task.completedAt && (
                <Text style={styles.infoText}>
                  הושלם: {task.completedAt.toLocaleDateString('he-IL')}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          buttonColor="#9C27B0"
          icon="check"
          loading={saving}
          disabled={saving || deleting}
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
          מחק משימה
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
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoCard: {
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 8,
  },
  deleteButton: {
    marginTop: 12,
    borderColor: '#f44336',
  },
  spacer: {
    height: 32,
  },
});
