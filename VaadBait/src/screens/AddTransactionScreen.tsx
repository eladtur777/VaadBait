import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Card, TextInput, SegmentedButtons, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TransactionsService } from '../services/firebaseService';

const CATEGORIES: Record<string, string[]> = {
  expense: ['מזון', 'תחבורה', 'בילויים', 'קניות', 'חשבונות', 'בריאות', 'אחר'],
  income: ['משכורת', 'מתנה', 'החזר', 'בונוס', 'אחר'],
};

export default function AddTransactionScreen({ navigation }: any) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [showCategories, setShowCategories] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      if (Platform.OS === 'web') {
        window.alert('נא להזין סכום תקין');
      } else {
        Alert.alert('שגיאה', 'נא להזין סכום תקין');
      }
      return;
    }
    if (!category) {
      if (Platform.OS === 'web') {
        window.alert('נא לבחור קטגוריה');
      } else {
        Alert.alert('שגיאה', 'נא לבחור קטגוריה');
      }
      return;
    }
    setSaving(true);
    try {
      await TransactionsService.add({
        type,
        amount: parseFloat(amount),
        category,
        date,
        description: description || category,
      });
      if (Platform.OS === 'web') {
        window.alert('התנועה נשמרה בהצלחה');
        navigation.goBack();
      } else {
        Alert.alert('הצלחה', 'התנועה נשמרה בהצלחה', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      console.error('Error:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לשמור את התנועה');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לשמור את התנועה');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>הוסף תנועה</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Type Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>סוג</Text>
            <SegmentedButtons
              value={type}
              onValueChange={(value) => { setType(value as 'income' | 'expense'); setCategory(''); }}
              buttons={[
                {
                  value: 'expense',
                  label: 'הוצאה',
                  icon: 'arrow-down',
                },
                {
                  value: 'income',
                  label: 'הכנסה',
                  icon: 'arrow-up',
                },
              ]}
            />
          </Card.Content>
        </Card>

        {/* Amount */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="סכום (₪)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              mode="outlined"
              right={<TextInput.Icon icon="cash" />}
            />
          </Card.Content>
        </Card>

        {/* Category */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity style={styles.categoryButton} onPress={() => setShowCategories(!showCategories)}>
              <View style={styles.categoryContent}>
                <MaterialCommunityIcons name="tag" size={24} color="#666" />
                <View style={styles.categoryText}>
                  <Text style={styles.categoryLabel}>קטגוריה</Text>
                  <Text style={styles.categoryValue}>
                    {category || 'בחר קטגוריה'}
                  </Text>
                </View>
                <MaterialCommunityIcons name={showCategories ? "chevron-down" : "chevron-left"} size={24} color="#666" />
              </View>
            </TouchableOpacity>
            {showCategories && (
              <View style={styles.categoryList}>
                {CATEGORIES[type].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                    onPress={() => { setCategory(cat); setShowCategories(false); }}
                  >
                    <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextSelected]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Date */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity style={styles.categoryButton} onPress={() => setShowDatePicker(true)}>
              <View style={styles.categoryContent}>
                <MaterialCommunityIcons name="calendar" size={24} color="#666" />
                <View style={styles.categoryText}>
                  <Text style={styles.categoryLabel}>תאריך</Text>
                  <Text style={styles.categoryValue}>
                    {date.toLocaleDateString('he-IL')}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {/* Description */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="תיאור (אופציונלי)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
          </Card.Content>
        </Card>

        {/* Receipt */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity style={styles.categoryButton}>
              <View style={styles.categoryContent}>
                <MaterialCommunityIcons name="camera" size={24} color="#666" />
                <View style={styles.categoryText}>
                  <Text style={styles.categoryLabel}>קבלה</Text>
                  <Text style={styles.categoryValue}>לא צורפה קבלה</Text>
                </View>
                <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Recurring Transaction */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.switchRow}>
              <Switch value={isRecurring} onValueChange={setIsRecurring} />
              <Text style={styles.switchLabel}>תנועה חוזרת</Text>
            </View>

            {isRecurring && (
              <View style={styles.frequencyContainer}>
                <Text style={styles.label}>תדירות</Text>
                <SegmentedButtons
                  value={recurringFrequency}
                  onValueChange={(value) => setRecurringFrequency(value as any)}
                  buttons={[
                    { value: 'daily', label: 'יומי' },
                    { value: 'weekly', label: 'שבועי' },
                    { value: 'monthly', label: 'חודשי' },
                  ]}
                />
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          icon="check"
        >
          שמור תנועה
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
    backgroundColor: '#6200EE',
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  categoryButton: {
    borderRadius: 8,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryText: {
    flex: 1,
    marginHorizontal: 12,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  categoryValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
    textAlign: 'right',
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryChipSelected: {
    backgroundColor: '#6200EE',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  frequencyContainer: {
    marginTop: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  spacer: {
    height: 32,
  },
});
