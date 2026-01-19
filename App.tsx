import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, DefaultTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Auth
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';

// Main Screens
import PersonalScreen from './src/screens/PersonalScreen';
import CommitteeScreen from './src/screens/CommitteeScreen';
import ChargingStationScreen from './src/screens/ChargingStationScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Sub-Screens
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import ManageResidentsScreen from './src/screens/ManageResidentsScreen';
import AddResidentScreen from './src/screens/AddResidentScreen';
import FeeCollectionScreen from './src/screens/FeeCollectionScreen';
import CommitteeExpensesScreen from './src/screens/CommitteeExpensesScreen';
import AddCommitteeExpenseScreen from './src/screens/AddCommitteeExpenseScreen';
import CommitteeIncomeScreen from './src/screens/CommitteeIncomeScreen';
import AddCommitteeIncomeScreen from './src/screens/AddCommitteeIncomeScreen';
import AddChargingStationScreen from './src/screens/AddChargingStationScreen';
import RecordMeterReadingScreen from './src/screens/RecordMeterReadingScreen';
import UpdateKwhPriceScreen from './src/screens/UpdateKwhPriceScreen';
import ChargingBillsScreen from './src/screens/ChargingBillsScreen';
import EditChargingBillScreen from './src/screens/EditChargingBillScreen';
import PendingPaymentsScreen from './src/screens/PendingPaymentsScreen';
import EditPendingPaymentScreen from './src/screens/EditPendingPaymentScreen';
import ManageCategoriesScreen from './src/screens/ManageCategoriesScreen';
import MonthlyReportScreen from './src/screens/MonthlyReportScreen';
import ChargingStationReportScreen from './src/screens/ChargingStationReportScreen';
import CommitteeReportScreen from './src/screens/CommitteeReportScreen';

// Database
import { initializeDatabase } from './src/database/schema';

// Enable RTL for Hebrew - ensure these are actual booleans
const isRTL = true;
I18nManager.allowRTL(isRTL);
I18nManager.forceRTL(isRTL);

const Tab = createBottomTabNavigator();
const PersonalStack = createStackNavigator();
const CommitteeStack = createStackNavigator();
const ChargingStack = createStackNavigator();
const ReportsStack = createStackNavigator();
const SettingsStack = createStackNavigator();

// Custom theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200EE',
    accent: '#03DAC6',
  },
};

// Stack Navigators for each tab
function PersonalStackScreen() {
  return (
    <PersonalStack.Navigator screenOptions={{ headerShown: false }}>
      <PersonalStack.Screen name="PersonalHome" component={PersonalScreen} />
      <PersonalStack.Screen name="AddTransaction" component={AddTransactionScreen} />
    </PersonalStack.Navigator>
  );
}

function CommitteeStackScreen() {
  return (
    <CommitteeStack.Navigator screenOptions={{ headerShown: false }}>
      <CommitteeStack.Screen name="CommitteeHome" component={CommitteeScreen} />
      <CommitteeStack.Screen name="ManageResidents" component={ManageResidentsScreen} />
      <CommitteeStack.Screen name="AddResident" component={AddResidentScreen} />
      <CommitteeStack.Screen name="FeeCollection" component={FeeCollectionScreen} />
      <CommitteeStack.Screen name="CommitteeIncome" component={CommitteeIncomeScreen} />
      <CommitteeStack.Screen name="AddCommitteeIncome" component={AddCommitteeIncomeScreen} />
      <CommitteeStack.Screen name="CommitteeExpenses" component={CommitteeExpensesScreen} />
      <CommitteeStack.Screen name="AddCommitteeExpense" component={AddCommitteeExpenseScreen} />
      <CommitteeStack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
      <CommitteeStack.Screen name="EditPendingPayment" component={EditPendingPaymentScreen} />
    </CommitteeStack.Navigator>
  );
}

function ChargingStackScreen() {
  return (
    <ChargingStack.Navigator screenOptions={{ headerShown: false }}>
      <ChargingStack.Screen name="ChargingHome" component={ChargingStationScreen} />
      <ChargingStack.Screen name="AddChargingStation" component={AddChargingStationScreen} />
      <ChargingStack.Screen name="RecordMeterReading" component={RecordMeterReadingScreen} />
      <ChargingStack.Screen name="UpdateKwhPrice" component={UpdateKwhPriceScreen} />
      <ChargingStack.Screen name="ChargingBills" component={ChargingBillsScreen} />
      <ChargingStack.Screen name="EditChargingBill" component={EditChargingBillScreen} />
    </ChargingStack.Navigator>
  );
}

function ReportsStackScreen() {
  return (
    <ReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStack.Screen name="ReportsHome" component={ReportsScreen} />
      <ReportsStack.Screen name="MonthlyReport" component={MonthlyReportScreen} />
      <ReportsStack.Screen name="ChargingStationReport" component={ChargingStationReportScreen} />
      <ReportsStack.Screen name="CommitteeReport" component={CommitteeReportScreen} />
    </ReportsStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
      <SettingsStack.Screen name="ManageCategories" component={ManageCategoriesScreen} />
    </SettingsStack.Navigator>
  );
}

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initMessage, setInitMessage] = useState('');

  useEffect(() => {
    const initApp = async () => {
      try {
        setInitMessage('מאתחל...');

        // Initialize database with timeout protection
        const initPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Database initialization timeout - please restart the app'));
          }, 15000); // 15 second timeout

          setTimeout(() => {
            try {
              initializeDatabase();
              clearTimeout(timeout);
              setInitMessage('✅ מסד הנתונים מוכן');
              resolve(true);
            } catch (err) {
              clearTimeout(timeout);
              reject(err);
            }
          }, 0);
        });

        await initPromise;

        setInitMessage('✅ מוכן');
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsInitialized(true);
      } catch (err) {
        console.error('Initialization failed:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setInitMessage('❌ שגיאה באתחול');
      }
    };

    // Catch any unhandled errors during initialization
    initApp().catch((err) => {
      console.error('Unhandled error in initApp:', err);
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>בודק התחברות...</Text>
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#f44336" />
        <Text style={styles.errorTitle}>שגיאה באתחול האפליקציה</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Button mode="contained" onPress={() => {
          setError(null);
          setIsInitialized(false);
          setInitMessage('');
        }} style={styles.retryButton}>
          נסה שוב
        </Button>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>{initMessage}</Text>
      </View>
    );
  }

  // Wrap navigation in error handling
  try {
    return (
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen
            name="Personal"
            component={PersonalStackScreen}
            options={{
              tabBarLabel: 'אישי',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="home" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Committee"
            component={CommitteeStackScreen}
            options={{
              tabBarLabel: 'ועד',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="office-building" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Charging"
            component={ChargingStackScreen}
            options={{
              tabBarLabel: 'טעינה',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="ev-station" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Reports"
            component={ReportsStackScreen}
            options={{
              tabBarLabel: 'דוחות',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="chart-line" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsStackScreen}
            options={{
              tabBarLabel: 'הגדרות',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="cog" color={color} size={size} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    );
  } catch (renderError) {
    console.error('Render error:', renderError);
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#f44336" />
        <Text style={styles.errorTitle}>שגיאה בטעינת הממשק</Text>
        <Text style={styles.errorMessage}>
          {renderError instanceof Error ? renderError.message : String(renderError)}
        </Text>
      </View>
    );
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
  },
});
