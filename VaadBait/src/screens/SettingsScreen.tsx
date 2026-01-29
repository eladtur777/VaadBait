import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { List, Card, Button, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFocusEffect } from '@react-navigation/native';
import app from '../../firebaseConfig';
import { AdminUsersService } from '../services/firebaseService';

const functions = getFunctions(app);

interface DebtSummary {
  totalResidentsWithDebt: number;
  debts: {
    residentName: string;
    apartmentNumber: string;
    totalDebt: number;
    hasEmail: boolean;
    committeeFeeCount: number;
    pendingPaymentCount: number;
    chargingBillCount: number;
  }[];
}

export default function SettingsScreen({ navigation }: any) {
  const [sendingEmails, setSendingEmails] = useState(false);
  const [loadingDebtSummary, setLoadingDebtSummary] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, logout } = useAuth();

  useFocusEffect(
    useCallback(() => {
      const checkAdmin = async () => {
        if (user?.email) {
          const adminStatus = await AdminUsersService.isAdmin(user.email);
          setIsAdmin(adminStatus);
        }
      };
      checkAdmin();
    }, [user?.email])
  );

  const doLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן להתנתק');
      } else {
        Alert.alert('שגיאה', 'לא ניתן להתנתק');
      }
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('האם אתה בטוח שברצונך להתנתק?');
      if (confirmed) {
        doLogout();
      }
    } else {
      Alert.alert(
        'התנתקות',
        'האם אתה בטוח שברצונך להתנתק?',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'התנתק',
            style: 'destructive',
            onPress: () => doLogout(),
          },
        ]
      );
    }
  };

  const handleViewDebtSummary = async () => {
    setLoadingDebtSummary(true);
    try {
      const getDebtSummary = httpsCallable<void, DebtSummary>(functions, 'getDebtSummary');
      const result = await getDebtSummary();
      const data = result.data;

      if (data.totalResidentsWithDebt === 0) {
        if (Platform.OS === 'web') {
          window.alert('סיכום חובות\n\nאין דיירים עם חובות פתוחים!');
        } else {
          Alert.alert('סיכום חובות', 'אין דיירים עם חובות פתוחים! 🎉');
        }
        return;
      }

      const debtDetails = data.debts
        .map(d => `• ${d.residentName} (דירה ${d.apartmentNumber}): ₪${d.totalDebt.toLocaleString()} ${d.hasEmail ? '(יש מייל)' : '(אין מייל)'}`)
        .join('\n');

      const message = `סיכום חובות (${data.totalResidentsWithDebt} דיירים)\n\n${debtDetails}`;

      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert(
          `סיכום חובות (${data.totalResidentsWithDebt} דיירים)`,
          debtDetails,
          [{ text: 'סגור' }]
        );
      }
    } catch (error: any) {
      console.error('Error getting debt summary:', error);
      const errorMsg = 'לא ניתן לטעון את סיכום החובות';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('שגיאה', errorMsg);
      }
    } finally {
      setLoadingDebtSummary(false);
    }
  };

  const doSendDebtReminders = async () => {
    setSendingEmails(true);
    try {
      const sendReminders = httpsCallable<void, { message: string; sent: number; recipients: number; totalResidentsWithDebt: number; totalDebt: number }>(
        functions,
        'sendDebtRemindersManual'
      );
      const result = await sendReminders();
      const successMsg = `נשלחו ${result.data.sent} מיילים מתוך ${result.data.recipients} נמענים.\n\nסה"כ דיירים עם חוב: ${result.data.totalResidentsWithDebt}\nסה"כ חובות: ₪${result.data.totalDebt?.toLocaleString() || 0}`;

      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('הצלחה', successMsg);
      }
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      const errorMsg = 'לא ניתן לשלוח את התזכורות';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('שגיאה', errorMsg);
      }
    } finally {
      setSendingEmails(false);
    }
  };

  const handleSendDebtReminders = () => {
    const confirmMsg = 'האם לשלוח מייל תזכורת לועד הבית עם סיכום החובות?';

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        doSendDebtReminders();
      }
    } else {
      Alert.alert(
        'שליחת תזכורות חוב',
        confirmMsg,
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'שלח', onPress: () => doSendDebtReminders() },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>הגדרות</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>כללי</Text>

        <Card style={styles.card}>
          <List.Item
            title="שפה"
            description="עברית"
            left={() => <List.Icon icon="translate" />}
          />
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="מטבע"
            description="שקל ישראלי (₪)"
            left={() => <List.Icon icon="currency-ils" />}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>קטגוריות</Text>

        <Card style={styles.card}>
          <List.Item
            title="ניהול קטגוריות"
            description="ערוך קטגוריות הכנסות והוצאות"
            left={() => <List.Icon icon="tag-multiple" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => navigation.navigate('ManageCategories')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>התראות במייל</Text>

        <Card style={styles.card}>
          <List.Item
            title="סיכום חובות"
            description="צפה ברשימת הדיירים עם חובות פתוחים"
            left={() => <List.Icon icon="clipboard-list" />}
            right={() => loadingDebtSummary
              ? <ActivityIndicator size="small" color="#9C27B0" />
              : <List.Icon icon="chevron-left" />}
            onPress={loadingDebtSummary ? undefined : handleViewDebtSummary}
          />
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="שלח תזכורות חוב"
            description="שליחת מייל לועד הבית עם חובות קיימים"
            left={() => <List.Icon icon="email-send" />}
            right={() => sendingEmails
              ? <ActivityIndicator size="small" color="#9C27B0" />
              : <List.Icon icon="chevron-left" />}
            onPress={sendingEmails ? undefined : handleSendDebtReminders}
          />
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoText}>
              📧 מיילים אוטומטיים נשלחים ב-20 לכל חודש בשעה 9:00
            </Text>
            <Text style={styles.infoSubtext}>
              המייל כולל: דמי ועד, תשלומים צפויים, וחשבונות טעינה
            </Text>
          </Card.Content>
        </Card>

        {isAdmin && (
          <Card style={styles.adminCard}>
            <List.Item
              title="ניהול התראות מייל"
              description="הגדרות מתקדמות למנהלים"
              left={() => <List.Icon icon="shield-key" color="#9C27B0" />}
              right={() => <List.Icon icon="chevron-left" />}
              onPress={() => navigation.navigate('AdminEmailManagement')}
            />
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>נתונים</Text>

        <Card style={styles.card}>
          <List.Item
            title="גיבוי"
            description="גבה את הנתונים שלך"
            left={() => <List.Icon icon="cloud-upload" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => console.log('Backup')}
          />
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="שחזור"
            description="שחזר נתונים מגיבוי"
            left={() => <List.Icon icon="cloud-download" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => console.log('Restore')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>משתמש</Text>

        <Card style={styles.card}>
          <List.Item
            title="מחובר כ"
            description={user?.email || ''}
            left={() => <List.Icon icon="account" />}
          />
        </Card>

        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor="#f44336"
          icon="logout"
        >
          התנתק
        </Button>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>עזרה</Text>

        <Card style={styles.card}>
          <List.Item
            title="מדריך למשתמש"
            description="הסברים על השימוש באפליקציה"
            left={() => <List.Icon icon="book-open-variant" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => navigation.navigate('UserGuide')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>אודות</Text>

        <Card style={styles.card}>
          <List.Item
            title="גרסה"
            description="1.0.0"
            left={() => <List.Icon icon="information" />}
          />
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="נבנה עם"
            description="React Native + Expo + TypeScript"
            left={() => <List.Icon icon="code-tags" />}
          />
        </Card>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  spacer: {
    height: 32,
  },
  header: {
    padding: 20,
    backgroundColor: '#9C27B0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 8,
  },
  adminCard: {
    backgroundColor: '#F3E5F5',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'right',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  logoutButton: {
    marginTop: 8,
  },
});
