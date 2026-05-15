import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GradientButton } from '../../components/GradientButton';
import { GradientCard } from '../../components/GradientCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { getManagerExpenseDetails } from '../../api/expenseApi';
import { colors } from '../../theme/theme';

function formatINR(value) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `₹ ${Math.round(value).toLocaleString('en-IN')}`;
  }
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.text} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function ExpenseDetailsScreen({ route, navigation }) {
  const { projectId, expense: routeExpense } = route.params;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const expenseId = routeExpense?.id || routeExpense?._raw?.id;

  useEffect(() => {
    if (!expenseId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getManagerExpenseDetails(expenseId);
        if (cancelled) return;
        const apiData = res?.data?.data ?? null;
        setDetail(apiData);
      } catch (err) {
        console.log('Expense detail fetch error:', err?.message);
        // Fallback: use route expense data
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [expenseId]);

  // Merge API detail with route expense for best display
  const expense = useMemo(() => {
    if (detail) {
      return {
        id: detail.id,
        name: detail.party?.name || detail.party_name || routeExpense?.name || 'Expense',
        type: detail.expense_type || routeExpense?.type || '—',
        amount: Number(detail.amount || 0),
        dateIso: detail.date || detail.created_at || routeExpense?.dateIso || '',
        remarks: detail.remarks || routeExpense?.remarks || '',
        project_id: detail.project_id,
        party_id: detail.party_id,
        party: detail.party || null,
      };
    }
    return routeExpense || { name: 'Expense', type: '—', amount: 0, dateIso: '' };
  }, [detail, routeExpense]);

  const dateLabel = useMemo(() => {
    if (!expense.dateIso) return 'No date';
    try {
      return new Date(expense.dateIso).toLocaleString();
    } catch {
      return 'No date';
    }
  }, [expense.dateIso]);

  const partyName = expense.party?.name || expense.name || '—';

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colors.buttonStart} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.h1}>Expense details</Text>
        <Text style={styles.sub}>Project: {projectId}</Text>

        <GradientCard colors={[colors.expenseStart, colors.expenseEnd]} style={styles.hero}>
          <View style={styles.heroTop}>
            <MaterialCommunityIcons name="cash-minus" size={22} color="#fff" />
            <Text style={styles.heroLabel}>{expense.type}</Text>
          </View>
          <Text style={styles.heroTitle}>{partyName}</Text>
          <Text style={styles.heroAmount}>{formatINR(expense.amount)}</Text>
        </GradientCard>

        <View style={styles.detailCard}>
          <DetailRow icon="calendar" label="Date" value={dateLabel} />
          <DetailRow icon="tag" label="Type" value={expense.type} />
          <DetailRow icon="currency-inr" label="Amount" value={formatINR(expense.amount)} />
          {expense.remarks ? (
            <DetailRow icon="note-text" label="Remarks" value={expense.remarks} />
          ) : null}
        </View>

        <View style={styles.actions}>
          <GradientButton
            title="Back to expenses"
            onPress={() => navigation.navigate('ExpenseList', { projectId })}
            left={<MaterialCommunityIcons name="arrow-left" size={18} color="#fff" />}
            colors={['#2f86de', '#62b6ff']}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingBottom: 28 },
  h1: { fontSize: 28, fontWeight: '900', color: colors.text },
  sub: { marginTop: 6, color: colors.mutedText, marginBottom: 16 },
  hero: { marginBottom: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '900' },
  heroTitle: { marginTop: 10, color: '#fff', fontSize: 18, fontWeight: '900' },
  heroAmount: { marginTop: 8, color: '#fff', fontSize: 24, fontWeight: '900' },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    color: '#6b7280',
    fontWeight: '800',
  },
  rowValue: {
    color: '#111827',
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  actions: { marginTop: 14, gap: 12 },
});
