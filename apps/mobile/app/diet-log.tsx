import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTenant } from '../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../lib/theme';
import { fitnessApi } from '../lib/api';

const MEALS = [
  { key: 'BREAKFAST', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'LUNCH', label: 'Lunch', icon: 'restaurant-outline' },
  { key: 'DINNER', label: 'Dinner', icon: 'moon-outline' },
  { key: 'MORNING_SNACK', label: 'Snack', icon: 'cafe-outline' },
];

const CAL_GOAL = 2200;
const PROTEIN_GOAL = 120;
const WATER_GOAL = 3000;

export default function NutritionScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [mealType, setMealType] = useState('BREAKFAST');
  const [water, setWater] = useState(250);
  const [summary, setSummary] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    loadSummary();
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => {
      fitnessApi.nepaliFoods.list(search ? { search } : undefined).then((res) => {
        if (res.data) setFoods(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function loadSummary() {
    const me = await fitnessApi.members.me();
    if (!me.data) return;
    const res = await fitnessApi.foodLogs.summary(me.data.id);
    if (res.data) setSummary(res.data);
  }

  const totals = selected.reduce((a, f) => ({
    calories: a.calories + (Number(f.calories) || 0),
    protein: a.protein + (Number(f.protein) || 0),
    carbs: a.carbs + (Number(f.carbs) || 0),
    fats: a.fats + (Number(f.fats) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const cal = (summary?.calories ?? 0) + totals.calories;
  const protein = (summary?.protein ?? 0) + totals.protein;
  const waterTotal = (summary?.water ?? 0) + water;

  async function save() {
    if (selected.length === 0) return Alert.alert('Nothing added', 'Add at least one food.');
    const me = await fitnessApi.members.me();
    if (!me.data) return;
    setSubmitting(true);
    const res = await fitnessApi.foodLogs.create({
      memberId: me.data.id,
      mealType,
      logDate: new Date().toISOString(),
      foodItems: selected.map((f) => ({ name: f.name, quantity: f.quantity ?? 1, calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats })),
      totalCalories: Math.round(totals.calories),
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFats: totals.fats,
      waterIntake: water,
    });
    setSubmitting(false);
    if (res.error) return Alert.alert('Error', res.error);
    setSelected([]);
    loadSummary();
    Alert.alert('Logged', 'Meal saved to your day.', [{ text: 'Nice' }]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nutrition</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
        {/* Calorie hero */}
        <View style={[styles.hero, { backgroundColor: primary }]}>
          <Text style={styles.heroLabel}>CALORIES TODAY</Text>
          <Text style={styles.heroValue}>{Math.round(cal)}<Text style={styles.heroGoal}> / {CAL_GOAL}</Text></Text>
          <View style={styles.heroTrack}><View style={[styles.heroFill, { width: `${Math.min(100, (cal / CAL_GOAL) * 100)}%` }]} /></View>
          <View style={styles.heroMacros}>
            <Macro label="Protein" value={`${Math.round(protein)}g`} goal={`${PROTEIN_GOAL}g`} />
            <Macro label="Carbs" value={`${Math.round((summary?.carbs ?? 0) + totals.carbs)}g`} />
            <Macro label="Fats" value={`${Math.round((summary?.fats ?? 0) + totals.fats)}g`} />
          </View>
        </View>

        {/* Water */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <View style={[styles.iconChip, { backgroundColor: Colors.stand + '20' }]}><Ionicons name="water" size={20} color={Colors.stand} /></View>
              <View>
                <Text style={styles.cardTitle}>Water</Text>
                <Text style={styles.cardSub}>{waterTotal} / {WATER_GOAL} ml</Text>
              </View>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => setWater((w) => Math.max(0, w - 250))} style={styles.stepBtn}><Ionicons name="remove" size={18} color={Colors.textSecondary} /></TouchableOpacity>
              <Text style={styles.stepValue}>{water}</Text>
              <TouchableOpacity onPress={() => setWater((w) => w + 250)} style={styles.stepBtn}><Ionicons name="add" size={18} color={Colors.textSecondary} /></TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Meal type */}
        <Text style={styles.section}>Add to</Text>
        <View style={styles.mealRow}>
          {MEALS.map((m) => {
            const active = mealType === m.key;
            return (
              <TouchableOpacity key={m.key} onPress={() => setMealType(m.key)} style={[styles.mealChip, active && { backgroundColor: primary }]}>
                <Ionicons name={m.icon as any} size={16} color={active ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.mealText, active && { color: '#fff' }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search dal-bhat, momo, roti…" placeholderTextColor={Colors.textLight} />
        </View>
        {foods.slice(0, 8).map((f) => (
          <TouchableOpacity key={f.id} style={styles.foodRow} onPress={() => setSelected((p) => [...p, { ...f, quantity: 1 }])}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{f.name}{f.nameNepali ? ` · ${f.nameNepali}` : ''}</Text>
              <Text style={styles.foodMeta}>{f.servingSize} · P{f.protein} C{f.carbs} F{f.fats}</Text>
            </View>
            <Text style={[styles.foodCal, { color: primary }]}>{f.calories}</Text>
            <Ionicons name="add-circle" size={24} color={primary} style={{ marginLeft: Spacing.sm }} />
          </TouchableOpacity>
        ))}

        {/* This meal */}
        {selected.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>This meal · {Math.round(totals.calories)} kcal</Text>
            {selected.map((f, i) => (
              <View key={i} style={styles.selRow}>
                <Text style={styles.selName}>{f.name}</Text>
                <Text style={styles.foodMeta}>{f.calories} kcal</Text>
                <TouchableOpacity onPress={() => setSelected((p) => p.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primary }]} onPress={save} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Log {MEALS.find((m) => m.key === mealType)?.label.toLowerCase()}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Macro({ label, value, goal }: any) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}{goal ? ` /${goal}` : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },

  hero: { borderRadius: BorderRadius.hero, padding: Spacing.lg, ...Shadows.md },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: FontSize.display, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  heroGoal: { fontSize: FontSize.lg, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  heroTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, marginTop: Spacing.md, overflow: 'hidden' },
  heroFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  heroMacros: { flexDirection: 'row', marginTop: Spacing.lg },
  macro: { flex: 1 },
  macroValue: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  macroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, marginTop: 2 },

  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.lg, marginTop: Spacing.md, ...Shadows.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconChip: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, minWidth: 44, textAlign: 'center' },

  section: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.sm, letterSpacing: 0.5 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  mealChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  mealText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, paddingVertical: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  foodRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.sm, ...Shadows.sm },
  foodName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  foodMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  foodCal: { fontSize: FontSize.lg, fontWeight: '800' },

  selRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  selName: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  saveBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
});
