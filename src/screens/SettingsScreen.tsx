import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Card, Switch, Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen({ navigation }: any) {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התנתק',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('שגיאה', 'לא ניתן להתנתק');
            }
          },
        },
      ]
    );
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
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => console.log('Language')}
          />
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="מטבע"
            description="שקל ישראלי (₪)"
            left={() => <List.Icon icon="currency-ils" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => console.log('Currency')}
          />
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="התראות"
            description="קבל התראות על תשלומים"
            left={() => <List.Icon icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            )}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>חשבונות</Text>

        <Card style={styles.card}>
          <List.Item
            title="חשבון אישי"
            description="משק הבית שלי"
            left={() => <List.Icon icon="home" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => console.log('Personal account')}
          />
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="חשבון ועד"
            description="צור או נהל חשבון ועד"
            left={() => <List.Icon icon="office-building" />}
            right={() => <List.Icon icon="chevron-left" />}
            onPress={() => console.log('Committee account')}
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
  logoutButton: {
    marginTop: 8,
  },
});
