import React, { useState, useEffect } from 'react';
import { Alert, Platform, Image } from 'react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Card, TextInput, Switch, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { CommitteeIncomeService, ReceiptStorageService } from '../services/firebaseService';

const INCOME_CATEGORIES = ['דמי ועד', 'תרומות', 'שכירות', 'אחר'];

export default function AddCommitteeIncomeScreen({ navigation, route }: any) {
  const editingIncome = route?.params?.income;
  const isEditing = !!editingIncome;

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (editingIncome) {
      setCategory(editingIncome.category || '');
      setAmount(editingIncome.amount?.toString() || '');
      setDescription(editingIncome.description || '');
      setNotes(editingIncome.notes || '');
      setIsPaid(editingIncome.isPaid ?? true);
      const incomeDate = editingIncome.date instanceof Date
        ? editingIncome.date
        : new Date(editingIncome.date);
      setDate(incomeDate);
      if (editingIncome.receiptUrl) {
        setExistingReceiptUrl(editingIncome.receiptUrl);
      }
    }
  }, [editingIncome]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('שגיאה', 'נדרשת הרשאה לגישה לגלריה');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('שגיאה', 'נדרשת הרשאה לגישה למצלמה');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const removeReceipt = () => {
    setReceiptUri(null);
    setExistingReceiptUrl(null);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!category || !amount || !description) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      return;
    }
    setSaving(true);
    try {
      let receiptUrl = existingReceiptUrl;

      // Upload new receipt if selected
      if (receiptUri) {
        setUploadingImage(true);
        receiptUrl = await ReceiptStorageService.uploadReceipt(receiptUri, 'incomes');
        setUploadingImage(false);
      }

      // Delete old receipt if removed and there was one
      if (!receiptUri && !existingReceiptUrl && editingIncome?.receiptUrl) {
        await ReceiptStorageService.deleteReceipt(editingIncome.receiptUrl);
      }

      const incomeData = {
        category,
        amount: parseFloat(amount),
        description,
        date,
        isPaid,
        notes,
        receiptUrl: receiptUrl || null,
      };

      if (isEditing && editingIncome.id) {
        await CommitteeIncomeService.update(editingIncome.id, incomeData);
        Alert.alert('הצלחה', 'ההכנסה עודכנה בהצלחה', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
      } else {
        await CommitteeIncomeService.add(incomeData);
        Alert.alert('הצלחה', 'ההכנסה נשמרה בהצלחה', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('שגיאה', 'לא ניתן לשמור');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'דמי ועד': return 'cash-multiple';
      case 'תרומות': return 'gift';
      case 'שכירות': return 'key';
      case 'אחר': return 'cash-plus';
      default: return 'cash';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'עריכת הכנסה' : 'הכנסה חדשה לועד'}</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Category Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowCategories(!showCategories)}>
              <View style={styles.selectContent}>
                <MaterialCommunityIcons
                  name={getCategoryIcon(category)}
                  size={24}
                  color="#666"
                />
                <View style={styles.selectText}>
                  <Text style={styles.selectLabel}>קטגוריה</Text>
                  <Text style={styles.selectValue}>
                    {category || 'בחר קטגוריה'}
                  </Text>
                </View>
                <MaterialCommunityIcons name={showCategories ? "chevron-down" : "chevron-left"} size={24} color="#666" />
              </View>
            </TouchableOpacity>
            {showCategories && (
              <View style={styles.categoryList}>
                {INCOME_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                    onPress={() => { setCategory(cat); setShowCategories(false); }}
                  >
                    <MaterialCommunityIcons name={getCategoryIcon(cat)} size={20} color={category === cat ? '#fff' : '#666'} />
                    <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextSelected]}>{cat}</Text>
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
              label="סכום (₪)"
              value={amount}
              onChangeText={setAmount}
              mode="outlined"
              keyboardType="numeric"
              placeholder="1000"
              right={<TextInput.Icon icon="cash" />}
            />
          </Card.Content>
        </Card>

        {/* Description */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="תיאור"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              placeholder="גביית דמי ועד חודשיים"
              right={<TextInput.Icon icon="text" />}
            />
          </Card.Content>
        </Card>

        {/* Date */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowDatePicker(true)}>
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

        {/* Payment Status */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.switchRow}>
              <Switch value={isPaid} onValueChange={setIsPaid} />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>סטטוס תשלום</Text>
                <Text style={styles.switchSubtext}>
                  {isPaid ? 'שולם - הכסף התקבל' : 'ממתין לתשלום'}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={isPaid ? 'check-circle' : 'clock-outline'}
                size={24}
                color={isPaid ? '#4CAF50' : '#FF9800'}
              />
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
              placeholder="הערות נוספות"
            />
          </Card.Content>
        </Card>

        {/* Receipt Upload */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.receiptLabel}>קבלה (אופציונלי)</Text>
            {(receiptUri || existingReceiptUrl) ? (
              <View style={styles.receiptPreviewContainer}>
                <Image
                  source={{ uri: receiptUri || existingReceiptUrl! }}
                  style={styles.receiptPreview}
                  resizeMode="cover"
                />
                <TouchableOpacity style={styles.removeReceiptButton} onPress={removeReceipt}>
                  <MaterialCommunityIcons name="close-circle" size={28} color="#f44336" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.receiptButtons}>
                <TouchableOpacity style={styles.receiptButton} onPress={pickImage}>
                  <MaterialCommunityIcons name="image" size={32} color="#4CAF50" />
                  <Text style={styles.receiptButtonText}>בחר מגלריה</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.receiptButton} onPress={takePhoto}>
                  <MaterialCommunityIcons name="camera" size={32} color="#4CAF50" />
                  <Text style={styles.receiptButtonText}>צלם תמונה</Text>
                </TouchableOpacity>
              </View>
            )}
            {uploadingImage && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.uploadingText}>מעלה קבלה...</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="information" size={24} color="#4CAF50" />
              <Text style={styles.infoText}>
                הכנסה זו תירשם כהכנסה משותפת של הועד ותשפיע על הדוח החודשי
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
          disabled={!category || !amount || !description}
        >
          {isEditing ? 'עדכן הכנסה' : 'שמור הכנסה'}
        </Button>

        {(!category || !amount || !description) && (
          <Text style={styles.errorText}>
            נא למלא: קטגוריה, סכום ותיאור
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
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#4CAF50',
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
  switchTextContainer: {
    flex: 1,
    marginHorizontal: 12,
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
  receiptLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 12,
  },
  receiptButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  receiptButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#E8F5E9',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#F5FFF5',
  },
  receiptButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4CAF50',
  },
  receiptPreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeReceiptButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#4CAF50',
  },
});
