import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../lib/theme';
import { fitnessApi } from '../lib/api';

export default function DietLogScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [mealType, setMealType] = useState('BREAKFAST');
  const [water, setWater] = useState('250');
  const [summary, setSummary] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadSummary();
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => searchFoods(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const searchFoods = async (q: string) => {
    const res = await fitnessApi.nepaliFoods.list(q ? { search: q } : undefined);
    if (res.data) setFoods(Array.isArray(res.data) ? res.data : []);
  };

  const loadSummary = async () => {
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) return;
    const res = await fitnessApi.foodLogs.summary(memberRes.data.id);
    if (res.data) setSummary(res.data);
  };

  const addFood = (food: any) => {
    setSelected((prev) => [...prev, { ...food, quantity: 1 }]);
  };

  const removeFood = (i: number) => {
    setSelected((prev) => prev.filter((_, idx) => idx !== i));
  };

  const totals = selected.reduce((acc, f) => ({
    calories: acc.calories + (Number(f.calories) || 0),
    protein: acc.protein + (Number(f.protein) || 0),
    carbs: acc.carbs + (Number(f.carbs) || 0),
    fats: acc.fats + (Number(f.fats) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const handleSubmit = async () => {
    if (selected.length === 0) return Alert.alert('Empty', 'Add at least one food');
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) return;
    setSubmitting(true);
    const res = await fitnessApi.foodLogs.create({
      memberId: memberRes.data.id,
      mealType,
      logDate: new Date().toISOString(),
      foodItems: selected.map((f) => ({ name: f.name, quantity: f.quantity, calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats })),
      totalCalories: Math.round(totals.calories),
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFats: totals.fats,
      waterIntake: parseInt(water) || 0,
    });
    setSubmitting(false);
    if (res.error) return Alert.alert('Error', res.error);
    Alert.alert('Saved!', 'Meal logged', [{ text: 'OK', onPress: () => { setSelected([]); router.back(); } }]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Log Food</Text>
        <View style={{ width: 24 }} />
      </View>

      {summary && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.calories ?? 0}</Text><Text style={styles.summaryLabel}>kcal today</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.protein?.toFixed(0) ?? 0}g</Text><Text style={styles.summaryLabel}>protein</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.water ?? 0}ml</Text><Text style={styles.summaryLabel}>water</Text></View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <View style={styles.card}>
          <Text style={styles.label}>Meal Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
            {['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK'].map((m) => (
              <TouchableOpacity key={m} style={[styles.dayChip, mealType === m && styles.dayChipActive]} onPress={() => setMealType(m)}>
                <Text style={[styles.dayChipText, mealType === m && styles.dayChipTextActive]}>{m.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Search Nepali Foods</Text>
          <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="dal-bhat, momo, roti..." placeholderTextColor={Colors.textMuted} />
          {foods.slice(0, 8).map((f) => (
            <TouchableOpacity key={f.id} style={styles.foodRow} onPress={() => addFood(f)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{f.name} {f.nameNepali && <Text style={{ color: Colors.textMuted }}>({f.nameNepali})</Text>}</Text>
                <Text style={styles.foodMeta}>{f.servingSize} • P {f.protein}g C {f.carbs}g F {f.fats}g</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.foodCal}>{f.calories}</Text>
                <Text style={styles.foodMeta}>kcal</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selected.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>This Meal</Text>
            {selected.map((f, i) => (
              <View key={i} style={styles.selectedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{f.name}</Text>
                  <Text style={styles.foodMeta}>{f.calories} kcal</Text>
                </View>
                <TouchableOpacity onPress={() => removeFood(i)}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.totalsRow}>
              <Text style={styles.totalText}>Total: {Math.round(totals.calories)} kcal</Text>
              <Text style={styles.totalText}>P: {totals.protein.toFixed(0)}g</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Water (ml)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={water} onChangeText={setWater} />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Meal</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  summaryBar: { flexDirection: 'row', backgroundColor: '#eff6ff', padding: Spacing.md, justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  card: { backgroundColor: '#fff', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: FontSize.md, marginBottom: Spacing.sm },
  dayChip: { backgroundColor: '#f3f4f6', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginRight: Spacing.sm },
  dayChipActive: { backgroundColor: Colors.primary },
  dayChipText: { color: Colors.text, fontWeight: '500', fontSize: FontSize.sm },
  dayChipTextActive: { color: '#fff' },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  foodName: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  foodMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  foodCal: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  selectedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm },
  totalText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  btn: { backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', marginBottom: Spacing.xl },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
