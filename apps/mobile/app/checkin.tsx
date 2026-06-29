import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../lib/theme';
import { fitnessApi } from '../lib/api';

export default function CheckinScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
    }
  }, [token]);

  const handleCheckin = async (qrCode: string) => {
    if (!qrCode.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fitnessApi.checkin.qr(qrCode.trim());
    if (res.error) {
      setError(res.error);
    } else {
      setResult(res.data);
      setScanning(false);
    }
    setLoading(false);
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (loading) return;
    handleCheckin(data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Check-in</Text>
        <View style={{ width: 24 }} />
      </View>

      {scanning ? (
        <View style={{ flex: 1 }}>
          {!permission?.granted ? (
            <View style={styles.center}>
              <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.permText}>Camera permission required to scan</Text>
              <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                <Text style={styles.btnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.scanBox} />
                <Text style={styles.scanText}>Align your QR code in the box</Text>
              </View>
            </CameraView>
          )}
          <TouchableOpacity style={[styles.btn, { margin: Spacing.lg }]} onPress={() => setScanning(false)}>
            <Text style={styles.btnText}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ padding: Spacing.lg }}>
          <View style={styles.card}>
            <Ionicons name="qr-code" size={64} color={Colors.primary} style={{ alignSelf: 'center' }} />
            <Text style={styles.cardTitle}>Scan Your Membership QR</Text>
            <Text style={styles.cardSubtitle}>Use your camera to scan the QR code from the front desk</Text>
            <TouchableOpacity style={styles.btn} onPress={() => setScanning(true)}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.btnText}>Start Camera Scan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enter Code Manually</Text>
            <TextInput
              style={styles.input}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="FITNEPAL-XXXXXXXXXXXX"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.btn} onPress={() => handleCheckin(manualCode)} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Check In</Text>}
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="close-circle" size={20} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {result && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>{result.message}</Text>
                {result.membership && (
                  <>
                    <Text style={styles.successText}>
                      {result.membership.member?.user?.firstName} {result.membership.member?.user?.lastName}
                    </Text>
                    <Text style={styles.successText}>{result.membership.plan?.name}</Text>
                    <Text style={styles.successText}>
                      Valid until {new Date(result.membership.endDate).toLocaleDateString()}
                    </Text>
                  </>
                )}
              </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: '#fff', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, textAlign: 'center', marginTop: Spacing.sm },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginVertical: Spacing.sm },
  btn: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: FontSize.md },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: Spacing.md, color: Colors.textMuted },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: Spacing.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 250, height: 250, borderWidth: 3, borderColor: '#fff', borderRadius: 12 },
  scanText: { color: '#fff', marginTop: Spacing.lg, fontSize: FontSize.md },
  permText: { color: Colors.text, marginVertical: Spacing.lg, textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', padding: Spacing.md, borderRadius: BorderRadius.md, gap: 8, marginTop: Spacing.md },
  errorText: { color: '#dc2626', flex: 1 },
  successBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#dcfce7', padding: Spacing.md, borderRadius: BorderRadius.md, gap: 8, marginTop: Spacing.md },
  successTitle: { color: '#16a34a', fontWeight: '700', fontSize: FontSize.md, marginBottom: 4 },
  successText: { color: '#15803d', fontSize: FontSize.sm },
});
