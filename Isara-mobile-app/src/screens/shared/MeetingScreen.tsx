import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useMeetingApi } from '../../hooks/useMeetingApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Meeting'>;

export function MeetingScreen({ navigation, route }: Readonly<Props>) {
  const { meetingId, jitsiUrl } = route.params;
  const { endMeeting } = useMeetingApi();
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const handleEndMeeting = useCallback(() => {
    Alert.alert('End Meeting', 'Are you sure you want to end this meeting?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await endMeeting(meetingId);
            navigation.goBack();
          })();
        },
      },
    ]);
  }, [meetingId, endMeeting, navigation]);

  if (!jitsiUrl) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📹</Text>
          <Text style={styles.errorTitle}>Meeting Not Available</Text>
          <Text style={styles.errorMessage}>The meeting link is not available yet.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.endBtn} onPress={handleEndMeeting}>
          <Text style={styles.endBtnText}>End Meeting</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.webviewContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#047857" />
            <Text style={styles.loadingText}>Connecting to meeting...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: jitsiUrl }}
          style={styles.webview}
          onLoadEnd={() => setIsLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          mediaCapturePermissionGrantType="grant"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, backgroundColor: '#1e293b' },
  endBtn: { backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  endBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  webviewContainer: { flex: 1 },
  webview: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', zIndex: 1 },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f8fafc' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  errorMessage: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  backBtn: { backgroundColor: '#047857', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
