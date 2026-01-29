import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button, Card, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsService } from '../services/firebaseService';

export default function UpdateKwhPriceScreen({ navigation }: any) {
  const [currentPrice, setCurrentPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentPrice();
  }, []);

  const loadCurrentPrice = async () => {
    try {
      const settings = await SettingsService.get();
      if (settings?.kwhPrice) {
        setCurrentPrice(settings.kwhPrice.toString());
      } else {
        setCurrentPrice('0.55');
      }
    } catch (error) {
      console.error('Error loading price:', error);
      setCurrentPrice('0.55');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentPrice || parseFloat(currentPrice) <= 0) {
      Alert.alert('שגיאה', 'נא להזין מחיר תקין');
      return;
    }

    setSaving(true);
    try {
      await SettingsService.update({
        kwhPrice: parseFloat(currentPrice),
      });
      Alert.alert('הצלחה', 'המחיר עודכן בהצלחה', [
        { text: 'אישור', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving price:', error);
      Alert.alert('שגיאה', 'לא ניתן לשמור את המחיר');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>עדכן מחיר קוט"ש</Text>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="information" size={24} color="#4CAF50" />
              <Text style={styles.infoText}>
                מחיר זה ישמש לחישוב חשבונות חשמל עבור עמדות הטעינה
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Current Price Display */}
        <Card style={styles.priceDisplayCard}>
          <Card.Content>
            <Text style={styles.label}>מחיר נוכחי</Text>
            <Text style={styles.currentPriceText}>₪{currentPrice} לקוט"ש</Text>
          </Card.Content>
        </Card>

        {/* New Price Input */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label='מחיר חדש לקוט"ש (₪)'
              value={currentPrice}
              onChangeText={setCurrentPrice}
              mode="outlined"
              keyboardType="numeric"
              placeholder="0.55"
              right={<TextInput.Icon icon="cash" />}
            />
            <Text style={styles.helperText}>
              המחיר הנוכחי של חברת החשמל
            </Text>
          </Card.Content>
        </Card>

        {/* Impact Warning */}
        <Card style={styles.warningCard}>
          <Card.Content>
            <View style={styles.warningRow}>
              <MaterialCommunityIcons name="alert" size={24} color="#FF9800" />
              <Text style={styles.warningText}>
                שינוי המחיר ישפיע על כל החישובים החדשים שיבוצעו מעכשיו ואילך
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          buttonColor="#4CAF50"
          icon="check"
          loading={saving}
          disabled={saving || !currentPrice || parseFloat(currentPrice) <= 0}
        >
          שמור מחיר חדש
        </Button>

        {parseFloat(currentPrice) <= 0 && currentPrice && (
          <Text style={styles.errorText}>
            המחיר חייב להיות גדול מ-0
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  card: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  priceDisplayCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  label: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
  },
  currentPriceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    marginBottom: 16,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#F57C00',
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
