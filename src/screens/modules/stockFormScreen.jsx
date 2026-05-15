import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppTextField } from '../../components/AppTextField';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SelectField } from '../../components/SelectField';
import { DatePickerField } from '../../components/DatePickerField';
import { useApp } from '../../contexts/AppContext';
import { getItems } from '../../api/itemApi';
import { addStockReport, updateStockReport, getStockReportDetails } from '../../api/stockApi';
import { colors } from '../../theme/theme';

function parseStockNum(s) {
  const n = parseFloat(String(s ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
}

function formatBalance(n) {
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function StockFormScreen({ route, navigation }) {
  const { projectId, entryId } = route.params || {};
  const { dateKey, projects, vendors } = useApp();
  const today = dateKey();

  const [date, setDate] = useState(today);
  const [itemId, setItemId] = useState(null);
  const [vendorId, setVendorId] = useState(null);
  const [openBal, setOpenBal] = useState('');
  const [received, setReceived] = useState('');
  const [cum, setCum] = useState('');
  const [bal, setBal] = useState('');
  const [editReason, setEditReason] = useState('');
  const [itemsList, setItemsList] = useState([]);

  const isEditMode = !!entryId;
  const projectTitle =
    projects.find((p) => String(p.id) === String(projectId))?.name || 'Project';

  useEffect(() => {
    const loadItems = async () => {
      try {
        const iRes = await getItems();
        if (iRes?.data?.success && iRes.data.data.length > 0) {
          setItemsList(iRes.data.data);
        } else {
          setItemsList([
            { id: 1, name: 'Cement' },
            { id: 2, name: 'Steel' },
            { id: 3, name: 'Sand' },
          ]);
        }
      } catch (err) {
        console.log('Items fetch error:', err?.response?.data || err);
        setItemsList([
          { id: 1, name: 'Cement' },
          { id: 2, name: 'Steel' },
          { id: 3, name: 'Sand' },
        ]);
      }
    };
    loadItems();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    if (!entryId) {
      setDate(today);
      setItemId(null);
      setVendorId(null);
      setOpenBal('');
      setReceived('');
      setCum('');
      setBal('');
      setEditReason('');
      return;
    }
    (async () => {
      try {
        const res = await getStockReportDetails(entryId);
        const data = res?.data?.data ?? res?.data ?? {};
        setDate(data.date || today);
        setItemId(data.item_id ?? data.itemId ?? null);
        setVendorId(data.vendor_id ?? data.vendorId ?? null);
        setOpenBal(String(data.opening_balance ?? data.open_bal ?? data.openBal ?? ''));
        setReceived(String(data.received ?? data.received_qty ?? ''));
        setCum(String(data.used ?? data.cum ?? data.cumulative ?? data.consumed ?? ''));
        setBal(String(data.bal ?? data.balance ?? data.closing_balance ?? ''));
        setEditReason('');
      } catch (err) {
        console.log('Stock details fetch error:', err?.response?.data || err.message);
      }
    })();
  }, [entryId, projectId, today]);

  useEffect(() => {
    const o = parseStockNum(openBal);
    const r = parseStockNum(received);
    const c = parseStockNum(cum);
    if (!Number.isFinite(o) && !Number.isFinite(r) && !Number.isFinite(c)) {
      return;
    }
    const o2 = Number.isFinite(o) ? o : 0;
    const r2 = Number.isFinite(r) ? r : 0;
    const c2 = Number.isFinite(c) ? c : 0;
    setBal(formatBalance(o2 + r2 - c2));
  }, [openBal, received, cum]);

  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!projectId) {
      Alert.alert('Error', 'Missing project');
      return;
    }
    if (!itemId || !vendorId) {
      Alert.alert('Error', 'Select item and vendor');
      return;
    }
    if (isEditMode && !editReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for editing before updating.');
      return;
    }

    const formattedDate =
      typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];

    const payload = {
      date: formattedDate,
      project_id: projectId,
      item_id: itemId,
      vendor_id: vendorId,
      opening_balance: openBal.trim(),
      received: received.trim(),
      used: cum.trim(),
    };
    if (isEditMode) {
      payload.remark = editReason.trim();
    }

    setSaving(true);
    try {
      console.log('Update payload:', JSON.stringify(payload));
      if (isEditMode) {
        await updateStockReport(entryId, payload);
      } else {
        await addStockReport(payload);
      }
      Alert.alert('Success', isEditMode ? 'Stock updated' : 'Stock saved');
      navigation.navigate('StockModule', { projectId });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save stock.';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.h1}>Stock</Text>
          <Text style={styles.sub}>
            Opening balance, receipts, cumulative use, and closing balance for this project.
          </Text>

          <View style={styles.pill}>
            <MaterialCommunityIcons name="office-building-outline" size={16} color="#1d78d8" />
            <Text style={styles.pillText}>{projectTitle}</Text>
          </View>

          <DatePickerField label="Date" value={date} onChange={setDate} style={{ marginBottom: 14 }} />

          <View style={styles.card}>
            <Text style={styles.section}>Stock report</Text>

            <SelectField
              label="Item"
              value={itemId}
              onChange={setItemId}
              options={[
                { label: 'Select item', value: null },
                ...(itemsList || []).map((i) => ({ label: i.name, value: i.id })),
              ]}
            />

            <SelectField
              label="Vendor"
              value={vendorId}
              onChange={setVendorId}
              options={[
                { label: 'Select vendor', value: null },
                ...(vendors || []).map((v) => ({ label: v.name, value: v.id })),
              ]}
            />

            <View style={styles.fieldRow}>
              <AppTextField
                label="Open bal."
                value={openBal}
                onChangeText={setOpenBal}
                style={styles.fieldLeft}
                keyboardType="decimal-pad"
              />
              <AppTextField
                label="Received"
                value={received}
                onChangeText={setReceived}
                style={styles.fieldRight}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldRow}>
              <AppTextField
                label="Cumulative (used)"
                value={cum}
                onChangeText={setCum}
                style={styles.fieldLeft}
                keyboardType="decimal-pad"
              />
              <AppTextField
                label="Balance"
                value={bal}
                onChangeText={setBal}
                style={styles.fieldRight}
                editable={false}
                placeholder="Auto"
              />
            </View>
            <Text style={styles.hint}>Balance = Open + Received − Cumulative (auto)</Text>

            {isEditMode && (
              <AppTextField
                label="Reason for editing"
                value={editReason}
                onChangeText={setEditReason}
                placeholder="Required to save changes"
                multiline
                style={{ marginTop: 4 }}
              />
            )}
          </View>

          <GradientButton
            title={isEditMode ? 'Update stock' : 'Save stock'}
            onPress={onSave}
            colors={['#2f86de', '#62b6ff']}
            left={<MaterialCommunityIcons name="content-save" size={18} color="#fff" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },

  h1: { fontSize: 22, fontWeight: '900', color: colors.text },
  sub: { marginTop: 6, color: colors.mutedText, marginBottom: 12 },
  hint: { fontSize: 12, color: colors.mutedText, marginTop: 6, marginBottom: 4 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(45,127,218,0.10)',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(45,127,218,0.22)',
  },
  pillText: { color: '#1d78d8', fontWeight: '900', fontSize: 12 },

  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 14,
  },
  section: { fontWeight: '900', marginBottom: 10 },

  fieldRow: { flexDirection: 'row', marginBottom: 0 },
  fieldLeft: { flex: 1, marginRight: 10 },
  fieldRight: { flex: 1 },
});
