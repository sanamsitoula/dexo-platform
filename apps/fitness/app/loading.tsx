import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@dexo/mobile-core/lib/theme';

export default function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
