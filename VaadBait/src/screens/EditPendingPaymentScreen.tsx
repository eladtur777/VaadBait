import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CommitteeIncomeService, CommitteeIncome } from '../services/firebaseService';

const CATEGORIES = [
  'ועד בית',
  'חניה',
  'אחזקה',
  'חשמל',
  'מים',
  'גינון',
  'ניקיון',
  'ביטוח',
  'שיפוצים',
  'אחר',
];

export default function EditPendingPaymentScreen({ navigation, route }: any) {
  const income: CommitteeIncome = route?.params?.income;

  const [category, setCategory] = useState(income?.category || '');
  const [amount, setAmount] = useState(income?.amount?.toString() || '');
  const [description, setDescription] = useState(income?.description || '');
  const [notes, setNotes] = useState(income?.notes || '');
  const [payerName, setPayerName] = useState(income?.payerName || '');
  const [payerPhone, setPayerPhone] = useState(income?.payerPhone || '');
  const [date, setDate] = useState(
    income?.date instanceof Date ? income.date : new Date(income?.date || Date.now())
  );
  const [isPaid, setIsPaid] = useState(income?.isPaid || false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!category) {
      if (Platform.OS === 'web') {
        window.alert('נא לבחור קטגוריה');
      } else {
        Alert.alert('שגיאה', 'נא לבחור קטגוריה');
      }
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      if (Platform.OS === 'web') {
        window.alert('נא להזין סכום תקין');
      } else {
        Alert.alert('שגיאה', 'נא להזין סכום תקין');
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
      const updateData: any = {
        category,
        amount: parseFloat(amount),
        description: description.trim(),
        date,
        isPaid,
      };

      if (notes.trim()) {
        updateData.notes = notes.trim();
      }
      if (payerName.trim()) {
        updateData.payerName = payerName.trim();
      }
      if (payerPhone.trim()) {
        updateData.payerPhone = payerPhone.trim();
      }

      await CommitteeIncomeService.update(income.id!, updateData);

      if (Platform.OS === 'web') {
        window.alert('התשלום עודכן בהצלחה');
        navigation.goBack();
      } else {
        Alert.alert('הצלחה', 'התשלום עודכן בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לשמור את התשלום');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לשמור את התשלום');
      }
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await CommitteeIncomeService.delete(income.id!);
      if (Platform.OS === 'web') {
        window.alert('התשלום נמחק בהצלחה');
        navigation.goBack();
      } else {
        Alert.alert('הצלחה', 'התשלום נמחק בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן למחוק את התשלום');
      } else {
        Alert.alert('שגיאה', 'לא ניתן למחוק את התשלום');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    const confirmMsg = 'האם אתה בטוח שברצונך למחוק תשלום זה? פעולה זו אינה ניתנת לביטול.';
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'מחק תשלום',
        confirmMsg,
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'מחק', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const getCategoryIcon = (cat: string): string => {
    const icons: { [key: string]: string } = {
      'ועד בית': 'office-building',
      'חניה': 'car',
      'אחזקה': 'wrench',
      'חשמל': 'lightning-bolt',
      'מים': 'water',
      'גינון': 'flower',
      'ניקיון': 'broom',
      'ביטוח': 'shield-check',
      'שיפוצים': 'hammer',
      'אחר': 'dots-horizontal',
    };
    return icons[cat] || 'cash';
  };

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>עריכת תשלום</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Category Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons
                  name={getCategoryIcon(category) as any}
                  size={24}
                  color="#666"
                />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>קטגוריה *</Text>
                  <Text style={styles.selectValue}>
                    {category || 'בחר קטגוריה'}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showCategoryPicker ? "chevron-down" : "chevron-left"}
                  size={24}
                  color="#666"
                />
              </View>
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.categoryList}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryItem,
                      category === cat && styles.categoryItemSelected
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={getCategoryIcon(cat) as any}
                      size={20}
                      color={category === cat ? '#fff' : '#666'}
                    />
                    <Text style={[
                      styles.categoryText,
                      category === cat && styles.categoryTextSelected
                    ]}>
                      {cat}
                    </Text>
                    {category === cat && (
                      <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Amount */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="סכום (₪) *"
              value={amount}
              onChangeText={setAmount}
              mode="outlined"
              keyboardType="numeric"
              right={<TextInput.Icon icon="cash" />}
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
              right={<TextInput.Icon icon="text" />}
            />
          </Card.Content>
        </Card>

        {/* Payer Name */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="שם המשלם (לתזכורות)"
              value={payerName}
              onChangeText={setPayerName}
              mode="outlined"
              right={<TextInput.Icon icon="account" />}
            />
          </Card.Content>
        </Card>

        {/* Payer Phone */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="טלפון המשלם (לתזכורות WhatsApp)"
              value={payerPhone}
              onChangeText={setPayerPhone}
              mode="outlined"
              keyboardType="phone-pad"
              right={<TextInput.Icon icon="whatsapp" />}
            />
          </Card.Content>
        </Card>

        {/* Date */}
        <Card style={styles.card}>
          <Card.Content>
            {Platform.OS === 'web' ? (
              <View style={styles.webDateContainer}>
                <Text style={styles.webDateLabel}>תאריך</Text>
                <input
                  type="date"
                  value={date.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      setDate(newDate);
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
                    <MaterialCommunityIcons name="calendar" size={24} color="#666" />
                    <View style={styles.selectText}>
                      <Text style={styles.selectLabel}>תאריך</Text>
                      <Text style={styles.selectValue}>
                        {date.toLocaleDateString('he-IL')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
                  </View>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                  />
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Payment Status */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setIsPaid(!isPaid)}
            >
              <View style={styles.selectContent}>
                <MaterialCommunityIcons
                  name={isPaid ? "check-circle" : "clock-outline"}
                  size={24}
                  color={isPaid ? "#4CAF50" : "#FF9800"}
                />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>סטטוס תשלום</Text>
                  <Text style={[styles.selectValue, { color: isPaid ? '#4CAF50' : '#FF9800' }]}>
                    {isPaid ? 'התקבל' : 'ממתין'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
          buttonColor="#2196F3"
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
          מחק תשלום
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
  categoryList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    gap: 12,
  },
  categoryItemSelected: {
    backgroundColor: '#2196F3',
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  categoryTextSelected: {
    color: '#fff',
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
  webDateContainer: {
    paddingVertical: 8,
  },
  webDateLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
  },
});
