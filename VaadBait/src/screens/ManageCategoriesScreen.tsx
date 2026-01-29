import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { Card, FAB, Chip, Searchbar, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CategoriesService, Category } from '../services/firebaseService';

const ICONS = [
  'cash', 'cash-plus', 'cart', 'lightning-bolt', 'water', 'city', 'broom',
  'tag', 'home', 'car', 'gas-station', 'food', 'medical-bag', 'school',
  'basketball', 'music', 'book', 'phone', 'laptop', 'airplane', 'gift',
  'shopping', 'credit-card', 'bank', 'piggy-bank', 'wallet', 'chart-line'
];

const COLORS = [
  '#4CAF50', '#8BC34A', '#FF9800', '#FFC107', '#2196F3', '#9C27B0',
  '#607D8B', '#f44336', '#E91E63', '#00BCD4', '#009688', '#795548'
];

export default function ManageCategoriesScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state for add/edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('expense');
  const [categoryIcon, setCategoryIcon] = useState('tag');
  const [categoryColor, setCategoryColor] = useState('#607D8B');
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    try {
      const data = await CategoriesService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה בטעינת הקטגוריות');
      } else {
        Alert.alert('שגיאה', 'שגיאה בטעינת הקטגוריות');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.includes(searchQuery);
    const matchesType = selectedType === 'all' || cat.type === selectedType;
    return matchesSearch && matchesType;
  });

  const openAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryType('expense');
    setCategoryIcon('tag');
    setCategoryColor('#607D8B');
    setModalVisible(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryType(category.type);
    setCategoryIcon(category.icon || 'tag');
    setCategoryColor(category.color || '#607D8B');
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('נא להזין שם קטגוריה');
      } else {
        Alert.alert('שגיאה', 'נא להזין שם קטגוריה');
      }
      return;
    }

    setSaving(true);
    try {
      if (editingCategory?.id) {
        // Update existing
        await CategoriesService.update(editingCategory.id, {
          name: categoryName.trim(),
          type: categoryType,
          icon: categoryIcon,
          color: categoryColor,
        });
        if (Platform.OS === 'web') {
          window.alert('הקטגוריה עודכנה בהצלחה');
        } else {
          Alert.alert('הצלחה', 'הקטגוריה עודכנה בהצלחה');
        }
      } else {
        // Add new
        await CategoriesService.add({
          name: categoryName.trim(),
          type: categoryType,
          icon: categoryIcon,
          color: categoryColor,
        });
        if (Platform.OS === 'web') {
          window.alert('הקטגוריה נוספה בהצלחה');
        } else {
          Alert.alert('הצלחה', 'הקטגוריה נוספה בהצלחה');
        }
      }
      setModalVisible(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה בשמירת הקטגוריה');
      } else {
        Alert.alert('שגיאה', 'שגיאה בשמירת הקטגוריה');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    const doDelete = async () => {
      try {
        await CategoriesService.delete(category.id!);
        setCategories(categories.filter(c => c.id !== category.id));
        if (Platform.OS === 'web') {
          window.alert('הקטגוריה נמחקה בהצלחה');
        } else {
          Alert.alert('הצלחה', 'הקטגוריה נמחקה בהצלחה');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        if (Platform.OS === 'web') {
          window.alert('שגיאה במחיקת הקטגוריה');
        } else {
          Alert.alert('שגיאה', 'שגיאה במחיקת הקטגוריה');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`האם אתה בטוח שברצונך למחוק את הקטגוריה "${category.name}"?`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'מחיקת קטגוריה',
        `האם אתה בטוח שברצונך למחוק את הקטגוריה "${category.name}"?`,
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'מחק', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>ניהול קטגוריות</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Type Filter */}
        <View style={styles.filterRow}>
          <Chip
            selected={selectedType === 'all'}
            onPress={() => setSelectedType('all')}
            style={styles.filterChip}
          >
            הכל
          </Chip>
          <Chip
            selected={selectedType === 'income'}
            onPress={() => setSelectedType('income')}
            style={styles.filterChip}
            icon="arrow-up"
          >
            הכנסות
          </Chip>
          <Chip
            selected={selectedType === 'expense'}
            onPress={() => setSelectedType('expense')}
            style={styles.filterChip}
            icon="arrow-down"
          >
            הוצאות
          </Chip>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="חפש קטגוריה..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {/* Categories List */}
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9C27B0" />
              <Text style={styles.loadingText}>טוען קטגוריות...</Text>
            </View>
          ) : filteredCategories.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>לא נמצאו קטגוריות</Text>
                <Text style={styles.emptySubtext}>לחץ על + להוספת קטגוריה חדשה</Text>
              </Card.Content>
            </Card>
          ) : (
            filteredCategories.map((category) => (
              <Card key={category.id} style={styles.categoryCard}>
                <Card.Content>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <View style={[styles.categoryIcon, { backgroundColor: category.color || '#607D8B' }]}>
                        <MaterialCommunityIcons
                          name={category.icon as any || 'tag'}
                          size={24}
                          color="#fff"
                        />
                      </View>
                      <View style={styles.categoryText}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <View style={styles.categoryMeta}>
                          <Text style={styles.categoryType}>
                            {category.type === 'income' ? 'הכנסה' : 'הוצאה'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.categoryActions}>
                      <TouchableOpacity
                        onPress={() => openEditModal(category)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons name="pencil" size={20} color="#2196F3" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteCategory(category)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons name="delete" size={20} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>

        {/* Add Button */}
        <FAB
          style={styles.fab}
          icon="plus"
          label="קטגוריה חדשה"
          onPress={openAddModal}
        />

        {/* Add/Edit Modal */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}
              </Text>

              <Text style={styles.inputLabel}>שם הקטגוריה</Text>
              <TextInput
                style={styles.textInput}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="הזן שם קטגוריה"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>סוג</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, categoryType === 'expense' && styles.typeButtonActive]}
                  onPress={() => setCategoryType('expense')}
                >
                  <Text style={[styles.typeButtonText, categoryType === 'expense' && styles.typeButtonTextActive]}>
                    הוצאה
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, categoryType === 'income' && styles.typeButtonActive]}
                  onPress={() => setCategoryType('income')}
                >
                  <Text style={[styles.typeButtonText, categoryType === 'income' && styles.typeButtonTextActive]}>
                    הכנסה
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>צבע</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      categoryColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setCategoryColor(color)}
                  >
                    {categoryColor === color && (
                      <MaterialCommunityIcons name="check" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>אייקון</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPicker}>
                {ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      categoryIcon === icon && { backgroundColor: categoryColor }
                    ]}
                    onPress={() => setCategoryIcon(icon)}
                  >
                    <MaterialCommunityIcons
                      name={icon as any}
                      size={24}
                      color={categoryIcon === icon ? '#fff' : '#666'}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                >
                  ביטול
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveCategory}
                  loading={saving}
                  disabled={saving}
                  style={styles.modalButton}
                >
                  {editingCategory ? 'עדכן' : 'הוסף'}
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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
    flex: 1,
    padding: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    justifyContent: 'flex-end',
  },
  filterChip: {
    marginHorizontal: 2,
  },
  searchBar: {
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  categoryCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  categoryText: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 4,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  categoryType: {
    fontSize: 12,
    color: '#666',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
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
  fab: {
    position: 'absolute',
    margin: 16,
    left: 16,
    bottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  colorPicker: {
    flexDirection: 'row',
    maxHeight: 50,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#333',
  },
  iconPicker: {
    flexDirection: 'row',
    maxHeight: 50,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
