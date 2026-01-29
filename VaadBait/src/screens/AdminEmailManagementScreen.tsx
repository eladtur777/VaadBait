import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl, Platform } from 'react-native';
import { List, Card, Switch, Button, ActivityIndicator, TextInput, Chip, IconButton, Divider } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebaseConfig';
import {
  AdminUsersService,
  EmailSettingsService,
  AdminUser,
  EmailSettings,
} from '../services/firebaseService';
import { useFocusEffect } from '@react-navigation/native';

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

export default function AdminEmailManagementScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin management
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Email settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [scheduleDay, setScheduleDay] = useState('20');
  const [scheduleHour, setScheduleHour] = useState('9');

  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null);
  const [loadingDebtSummary, setLoadingDebtSummary] = useState(false);

  const loadData = async () => {
    try {
      if (!user?.email) return;

      // Check if user is admin
      const adminCheck = await AdminUsersService.isAdmin(user.email);
      setIsAdmin(adminCheck);

      if (!adminCheck) {
        setLoading(false);
        return;
      }

      // Load all admin-related data
      const [admins, settings] = await Promise.all([
        AdminUsersService.getAll(),
        EmailSettingsService.get(),
      ]);

      setAdminUsers(admins);
      setEmailSettings(settings);

      if (settings) {
        setScheduleDay(settings.scheduleDay.toString());
        setScheduleHour(settings.scheduleHour.toString());
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לטעון את הנתונים');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לטעון את הנתונים');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.email])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSendEmailsNow = async () => {
    const doSend = async () => {
      setSendingEmails(true);
      try {
        const sendReminders = httpsCallable<void, { message: string; sent: number; totalDebts: number }>(
          functions,
          'sendDebtRemindersManual'
        );
        const result = await sendReminders();
        const successMsg = `נשלחו ${result.data.sent} מיילים מתוך ${result.data.totalDebts} דיירים עם חובות`;
        if (Platform.OS === 'web') {
          window.alert(successMsg);
        } else {
          Alert.alert('הצלחה', successMsg);
        }
      } catch (error: any) {
        console.error('Error sending emails:', error);
        let errorMsg = 'לא ניתן לשלוח את המיילים';
        if (error.code === 'functions/not-found') {
          errorMsg = 'הפונקציה לא נמצאה. יש לפרוס את ה-Cloud Functions.';
        }
        if (Platform.OS === 'web') {
          window.alert('שגיאה: ' + errorMsg);
        } else {
          Alert.alert('שגיאה', errorMsg);
        }
      } finally {
        setSendingEmails(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('האם לשלוח מיילים לכל הדיירים עם חובות פתוחים עכשיו?')) {
        await doSend();
      }
    } else {
      Alert.alert(
        'שליחת מיילים',
        'האם לשלוח מיילים לכל הדיירים עם חובות פתוחים עכשיו?',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'שלח', onPress: doSend },
        ]
      );
    }
  };

  const handleLoadDebtSummary = async () => {
    setLoadingDebtSummary(true);
    try {
      const getDebtSummary = httpsCallable<void, DebtSummary>(functions, 'getDebtSummary');
      const result = await getDebtSummary();
      setDebtSummary(result.data);
    } catch (error) {
      console.error('Error loading debt summary:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לטעון את סיכום החובות');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לטעון את סיכום החובות');
      }
    } finally {
      setLoadingDebtSummary(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      if (Platform.OS === 'web') {
        window.alert('יש להזין כתובת מייל');
      } else {
        Alert.alert('שגיאה', 'יש להזין כתובת מייל');
      }
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAdminEmail)) {
      if (Platform.OS === 'web') {
        window.alert('כתובת מייל לא תקינה');
      } else {
        Alert.alert('שגיאה', 'כתובת מייל לא תקינה');
      }
      return;
    }

    setAddingAdmin(true);
    try {
      await AdminUsersService.add({ email: newAdminEmail.trim() });
      setNewAdminEmail('');
      await loadData();
      if (Platform.OS === 'web') {
        window.alert('מנהל נוסף בהצלחה');
      } else {
        Alert.alert('הצלחה', 'מנהל נוסף בהצלחה');
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן להוסיף מנהל');
      } else {
        Alert.alert('שגיאה', 'לא ניתן להוסיף מנהל');
      }
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (admin: AdminUser) => {
    if (admin.email === user?.email?.toLowerCase()) {
      if (Platform.OS === 'web') {
        window.alert('לא ניתן להסיר את עצמך מרשימת המנהלים');
      } else {
        Alert.alert('שגיאה', 'לא ניתן להסיר את עצמך מרשימת המנהלים');
      }
      return;
    }

    const doRemove = async () => {
      try {
        await AdminUsersService.delete(admin.id!);
        await loadData();
      } catch (error) {
        console.error('Error removing admin:', error);
        if (Platform.OS === 'web') {
          window.alert('לא ניתן להסיר מנהל');
        } else {
          Alert.alert('שגיאה', 'לא ניתן להסיר מנהל');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`האם להסיר את ${admin.email} מרשימת המנהלים?`)) {
        await doRemove();
      }
    } else {
      Alert.alert(
        'הסרת מנהל',
        `האם להסיר את ${admin.email} מרשימת המנהלים?`,
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'הסר', style: 'destructive', onPress: doRemove },
        ]
      );
    }
  };

  const handleSaveSchedule = async () => {
    const day = parseInt(scheduleDay);
    const hour = parseInt(scheduleHour);

    if (isNaN(day) || day < 1 || day > 28) {
      if (Platform.OS === 'web') {
        window.alert('שגיאה: יום בחודש חייב להיות בין 1 ל-28');
      } else {
        Alert.alert('שגיאה', 'יום בחודש חייב להיות בין 1 ל-28');
      }
      return;
    }

    if (isNaN(hour) || hour < 0 || hour > 23) {
      if (Platform.OS === 'web') {
        window.alert('שגיאה: שעה חייבת להיות בין 0 ל-23');
      } else {
        Alert.alert('שגיאה', 'שעה חייבת להיות בין 0 ל-23');
      }
      return;
    }

    try {
      await EmailSettingsService.update({
        scheduleDay: day,
        scheduleHour: hour,
      });
      const successMsg = `תזמון המיילים עודכן ל-${day} לחודש בשעה ${hour}:00`;
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('הצלחה', successMsg);
      }
      await loadData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה: לא ניתן לשמור את הגדרות התזמון');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לשמור את הגדרות התזמון');
      }
    }
  };

  const handleToggleEmailEnabled = async () => {
    try {
      const newValue = !emailSettings?.isEnabled;
      await EmailSettingsService.update({
        isEnabled: newValue,
      });
      await loadData();
    } catch (error) {
      console.error('Error toggling email:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לעדכן את ההגדרה');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לעדכן את ההגדרה');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedIcon}>🔒</Text>
        <Text style={styles.accessDeniedTitle}>אין גישה</Text>
        <Text style={styles.accessDeniedText}>
          עמוד זה זמין למנהלי מערכת בלבד
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          חזרה
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <IconButton
          icon="arrow-right"
          iconColor="#fff"
          size={24}
          onPress={() => navigation.goBack()}
          style={styles.backIcon}
        />
        <Text style={styles.title}>ניהול התראות מייל</Text>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>פעולות מהירות</Text>

        <Card style={styles.actionCard}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleSendEmailsNow}
              loading={sendingEmails}
              disabled={sendingEmails}
              icon="email-send"
              buttonColor="#4CAF50"
              style={styles.actionButton}
            >
              שלח מיילים עכשיו
            </Button>
            <Text style={styles.actionDescription}>
              שליחת מיילי תזכורת לכל הדיירים עם חובות פתוחים
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.actionCard}>
          <Card.Content>
            <Button
              mode="outlined"
              onPress={handleLoadDebtSummary}
              loading={loadingDebtSummary}
              disabled={loadingDebtSummary}
              icon="clipboard-list"
              style={styles.actionButton}
            >
              טען סיכום חובות
            </Button>
          </Card.Content>
        </Card>

        {debtSummary && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryTitle}>
                סיכום חובות ({debtSummary.totalResidentsWithDebt} דיירים)
              </Text>
              {debtSummary.debts.map((debt, index) => (
                <View key={index} style={styles.debtItem}>
                  <Text style={styles.debtName}>
                    {debt.residentName} (דירה {debt.apartmentNumber})
                  </Text>
                  <Text style={styles.debtAmount}>
                    ₪{debt.totalDebt.toLocaleString()} {debt.hasEmail ? '✉️' : '❌'}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Schedule Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>תזמון אוטומטי</Text>

        <Card style={styles.card}>
          <List.Item
            title="מיילים אוטומטיים"
            description={emailSettings?.isEnabled ? 'פעיל' : 'מושבת'}
            left={() => <List.Icon icon="clock-outline" />}
            right={() => (
              <Switch
                value={emailSettings?.isEnabled || false}
                onValueChange={handleToggleEmailEnabled}
              />
            )}
          />
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleInput}>
                <Text style={styles.inputLabel}>יום בחודש</Text>
                <TextInput
                  mode="outlined"
                  value={scheduleDay}
                  onChangeText={setScheduleDay}
                  keyboardType="numeric"
                  style={styles.smallInput}
                />
              </View>
              <View style={styles.scheduleInput}>
                <Text style={styles.inputLabel}>שעה</Text>
                <TextInput
                  mode="outlined"
                  value={scheduleHour}
                  onChangeText={setScheduleHour}
                  keyboardType="numeric"
                  style={styles.smallInput}
                />
              </View>
            </View>
            <Button
              mode="contained"
              onPress={handleSaveSchedule}
              style={styles.saveButton}
            >
              שמור תזמון
            </Button>
            <Text style={styles.scheduleNote}>
              הערה: שינוי בתזמון יחול רק לאחר פריסה מחדש של הפונקציות בשרת
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Admin Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ניהול מנהלים</Text>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.addAdminRow}>
              <TextInput
                mode="outlined"
                placeholder="כתובת מייל"
                value={newAdminEmail}
                onChangeText={setNewAdminEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.adminInput}
              />
              <Button
                mode="contained"
                onPress={handleAddAdmin}
                loading={addingAdmin}
                disabled={addingAdmin}
                compact
              >
                הוסף
              </Button>
            </View>
          </Card.Content>
        </Card>

        {adminUsers.map((admin) => (
          <Card key={admin.id} style={styles.adminCard}>
            <List.Item
              title={admin.email}
              description={admin.email === user?.email?.toLowerCase() ? 'אתה' : ''}
              left={() => <List.Icon icon="account-key" />}
              right={() =>
                admin.email !== user?.email?.toLowerCase() && (
                  <IconButton
                    icon="delete"
                    iconColor="#f44336"
                    onPress={() => handleRemoveAdmin(admin)}
                  />
                )
              }
            />
          </Card>
        ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  accessDeniedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginTop: 16,
  },
  header: {
    padding: 20,
    backgroundColor: '#9C27B0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    marginLeft: -8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  actionCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#E3F2FD',
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
    color: '#1976D2',
  },
  debtItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  debtName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  debtAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f44336',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  scheduleInput: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  smallInput: {
    width: 80,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 8,
  },
  scheduleNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  addAdminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminInput: {
    flex: 1,
  },
  adminCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  spacer: {
    height: 32,
  },
});
