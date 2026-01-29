import React, { useState, useEffect } from 'react';
import { Alert, Platform, Image } from 'react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Card, TextInput, Switch, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { CommitteeIncomeService, Base64ImageService, CategoriesService, Category } from '../services/firebaseService';

const DEFAULT_INCOME_CATEGORIES = ['דמי ועד', 'תרומות', 'שכירות', 'אחר'];

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
  const [existingReceiptBase64, setExistingReceiptBase64] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load categories from Firebase
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const allCategories = await CategoriesService.getAll();
        const filteredCategories = allCategories.filter(cat => cat.type === 'income');
        setIncomeCategories(filteredCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

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
      // Support both old receiptUrl and new receiptImageBase64
      if (editingIncome.receiptImageBase64) {
        setExistingReceiptBase64(editingIncome.receiptImageBase64);
      } else if (editingIncome.receiptUrl) {
        setExistingReceiptBase64(editingIncome.receiptUrl);
      }
    }
  }, [editingIncome]);

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      // For web: use native file input that supports images and PDF
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setReceiptUri(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        if (Platform.OS === 'web') {
          window.alert('נדרשת הרשאה לגישה לגלריה');
        } else {
          Alert.alert('שגיאה', 'נדרשת הרשאה לגישה לגלריה');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.3,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptUri(result.assets[0].uri);
      }
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      if (Platform.OS === 'web') {
        window.alert('נדרשת הרשאה לגישה למצלמה');
      } else {
        Alert.alert('שגיאה', 'נדרשת הרשאה לגישה למצלמה');
      }
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.3,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const removeReceipt = () => {
    setReceiptUri(null);
    setExistingReceiptBase64(null);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!category || !amount || !description) {
      if (Platform.OS === 'web') {
        window.alert('נא למלא את כל השדות הנדרשים');
      } else {
        Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      }
      return;
    }
    setSaving(true);
    try {
      let receiptImageBase64 = existingReceiptBase64;

      // Convert new receipt to base64 if selected
      if (receiptUri) {
        setProcessingImage(true);
        receiptImageBase64 = await Base64ImageService.convertImageToBase64(receiptUri);
        setProcessingImage(false);
      }

      const incomeData: any = {
        category,
        amount: parseFloat(amount),
        description,
        date,
        isPaid,
        notes,
      };

      // Only include receiptImageBase64 if we have one
      if (receiptImageBase64) {
        incomeData.receiptImageBase64 = receiptImageBase64;
      } else {
        incomeData.receiptImageBase64 = null;
      }
      // Clear old receiptUrl field
      incomeData.receiptUrl = null;

      if (isEditing && editingIncome.id) {
        await CommitteeIncomeService.update(editingIncome.id, incomeData);
        if (Platform.OS === 'web') {
          navigation.navigate('CommitteeIncome', { refresh: Date.now() });
        } else {
          Alert.alert('הצלחה', 'ההכנסה עודכנה בהצלחה', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
        }
      } else {
        await CommitteeIncomeService.add(incomeData);
        if (Platform.OS === 'web') {
          navigation.navigate('CommitteeIncome', { refresh: Date.now() });
        } else {
          Alert.alert('הצלחה', 'ההכנסה נשמרה בהצלחה', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה: לא ניתן לשמור');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לשמור');
      }
    } finally {
      setSaving(false);
      setProcessingImage(false);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    // First try to find icon from Firebase categories
    const cat = incomeCategories.find(c => c.name === categoryName);
    if (cat?.icon) return cat.icon;
    // Fallback to default icons
    switch (categoryName) {
      case 'דמי ועד': return 'cash-multiple';
      case 'תרומות': return 'gift';
      case 'שכירות': return 'key';
      case 'אחר': return 'cash-plus';
      default: return 'cash';
    }
  };

  // Get the list of categories to display (Firebase categories + defaults if needed)
  const getCategoriesList = () => {
    // Start with Firebase categories
    const firebaseCategories = incomeCategories.map(cat => ({
      name: cat.name,
      icon: cat.icon || 'cash',
      color: cat.color
    }));

    // Add default categories that don't exist in Firebase
    const defaultCategories = DEFAULT_INCOME_CATEGORIES
      .filter(name => !incomeCategories.some(cat => cat.name === name))
      .map(name => ({ name, icon: getCategoryIcon(name), color: undefined }));

    // Combine: Firebase categories first, then missing defaults
    return [...firebaseCategories, ...defaultCategories];
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
                {loadingCategories ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : (
                  getCategoriesList().map((cat) => (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.categoryChip,
                        category === cat.name && styles.categoryChipSelected,
                        category === cat.name && cat.color ? { backgroundColor: cat.color } : null
                      ]}
                      onPress={() => { setCategory(cat.name); setShowCategories(false); }}
                    >
                      <MaterialCommunityIcons name={cat.icon as any} size={20} color={category === cat.name ? '#fff' : '#666'} />
                      <Text style={[styles.categoryChipText, category === cat.name && styles.categoryChipTextSelected]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
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
            {(receiptUri || existingReceiptBase64) ? (
              <View style={styles.receiptPreviewContainer}>
                <Image
                  source={{ uri: receiptUri || existingReceiptBase64! }}
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
            {processingImage && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.uploadingText}>מעבד קבלה...</Text>
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
