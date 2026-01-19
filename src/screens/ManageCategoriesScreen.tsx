import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Card, FAB, Chip, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ManageCategoriesScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');

  // TODO: Load from database
  const categories = [
    { id: 1, name: 'משכורת', type: 'income', icon: 'cash', color: '#4CAF50', isDefault: true },
    { id: 2, name: 'הכנסה נוספת', type: 'income', icon: 'cash-plus', color: '#8BC34A', isDefault: true },
    { id: 3, name: 'מכולת', type: 'expense', icon: 'cart', color: '#FF9800', isDefault: true },
    { id: 4, name: 'חשמל', type: 'expense', icon: 'lightning-bolt', color: '#FFC107', isDefault: true },
    { id: 5, name: 'מים', type: 'expense', icon: 'water', color: '#2196F3', isDefault: true },
    { id: 6, name: 'ארנונה', type: 'expense', icon: 'city', color: '#9C27B0', isDefault: true },
    { id: 7, name: 'ניקיון', type: 'expense', icon: 'broom', color: '#4CAF50', isDefault: true },
    { id: 8, name: 'קטגוריה מותאמת', type: 'expense', icon: 'tag', color: '#607D8B', isDefault: false },
  ];

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.includes(searchQuery);
    const matchesType = selectedType === 'all' || cat.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleEditCategory = (category: any) => {
    console.log('Edit category:', category);
    // TODO: Navigate to edit category screen
  };

  const handleDeleteCategory = (category: any) => {
    console.log('Delete category:', category);
    // TODO: Show confirmation dialog and delete
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
        <ScrollView style={styles.list}>
          {filteredCategories.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>לא נמצאו קטגוריות</Text>
              </Card.Content>
            </Card>
          ) : (
            filteredCategories.map((category) => (
              <Card key={category.id} style={styles.categoryCard}>
                <Card.Content>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                        <MaterialCommunityIcons
                          name={category.icon}
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
                          {category.isDefault && (
                            <Chip style={styles.defaultChip} textStyle={styles.defaultChipText}>
                              ברירת מחדל
                            </Chip>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.categoryActions}>
                      <TouchableOpacity
                        onPress={() => handleEditCategory(category)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons name="pencil" size={20} color="#2196F3" />
                      </TouchableOpacity>
                      {!category.isDefault && (
                        <TouchableOpacity
                          onPress={() => handleDeleteCategory(category)}
                          style={styles.actionButton}
                        >
                          <MaterialCommunityIcons name="delete" size={20} color="#f44336" />
                        </TouchableOpacity>
                      )}
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
          onPress={() => console.log('Add category')}
        />
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
  defaultChip: {
    height: 24,
    backgroundColor: '#E3F2FD',
  },
  defaultChipText: {
    fontSize: 10,
    color: '#1976D2',
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
  },
  fab: {
    position: 'absolute',
    margin: 16,
    left: 16,
    bottom: 16,
  },
});
