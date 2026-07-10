import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTenant } from '../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../lib/theme';
import { fitnessApi } from '../lib/api';
import Confetti from '../components/Confetti';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

const QUOTES = [
  'Showing up is half the battle. You just won it.',
  'Consistency beats intensity. See you tomorrow.',
  'Every rep is a vote for the person you’re becoming.',
  'The gym never gets easier — you get stronger.',
  'Small steps, every day. That’s how it’s done.',
];

export default function CheckinScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    if (!token) router.replace('/(auth)/login');
  }, [token]);

  async function handleCheckin(qrCode: string) {
    if (!qrCode.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fitnessApi.checkin.qr(qrCode.trim());
    if (res.error) {
      setError(res.error);
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Error).catch(() => {});
    } else {
      setResult(res.data);
      setScanning(false);
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success).catch(() => {});
      // Best-effort streak from recent history.
      const me = await fitnessApi.members.me().catch(() => ({ data: null as any }));
      if (me.data?.id) {
        const hist = await fitnessApi.checkin.history(me.data.id, 30).catch(() => ({ data: [] as any }));
        const list = Array.isArray(hist.data) ? hist.data : hist.data?.items ?? [];
        setStreak(list.length || (res.data?.streak ?? 1));
      } else {
        setStreak(res.data?.streak ?? 1);
      }
    }
    setLoading(false);
  }

  // Success celebration — full screen, never a boring dialog.
  if (result) {
    const quote = QUOTES[Math.min(QUOTES.length - 1, streak % QUOTES.length)];
    const name = result.membership?.member?.user?.firstName;
    return (
      <View style={[styles.container, styles.successWrap]}>
        <Confetti />
        <View style={[styles.successCircle, { backgroundColor: Colors.success }]}>
          <Ionicons name="checkmark" size={56} color="#fff" />
        </View>
        <Text style={styles.successTitle}>You’re in{name ? `, ${name}` : ''}! 💪</Text>
        <Text style={styles.successSub}>Checked in at {tenant?.name || 'your gym'}</Text>

        <View style={[styles.streakCard, { backgroundColor: Colors.streak + '15' }]}>
          <Ionicons name="flame" size={28} color={Colors.streak} />
          <Text style={[styles.streakNum, { color: Colors.streak }]}>{streak}</Text>
          <Text style={styles.streakLabel}>{streak === 1 ? 'day this month' : 'days this month'}</Text>
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>“{quote}”</Text>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>Let’s go</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Check in</Text>
        <View style={{ width: 26 }} />
      </View>

      {scanning ? (
        <View style={{ flex: 1 }}>
          {!permission?.granted ? (
            <View style={styles.center}>
              <Ionicons name="camera-outline" size={64} color={Colors.textLight} />
              <Text style={styles.permText}>Camera access is needed to scan your QR</Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={requestPermission}>
                <Text style={styles.primaryBtnText}>Grant permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => { if (!loading) handleCheckin(data); }}
            >
              <View style={styles.overlay}>
                <View style={[styles.scanBox, { borderColor: '#fff' }]} />
                <Text style={styles.scanText}>Align the QR inside the frame</Text>
              </View>
            </CameraView>
          )}
          <TouchableOpacity style={[styles.ghostBtn, { margin: Spacing.lg }]} onPress={() => setScanning(false)}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ padding: Spacing.lg }}>
          <View style={[styles.heroCard, { backgroundColor: primary }]}>
            <View style={styles.qrGlyph}>
              <Ionicons name="qr-code" size={72} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Scan to check in</Text>
            <Text style={styles.heroSub}>Point your camera at the QR at the front desk.</Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => setScanning(true)}>
              <Ionicons name="camera" size={20} color={primary} />
              <Text style={[styles.heroBtnText, { color: primary }]}>Open scanner</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>or enter code</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="VRFIT-XXXXXXXX"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary, marginTop: Spacing.md }]} onPress={() => handleCheckin(manualCode)} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Check in</Text>}
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },

  heroCard: { borderRadius: BorderRadius.hero, padding: Spacing.xl, alignItems: 'center', ...Shadows.md },
  qrGlyph: { width: 110, height: 110, borderRadius: BorderRadius.xl2, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  heroTitle: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, textAlign: 'center', marginTop: 6, marginBottom: Spacing.lg },
  heroBtn: { backgroundColor: '#fff', borderRadius: BorderRadius.full, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroBtnText: { fontWeight: '800', fontSize: FontSize.md },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: Spacing.md, color: Colors.textLight, fontSize: FontSize.xs, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.xl2, ...Shadows.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.md, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: Colors.text, letterSpacing: 1 },

  primaryBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md + 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  ghostBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: Colors.surfaceAlt },
  ghostBtnText: { color: Colors.text, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 250, height: 250, borderWidth: 3, borderRadius: BorderRadius.xl2 },
  scanText: { color: '#fff', marginTop: Spacing.lg, fontSize: FontSize.md, fontWeight: '600' },
  permText: { color: Colors.textSecondary, marginVertical: Spacing.lg, textAlign: 'center' },

  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.errorBg, padding: Spacing.md, borderRadius: BorderRadius.md, gap: 8, marginTop: Spacing.md },
  errorText: { color: Colors.error, flex: 1, fontWeight: '600' },

  successWrap: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', ...Shadows.lg },
  successTitle: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, marginTop: Spacing.lg, letterSpacing: -0.5, textAlign: 'center' },
  successSub: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.xl2, marginTop: Spacing.xl },
  streakNum: { fontSize: FontSize.title, fontWeight: '800' },
  streakLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  quoteCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.lg, marginTop: Spacing.lg, ...Shadows.sm },
  quoteText: { fontSize: FontSize.md, color: Colors.text, textAlign: 'center', fontStyle: 'italic', lineHeight: 24 },
});
