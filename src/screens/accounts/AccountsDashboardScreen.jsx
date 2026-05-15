import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppTextField } from '../../components/AppTextField';
import { GradientButton } from '../../components/GradientButton';
import { GradientCard } from '../../components/GradientCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useApp } from '../../contexts/AppContext';
import { getManagerExpenseDashboard } from '../../api/expenseApi';
import { colors } from '../../theme/theme';

function formatINR(value) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `₹ ${Math.round(value).toLocaleString('en-IN')}`;
  }
}

export function AccountsDashboardScreen({ route, navigation }) {
  const { projectId } = route.params;
  const { setTotalAmount, getBudget, projects } = useApp();
  const project = useMemo(
    () => projects.find((p) => String(p.id) === String(projectId)),
    [projects, projectId],
  );
  const localBudget = getBudget(projectId);

  // ── Dashboard data from API ────────────────────────────────────
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setDashLoading(true);
          const res = await getManagerExpenseDashboard(projectId);
          if (cancelled) return;
          const data = res?.data?.data ?? res?.data ?? {};
          setDashData(data);
        } catch (err) {
          console.log('Dashboard fetch error:', err?.message);
        } finally {
          if (!cancelled) setDashLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [projectId])
  );

  // total_amount from API or fallback to locally stored budget
  const totalAmount = dashData?.total_amount ?? dashData?.allocated_budget ?? localBudget ?? 0;
  const totalExpenses = dashData?.total_expenses ?? dashData?.expenses ?? 0;
  const balance = dashData?.balance ?? (Number(totalAmount) - Number(totalExpenses));

  const [draftTotal, setDraftTotal] = useState(String(totalAmount));

  useFocusEffect(
    useCallback(() => {
      setDraftTotal(String(totalAmount ?? 0));
    }, [totalAmount])
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Accounts</Text>
        <Text style={styles.sub}>{project ? `${project.name} • ${project.location}` : `Project ${projectId}`}</Text>

        {dashLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={colors.buttonStart} />
          </View>
        ) : (
        <View style={styles.grid}>
          <GradientCard colors={['#ffffff', '#ffffff']} style={[styles.card, styles.cardSurface]}>
            <View style={styles.cardTop}>
              <MaterialCommunityIcons name="cash-plus" size={22} color={colors.buttonStart} />
              <Text style={styles.cardLabel}>Total amount</Text>
            </View>
            <Text style={styles.cardValue}>{formatINR(totalAmount)}</Text>
          </GradientCard>

          <GradientCard colors={['#ffffff', '#ffffff']} style={[styles.card, styles.cardSurface]}>
            <View style={styles.cardTop}>
              <MaterialCommunityIcons name="cash-minus" size={22} color={colors.buttonStart} />
              <Text style={styles.cardLabel}>Expenses</Text>
            </View>
            <Text style={styles.cardValue}>{formatINR(totalExpenses)}</Text>
          </GradientCard>

          <GradientCard colors={['#ffffff', '#ffffff']} style={[styles.cardWide, styles.cardSurface]}>
            <View style={styles.cardTop}>
              <MaterialCommunityIcons name="wallet" size={22} color={colors.buttonStart} />
              <Text style={styles.cardLabel}>Balance</Text>
            </View>
            <Text style={[styles.cardValue, balance < 0 && styles.cardValueWarn]}>{formatINR(balance)}</Text>
          </GradientCard>
        </View>
        )}

        <View style={styles.actions}>
          <GradientButton
            title="Add expense"
            onPress={() => navigation.navigate('AddExpense', { projectId })}
            left={<MaterialCommunityIcons name="plus" size={18} color="#fff" />}
          />
          <GradientButton
  title="View expenses"
  onPress={() => navigation.navigate('ExpenseList', { projectId })}
  left={<MaterialCommunityIcons name="format-list-bulleted" size={18} color="#fff" />}
/>
        </View>

        <View style={styles.totalEditor}>
          <Text style={styles.sectionTitle}>Allocated budget</Text>
          <Text style={styles.sectionSub}>
            Amount released for this project (set by admin). This updates the Total amount card above.
          </Text>
          <AppTextField
            label="Total amount (allocated)"
            value={draftTotal}
            onChangeText={setDraftTotal}
            keyboardType="numeric"
            placeholder="0"
          />
          <GradientButton
            title="Save allocated total"
            onPress={() => {
              const next = Number(draftTotal);
              if (!Number.isFinite(next) || next < 0) return;
              void setTotalAmount(projectId, next);
            }}
            colors={['#2f86de', '#62b6ff']}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 28 },
  h1: { fontSize: 28, fontWeight: '900', color: colors.text },
  sub: { marginTop: 6, color: colors.mutedText, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%' },
  cardWide: { width: '100%' },
  cardSurface: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: colors.surface,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { color: colors.mutedText, fontSize: 13, fontWeight: '800' },
  cardValue: { marginTop: 10, color: colors.text, fontSize: 24, fontWeight: '900' },
  cardValueWarn: { color: '#b45309' },
  actions: { marginTop: 14, gap: 12 },
  totalEditor: {
    marginTop: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 16,
  },
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  sectionSub: { marginTop: 6, color: colors.mutedText, marginBottom: 12 },
});
