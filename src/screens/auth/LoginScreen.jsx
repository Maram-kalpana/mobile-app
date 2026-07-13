import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  StatusBar,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from "@react-native-async-storage/async-storage";


const { height, width } = Dimensions.get('window');

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── FULL-SCREEN CONSTRUCTION BACKGROUND ── */}
      <ImageBackground
        source={require('../../../assets/construction1.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* dark tint overlay */}
        <View style={styles.overlay} />
      </ImageBackground>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.screen, { paddingTop: insets.top }]}>

             <View style={styles.logoContainer}>
  <Image
    source={require('../../../assets/sruthika_final_logo.png')}
    style={styles.centerLogo}
    resizeMode="contain"
  />

  <Text style={styles.logoText}>
    SRUTHIKA CONSTRUCTIONS
  </Text>
</View>

              {/* ── WHITE CARD ── */}
              <View style={styles.whiteCard}>

                <View style={styles.titleWrapper}>
                  <Text style={styles.title}>Sign In</Text>
                  <View style={styles.titleUnderline} />
                  <Text style={styles.subtitle}>Welcome back! Please login to continue.</Text>
                </View>

                <Text style={styles.label}>Username</Text>
                <View style={styles.inputBox}>
                  <MaterialCommunityIcons name="account-outline" size={20} color="#4A90E2" />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    style={styles.input}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>

                <Text style={styles.label}>Password</Text>
                <View style={styles.inputBox}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color="#4A90E2" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    secureTextEntry={secure}
                    style={styles.input}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <TouchableOpacity onPress={() => setSecure(!secure)}>
                    <MaterialCommunityIcons
                      name={secure ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="rgba(0,0,0,0.35)"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.rememberRow}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && (
                        <MaterialCommunityIcons name="check" size={11} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.remember}>Remember Me</Text>
                  </TouchableOpacity>
                  <Text style={styles.forgot}>Forgot Password?</Text>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={styles.loginBtn}
                  activeOpacity={0.85}
                  onPress={async () => {
                    Keyboard.dismiss();
                    setError('');
                    try {
                      await login({ username, password });
                    } catch {
                      setError('Invalid username or password');
                    }
                  }}
                >
                  <Text style={styles.btnText}>Login</Text>
                </TouchableOpacity>

                <View style={styles.dotsRow}>
                  <View style={[styles.dot, styles.dotActive]} />
                  <View style={styles.dot} />
                  <View style={styles.dot} />
                </View>

              </View>

              <View style={{ height: insets.bottom + 24 }} />
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.60)',
  },

  screen: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },

  // ── Header Row ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingHorizontal: 4,
    minHeight: 140,
  },

  welcomeTextBlock: {
    flex: 1.4,
    justifyContent: 'center',
    paddingRight: 10,
  },

  welcomeLine1: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  welcomeLine2: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1B2A6B',
    letterSpacing: -0.5,
    lineHeight: 46,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  welcomeLine3: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1B2A6B',
    letterSpacing: 0.3,
    lineHeight: 32,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  logo: {
    width: 140,
    height: 140,
    flexShrink: 0,
  },

  // ── White Card ──
  whiteCard: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 14,
  },

  titleWrapper: {
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A2A4A',
    letterSpacing: -0.5,
  },

  titleUnderline: {
    width: 36,
    height: 3,
    backgroundColor: '#e85757',
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 2,
  },

  subtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.45)',
    fontWeight: '400',
  },

  label: {
    marginBottom: 5,
    color: '#1A2A4A',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0,0,0,0.12)',
    marginBottom: 18,
    paddingBottom: 8,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1A2A4A',
    fontWeight: '500',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#4A90E2',
    marginRight: 8,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#4A90E2',
  },

  remember: {
    color: 'rgba(0,0,0,0.55)',
    fontSize: 13,
  },

  forgot: {
    color: '#e85757',
    fontSize: 13,
    fontWeight: '600',
  },

  error: {
    color: '#e85757',
    marginBottom: 8,
    fontSize: 13,
  },

  loginBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },

  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  dotActive: {
    backgroundColor: '#4A90E2',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logoContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,   // reduced space below
  marginTop: -40,     // moves logo upward
},

centerLogo: {
  width: 240,   // increased width
  height: 180,
},

logoText: {
    // 🔼 move text upward (reduce space)
  fontSize: 20,          // 🔼 slightly bigger text
  fontWeight: '800',
  color: 'rgb(255, 255, 255)',
  letterSpacing: 6,      // 🔼 increases width (spreads letters)
  textAlign: 'center',   // keep centered
},
});