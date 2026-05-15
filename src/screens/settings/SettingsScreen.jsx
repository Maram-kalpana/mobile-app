import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, Platform, Alert,
  Modal, Dimensions, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const APP_VERSION = '1.0.0';
const SCREEN_HEIGHT = Dimensions.get('window').height;

const TERMS_CONTENT = `
**Terms & Conditions – Srutika Constructions**

**1. Acceptance of Terms**
By accessing or using the Srutika Constructions mobile application ("App"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the App.

**2. Description of Service**
The App provides project management tools for construction site operations, including labour tracking, material management, machinery records, expense monitoring, and daily reporting. The App is intended for authorised personnel of Srutika Constructions and its partners.

**3. User Responsibilities**
3.1 You are responsible for maintaining the confidentiality of your login credentials.
3.2 You agree not to misuse the App for any unlawful purpose.
3.3 You shall ensure that all data entered into the App is accurate to the best of your knowledge.

**4. Data Accuracy**
While we strive for accuracy, Srutika Constructions does not guarantee the completeness or reliability of any data entered by users. Users remain responsible for verifying critical information through official records.

**5. Intellectual Property**
All content, design, logos, and software components of this App are the intellectual property of Srutika Constructions. You may not reproduce, distribute, or modify any part without explicit written permission.

**6. Limitation of Liability**
Srutika Constructions shall not be held liable for any indirect, incidental, or consequential damages arising from the use or inability to use this App.

**7. Modifications**
We reserve the right to modify these terms at any time. Users will be notified of material changes via the App or registered contact.

**8. Termination**
We may suspend or terminate access to the App at any time without prior notice if we suspect a violation of these terms.

**9. Governing Law**
These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in [Your City/State].

**10. Contact**
For questions regarding these terms, contact: support@srutikaconstr.com
`;

const PRIVACY_CONTENT = `
**Privacy Policy – Srutika Constructions**

**1. Information We Collect**
1.1 **Personal Information**: Name, phone number, email address, profile photo, and role/designation.
1.2 **Project Data**: Site names, labour records, material inventories, machinery logs, expense entries, and daily reports.
1.3 **Device Information**: Device model, operating system version, and unique device identifiers for security purposes.

**2. How We Use Your Information**
2.1 To authenticate users and control access to projects.
2.2 To record, store, and display construction site data.
2.3 To generate reports and analytics for project management.
2.4 To communicate important updates, alerts, and support responses.

**3. Data Sharing**
We do not sell your personal data. Data may be shared with:
3.1 Authorised project partners and site supervisors.
3.2 Government authorities if required by law.
3.3 Third-party service providers (e.g., cloud hosting) who are bound by confidentiality agreements.

**4. Data Security**
We implement industry-standard security measures including encryption (TLS/SSL), token-based authentication, and secure API endpoints to protect your data.

**5. Data Retention**
Your data is retained for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting support.

**6. Your Rights**
6.1 Access and review the personal data we hold about you.
6.2 Request corrections to inaccurate data.
6.3 Request deletion of your account and personal data.

**7. Changes to This Policy**
We may update this Privacy Policy from time to time. Significant changes will be communicated via the App.

**8. Contact Us**
For privacy-related inquiries:
Email: support@srutikaconstr.com
`;

export function SettingsScreen({ navigation }) {

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  React.useLayoutEffect(() => {
    navigation?.setOptions?.({ headerShown: false });
  }, [navigation]);

  const RowArrow = ({ icon, color, label, sub, onPress }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const RowInfo = ({ icon, color, label, value }) => (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{label}</Text>
      </View>
      <Text style={styles.valueText}>{value}</Text>
    </View>
  );

  /** Shared bottom-sheet modal */
  const BottomSheetModal = ({ visible, onClose, title, content }) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        {/* empty area to tap-close */}
      </Pressable>

      <View style={styles.bottomSheet}>
        {/* Handle bar */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Title */}
        <Text style={styles.sheetTitle}>{title}</Text>

        {/* Content */}
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.sheetBody}>{content}</Text>
        </ScrollView>

        {/* Close button */}
        <TouchableOpacity
          style={styles.sheetCloseBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.sheetCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── HERO ── */}
      <LinearGradient
        colors={['#4A90E2', '#2c5f9e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Settings</Text>
        <Text style={styles.heroSub}>App preferences & site configuration</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── ABOUT ── */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.section}>
          <RowInfo
            icon="cellphone-information"
            color="#4A90E2"
            label="App Version"
            value={`v${APP_VERSION}`}
          />
          <View style={styles.divider} />
          <RowArrow
            icon="file-document-outline"
            color="#8b5cf6"
            label="Terms & Conditions"
            onPress={() => setShowTerms(true)}
          />
          <View style={styles.divider} />
          <RowArrow
            icon="shield-outline"
            color="#10b981"
            label="Privacy Policy"
            onPress={() => setShowPrivacy(true)}
          />
          <View style={styles.divider} />
          <RowArrow
            icon="headset"
            color="#f59e0b"
            label="Contact Support"
            sub="Raise a ticket or call helpdesk"
            onPress={() => Alert.alert('Support', 'support@srutikaconstr.com')}
          />
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── TERMS BOTTOM SHEET ── */}
      <BottomSheetModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms & Conditions"
        content={TERMS_CONTENT}
      />

      {/* ── PRIVACY BOTTOM SHEET ── */}
      <BottomSheetModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
        content={PRIVACY_CONTENT}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },

  hero: {
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 22,
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },

  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  scroll: { flex: 1 },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9baabb',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',

    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }),
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2f4b',
  },

  rowSub: {
    fontSize: 11,
    color: '#9baabb',
    marginTop: 2,
    lineHeight: 16,
  },

  valueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A90E2',
  },

  divider: {
    height: 1,
    backgroundColor: '#f0f4fa',
    marginLeft: 67,
  },

  // ── Bottom sheet styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },

  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2f4b',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  sheetScroll: {
    paddingHorizontal: 20,
  },

  sheetScrollContent: {
    paddingBottom: 12,
  },

  sheetBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#3a4a62',
  },

  sheetCloseBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },

  sheetCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});