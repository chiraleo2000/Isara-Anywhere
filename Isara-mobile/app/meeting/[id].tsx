/**
 * Video Meeting Screen — Jitsi-based video consultation
 * Fullscreen modal, shared between patient and doctor
 */

import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import WebView from 'react-native-webview';
import { useAuthStore } from '../../src/stores/authStore';
import Constants from 'expo-constants';

export default function MeetingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, activeRole, accessToken } = useAuthStore();
  const webViewRef = useRef<any>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const meetingServerUrl =
    Constants.expoConfig?.extra?.MEETING_SERVER_URL ||
    'http://localhost:3020';

  const displayName = activeRole === 'doctor'
    ? `${(user as any)?.prefix || 'นพ.'} ${user?.first_name || 'แพทย์'}`
    : `${user?.first_name || 'ผู้ป่วย'} ${user?.last_name || ''}`;

  // Pass auth token so meeting server can authenticate the user
  const params = new URLSearchParams({
    displayName,
    role: activeRole || 'patient',
    ...(accessToken ? { token: accessToken } : {}),
  });
  const meetingUrl = `${meetingServerUrl}/room/${id}?${params.toString()}`;

  const handleLeave = () => {
    Alert.alert('ออกจากห้องประชุม', 'คุณต้องการออกจากวิดีโอคอลหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออก', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Connection indicator */}
      {isConnecting && (
        <View style={styles.connecting}>
          <Text style={styles.connectingText}>กำลังเชื่อมต่อ... 📹</Text>
        </View>
      )}

      {/* WebView for Jitsi */}
      <WebView
        ref={webViewRef}
        source={{ uri: meetingUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onLoad={() => setIsConnecting(false)}
        onError={() => {
          setIsConnecting(false);
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อวิดีโอได้');
        }}
        {...(Platform.OS === 'android' && {
          androidLayerType: 'hardware',
        })}
      />

      {/* Floating Leave Button */}
      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
        <Text style={styles.leaveBtnText}>📞 ออก</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  connecting: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  connectingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  leaveBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ef4444', borderRadius: 28, paddingHorizontal: 32, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  leaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
