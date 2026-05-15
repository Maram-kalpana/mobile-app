import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState, useCallback } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { AppTextField } from '../../components/AppTextField';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SelectField } from '../../components/SelectField';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { addManagerExpense } from '../../api/expenseApi';
import { colors } from '../../theme/theme';

function vendorsMatchingType(vendors, expenseType) {
  const hay = (v) =>
    `${String(v.vendorType || '').toLowerCase()} ${String(v.name || '').toLowerCase()}`;
  const labourKeys = ['labour', 'labor', 'worker', 'contract', 'mistry', 'mason', 'helper'];
  const materialKeys = [
    'material',
    'supplier',
    'cement',
    'sand',
    'brick',
    'steel',
    'stone',
    'aggregate',
    'vendor',
    'tile',
    'paint',
  ];
  const machineryKeys = ['machinery', 'hire', 'equipment', 'plant', 'excav', 'crane', 'mixer', 'rental', 'vehicle'];

  const keys =
    expenseType === 'Labour'
      ? labourKeys
      : expenseType === 'Material'
        ? materialKeys
        : machineryKeys;

  return (vendors || []).filter((v) => keys.some((k) => hay(v).includes(k)));
}

export function AddExpenseScreen({ route, navigation }) {
  const { projectId } = route.params;
  const { user } = useAuth();
  const { projects, vendors } = useApp();
  const project = useMemo(
    () => projects.find((p) => String(p.id) === String(projectId)),
    [projects, projectId],
  );

  const [expenseType, setExpenseType] = useState('Labour');
  const [partyId, setPartyId] = useState(null);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const partyList = useMemo(
    () => vendorsMatchingType(vendors, expenseType),
    [vendors, expenseType],
  );

  const partyOptions = useMemo(
    () => [
      { label: 'Select party', value: null },
      ...partyList.map((v) => ({ label: v.name, value: v.id })),
    ],
    [partyList],
  );

  const onTypeChange = useCallback((v) => {
    setExpenseType(v);
    setPartyId(null);
  }, []);

  const partyLabel =
    expenseType === 'Labour'
      ? 'Party name (labour)'
      : expenseType === 'Material'
        ? 'Party name (material)'
        : 'Party name (machinery hire)';

  const disabled = useMemo(
    () => partyId == null || Number(amount) <= 0 || !Number.isFinite(Number(amount)) || submitting,
    [partyId, amount, submitting],
  );

  const dateLabel = useMemo(() => new Date().toLocaleString(), []);

  const expenseTypeMap = { Labour: 'labour', Material: 'material', Machinery: 'machinery' };

  const handleSave = useCallback(async () => {
  if (!user || disabled) return;

  setSubmitting(true);

  try {
    const payload = {
      project_id: String(projectId),
      expense_type: expenseTypeMap[expenseType] || 'labour',
      party_id: Number(partyId),
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      remarks: remarks.trim() || '',
    };

    console.log("=================================");
    console.log("ADD EXPENSE API CALLED");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("=================================");

    const res = await addManagerExpense(payload);

    console.log("=================================");
    console.log("API SUCCESS RESPONSE");
    console.log(JSON.stringify(res?.data, null, 2));
    console.log("=================================");

    const created = res?.data?.data ?? res?.data;

    const expense = {
      id: created?.id ?? String(Date.now()),
      name: partyList.find((v) => v.id === partyId)?.name || 'Party',
      type: expenseType,
      amount: Number(amount),
      dateIso: new Date().toISOString(),
      remarks: remarks.trim() || '',
      party_id: partyId,
      project_id: projectId,
    };

    console.log("Navigating to ExpenseDetails");

    navigation.replace('ExpenseDetails', { projectId, expense });

  } catch (err) {

    console.log("=================================");
    console.log("API ERROR OCCURRED");
    console.log("FULL ERROR:", err);
    console.log("ERROR MESSAGE:", err?.message);
    console.log("ERROR RESPONSE:", err?.response);
    console.log("ERROR DATA:", err?.response?.data);
    console.log("=================================");

    Alert.alert(
      'Error',
      JSON.stringify(
        err?.response?.data || err?.message || 'Failed to add expense',
        null,
        2
      )
    );

  } finally {
    console.log("Request completed");
    setSubmitting(false);
  }
}, [
  user,
  disabled,
  projectId,
  expenseType,
  partyId,
  amount,
  remarks,
  partyList,
  navigation,
]);
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>Add expense</Text>
          <Text style={styles.sub}>
            {project ? `${project.name} • ${project.location}` : `Project ${projectId}`}
            {'\n'}
            <Text style={styles.subMuted}>Date: {dateLabel}</Text>
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Type</Text>
            <SegmentedButtons
              value={expenseType}
              onValueChange={onTypeChange}
              style={styles.segment}
              buttons={[
                { value: 'Labour', label: 'Labour' },
                { value: 'Material', label: 'Material' },
                { value: 'Machinery', label: 'Machinery' },
              ]}
              theme={{
                colors: {
                  secondaryContainer: 'rgba(125,211,252,0.22)',
                  onSecondaryContainer: colors.text,
                  outline: colors.outline,
                },
              }}
            />

            <SelectField
              label={partyLabel}
              value={partyId}
              onChange={setPartyId}
              placeholder={partyList.length ? 'Select party' : 'No matching parties'}
              options={partyOptions}
            />
            {partyList.length === 0 ? (
              <Text style={styles.hint}>
                No vendors match this type yet. Add vendors whose category or name suggests {expenseType.toLowerCase()}{' '}
                (e.g. "Labour contractor", "Cement supplier").
              </Text>
            ) : null}

            <AppTextField
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
            />

            <AppTextField
              label="Remarks (optional)"
              value={remarks}
              onChangeText={setRemarks}
              placeholder="e.g. Payment for completed work"
              multiline
            />

            <GradientButton
              title={submitting ? 'Saving...' : 'Save expense'}
              disabled={disabled}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 28 },
  h1: { fontSize: 28, fontWeight: '900', color: colors.text },
  sub: { marginTop: 6, color: colors.mutedText, marginBottom: 16, lineHeight: 18 },
  subMuted: { color: 'rgba(233,242,242,0.55)' },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 16,
  },
  label: { color: colors.text, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  segment: { marginBottom: 12 },
  hint: {
    marginTop: -4,
    marginBottom: 12,
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
});
