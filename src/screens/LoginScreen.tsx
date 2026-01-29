import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'שגיאה בהתחברות';

      if (error.code === 'auth/invalid-email') {
        errorMessage = 'כתובת אימייל לא תקינה';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'משתמש לא קיים';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'סיסמה שגויה';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'פרטי התחברות שגויים';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'יותר מדי נסיונות התחברות, נסה שוב מאוחר יותר';
      }

      Alert.alert('שגיאה', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="office-building" size={80} color="#6200EE" />
            <Text style={styles.title}>ועד בית</Text>
            <Text style={styles.subtitle}>מערכת ניהול ועד בית</Text>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="אימייל"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                left={<TextInput.Icon icon="email" />}
                style={styles.input}
              />

              <TextInput
                label="סיסמה"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.button}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  'התחבר'
                )}
              </Button>
            </Card.Content>
          </Card>

          <Text style={styles.footer}>גרסה 1.0.0</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200EE',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    elevation: 4,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    marginTop: 24,
    fontSize: 12,
  },
});
