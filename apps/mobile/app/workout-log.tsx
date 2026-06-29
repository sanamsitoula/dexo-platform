import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../lib/theme';
import { fitnessApi } from '../lib/api';

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [duration, setDuration] = useState('45');
  const [calories, setCalories] = useState('300');
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadPlan();
  }, [token]);

  const loadPlan = async () => {
    const res = await fitnessApi.workoutPlans.list({ status: 'ACTIVE' });
    if (res.data) {
      const plans = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      if (plans.length > 0) {
        setPlan(plans[0]);
        const firstDay = plans[0].workoutDays?.[0];
        if (firstDay) {
          setSelectedDayId(firstDay.id);
          const logs: Record<string, any> = {};
          firstDay.exercises?.forEach((ex: any) => {
            logs[ex.id] = { sets: ex.sets ?? 3, reps: ex.reps ?? 10, weight: ex.weight ?? 0 };
          });
          setExerciseLogs(logs);
        }
      }
    }
    setLoading(false);
  };

  const selectedDay = plan?.workoutDays?.find((d: any) => d.id === selectedDayId);

  const updateLog = (exerciseId: string, field: string, value: string) => {
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [field]: parseInt(value) || 0 },
    }));
  };

  const handleSubmit = async () => {
    if (!plan || !selectedDay) return;
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) return Alert.alert('Error', 'Member not found');
    setSubmitting(true);
    const exerciseLogEntries = selectedDay.exercises?.map((ex: any) => ({
      exerciseId: ex.id,
      setsCompleted: exerciseLogs[ex.id]?.sets ?? 0,
      repsCompleted: exerciseLogs[ex.id]?.reps ?? 0,
      weightUsed: exerciseLogs[ex.id]?.weight ?? 0,
    })) ?? [];
    const res = await fitnessApi.workoutLogs.create({
      memberId: memberRes.data.id,
      planId: plan.id,
      workoutDate: new Date().toISOString(),
      duration: parseInt(duration) || 0,
      caloriesBurned: parseInt(calories) || 0,
      rating,
      notes,
      exerciseLogs: exerciseLogEntries,
    });
    setSubmitting(false);
    if (res.error) return Alert.alert('Error', res.error);
    Alert.alert('Saved!', 'Workout logged successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No active workout plan</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Log Workout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <View style={styles.card}>
          <Text style={styles.label}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
            {plan.workoutDays?.map((d: any) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.dayChip, selectedDayId === d.id && styles.dayChipActive]}
                onPress={() => {
                  setSelectedDayId(d.id);
                  const logs: Record<string, any> = {};
                  d.exercises?.forEach((ex: any) => {
                    logs[ex.id] = { sets: ex.sets ?? 3, reps: ex.reps ?? 10, weight: ex.weight ?? 0 };
                  });
                  setExerciseLogs(logs);
                }}
              >
                <Text style={[styles.dayChipText, selectedDayId === d.id && styles.dayChipTextActive]}>{d.dayName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedDay && !selectedDay.isRestDay && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Exercises</Text>
            {selectedDay.exercises?.map((ex: any) => (
              <View key={ex.id} style={styles.exerciseBox}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <View style={styles.exerciseInputs}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Sets</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={String(exerciseLogs[ex.id]?.sets ?? '')}
                      onChangeText={(v) => updateLog(ex.id, 'sets', v)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Reps</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={String(exerciseLogs[ex.id]?.reps ?? '')}
                      onChangeText={(v) => updateLog(ex.id, 'reps', v)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>kg</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={String(exerciseLogs[ex.id]?.weight ?? '')}
                      onChangeText={(v) => updateLog(ex.id, 'weight', v)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {selectedDay?.isRestDay && (
          <View style={styles.card}>
            <Text style={styles.restDay}>😴 Rest Day — Recovery</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Duration (min)</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={duration} onChangeText={setDuration} />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Calories</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={calories} onChangeText={setCalories} />
            </View>
          </View>

          <Text style={styles.label}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={36} color="#facc15" />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { height: 80 }]} multiline value={notes} onChangeText={setNotes} />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Workout</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: '#fff', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 4, marginTop: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: FontSize.md },
  row: { flexDirection: 'row' },
  dayChip: { backgroundColor: '#f3f4f6', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginRight: Spacing.sm },
  dayChipActive: { backgroundColor: Colors.primary },
  dayChipText: { color: Colors.text, fontWeight: '500' },
  dayChipTextActive: { color: '#fff' },
  exerciseBox: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  exerciseName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  exerciseInputs: { flexDirection: 'row', gap: Spacing.sm },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: Spacing.md },
  btn: { backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  restDay: { fontSize: FontSize.lg, textAlign: 'center', color: Colors.textMuted, padding: Spacing.lg },
  emptyText: { color: Colors.textMuted, marginBottom: Spacing.md, fontSize: FontSize.md },
});
