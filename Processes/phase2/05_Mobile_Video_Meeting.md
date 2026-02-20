# 📹 Mobile Video Meeting — Izara Dr. Anywhere

**Version:** 2.0.0  
**Date:** February 2026  
**SDK:** @jitsi/react-native-sdk

---

## 1. Video Meeting Architecture (Mobile)

### 1.1 System Overview

```text
┌──────────────────┐         ┌──────────────────┐
│  Patient Mobile  │         │  Doctor Mobile   │
│                  │         │                  │
│ Jitsi RN SDK     │◄───────►│ Jitsi RN SDK     │
│ PiP Mode         │  WebRTC │ HOST Controls    │
│ Speech-to-Text   │         │ Transcription    │
│ Guest Invite     │         │ AI Summary       │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │  REST + Socket.IO          │
         ▼                            ▼
┌─────────────────────────────────────────────┐
│           Izara Meeting Server              │
│           (port 3020)                       │
│                                             │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Meeting   │  │ Transcript│  │ AI      │ │
│  │ Manager   │  │ Service   │  │ Summary │ │
│  └───────────┘  └───────────┘  └─────────┘ │
└────────────────────┬────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │ Jitsi Meet   │
              │ Server       │
              │ (Docker/     │
              │  Cloud)      │
              └──────────────┘
```

### 1.2 Phase 1 vs Phase 2 Comparison

| Feature | Phase 1 (Web) | Phase 2 (Mobile) |
| --------- | :-------------: | :----------------: |
| Video Call | ✅ iframe/lib-jitsi-meet | ✅ @jitsi/react-native-sdk |
| Audio Call | ✅ | ✅ |
| Screen Share | ✅ | ✅ (broadcast extension) |
| Chat in Meeting | ✅ | ✅ |
| Transcription | ✅ Web Speech API | ✅ Native Speech Framework |
| AI Summary | ✅ | ✅ |
| PiP (Picture-in-Picture) | ❌ | ✅ NEW |
| CallKit / ConnectionService | ❌ | ✅ NEW |
| Background Audio | ❌ | ✅ NEW |
| Lobby Mode | ✅ | ✅ |
| Recording | ✅ | ✅ |
| Guest/Family Invite | ✅ | ✅ (via deep link) |
| CDS During Meeting | ✅ | ✅ |

---

## 2. Jitsi React Native SDK Integration

### 2.1 Installation

```bash
# In apps/patient and apps/doctor
npx expo install @jitsi/react-native-sdk

# Required peer dependencies
npx expo install react-native-svg
npx expo install react-native-webrtc
npx expo install @react-native-community/netinfo
npx expo install react-native-calendar-events
```

### 2.2 iOS Configuration

```xml
<!-- ios/Podfile -->
<!-- Add to post_install -->
config.build_settings['ENABLE_BITCODE'] = 'NO'

<!-- Info.plist -->
<key>NSCameraUsageDescription</key>
<string>สำหรับการประชุมวิดีโอกับแพทย์</string>
<key>NSMicrophoneUsageDescription</key>
<string>สำหรับการประชุมเสียงกับแพทย์</string>
<key>UIBackgroundModes</key>
<array>
  <string>voip</string>
  <string>audio</string>
</array>
```

### 2.3 Android Configuration

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- For PiP mode -->
<activity
  android:name=".MainActivity"
  android:supportsPictureInPicture="true"
  android:configChanges="screenSize|smallestScreenSize|screenLayout|orientation" />
```

---

## 3. Meeting Screens & Flows

### 3.1 Patient: Join Meeting Flow

```text
Push Notification: "แพทย์เริ่มการประชุมแล้ว"
              │
              ▼
┌─────────────────────────────┐
│  Pre-Join Screen            │
│                             │
│  ┌────────────────────┐     │
│  │   Camera Preview   │     │
│  │   (Self View)      │     │
│  └────────────────────┘     │
│                             │
│  🔈 Speaker    ON           │
│  🎤 Microphone ON           │
│  📷 Camera     ON           │
│                             │
│  Doctor: นพ.สมชาย           │
│  Time: 14:00 - 14:30        │
│                             │
│  [  เข้าร่วมประชุม  ]      │
│                             │
│  ⚠️ ห้ามบันทึกการสนทนา     │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Video Meeting (Full Screen)│
│                             │
│  ┌────────────────────────┐ │
│  │                        │ │
│  │   Doctor Video Feed    │ │
│  │                        │ │
│  │          ┌──────────┐  │ │
│  │          │ Self View│  │ │
│  │          │ (Small)  │  │ │
│  │          └──────────┘  │ │
│  └────────────────────────┘ │
│                             │
│  ┌──────────────────────┐   │
│  │ 🎤  📷  💬  📞  ⋯  │   │
│  │ Mute Cam Chat End More│  │
│  └──────────────────────┘   │
│                             │
│  More menu:                 │
│  - 🖥️ Share Screen          │
│  - 🔊 Speaker/Earpiece      │
│  - 📱 PiP Mode              │
│  - 👥 Invite Family         │
│  - ℹ️ Meeting Info          │
└─────────────────────────────┘
```

### 3.2 Doctor: Create & Manage Meeting Flow

```text
Appointment Detail → "เริ่มประชุม"
              │
              ▼
┌─────────────────────────────┐
│  POST /api/video-meeting/    │
│  create                      │
│  Returns: meeting details    │
│                              │
│  Push notification sent      │
│  to patient                  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Doctor Meeting Screen       │
│  (HOST Controls)             │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   Patient Video Feed   │  │
│  │                        │  │
│  │          ┌──────────┐  │  │
│  │          │ Self View│  │  │
│  │          └──────────┘  │  │
│  └────────────────────────┘  │
│                              │
│  HOST Controls Panel:        │
│  ┌────────────────────────┐  │
│  │ 📝 Transcription [ON]  │  │
│  │ 🤖 AI CDS       [ON]  │  │
│  │ 📊 Patient Info  [▶]  │  │
│  │ 💊 Quick Prescribe [▶] │  │
│  └────────────────────────┘  │
│                              │
│  ┌──────────────────────┐    │
│  │ 🎤  📷  💬  📝  📞  │    │
│  │ Mute Cam Chat EMR End│    │
│  └──────────────────────┘    │
└─────────────────────────────┘
```

### 3.3 PiP (Picture-in-Picture) Mode

```text
User goes to home screen or another app
              │
              ▼
┌─────────────────────────────────────┐
│  Home Screen / Other App            │
│                                     │
│                ┌─────────────┐      │
│                │  Doctor     │      │
│                │  Video      │      │
│                │  (Floating) │      │
│                │             │      │
│                │  🔇  ❌     │      │
│                └─────────────┘      │
│                   ↕ Draggable       │
│                                     │
└─────────────────────────────────────┘

// Implementation
import { usePiPMode } from '@/hooks/usePiPMode';

function MeetingScreen() {
  const { enterPiP, isInPiP } = usePiPMode();
  
  // Auto-enter PiP when user navigates away
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && meetingActive) {
        enterPiP();
      }
    });
    return () => subscription.remove();
  }, [meetingActive]);
}
```

---

## 4. Speech-to-Text Transcription (Mobile)

### 4.1 Native Speech Recognition

```typescript
// Using expo-speech-recognition (or @react-native-voice/voice)
import * as Speech from 'expo-speech';

export class MobileTranscriptionService {
  private isRecording = false;
  private segments: TranscriptSegment[] = [];
  
  // Start continuous transcription
  async startTranscription(
    meetingId: string,
    speakerRole: 'doctor' | 'patient',
    language: string = 'th-TH',
  ): Promise<void> {
    this.isRecording = true;
    
    // Use Web Speech API equivalent on React Native
    // Or platform-native: SFSpeechRecognizer (iOS) / SpeechRecognizer (Android)
    
    const recognition = new NativeSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    
    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1];
      
      if (transcript.isFinal) {
        const segment: TranscriptSegment = {
          speaker: speakerRole,
          text: transcript[0].transcript,
          timestamp: new Date().toISOString(),
          confidence: transcript[0].confidence,
          language,
        };
        
        this.segments.push(segment);
        
        // Send to server via Socket.IO
        socket.emit('transcript-segment', {
          meetingId,
          segment,
        });
        
        // Also POST to REST API for persistence
        await meetingApi.addTranscript(meetingId, segment);
      }
    };
    
    recognition.start();
  }
  
  // Stop transcription
  async stopTranscription(): Promise<TranscriptSegment[]> {
    this.isRecording = false;
    return this.segments;
  }
}
```

### 4.2 Bilingual Support (Thai + English)

```typescript
// Auto-detect language or allow manual switch
const SUPPORTED_LANGUAGES = [
  { code: 'th-TH', label: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
];

// Language switching UI in meeting toolbar
function LanguageSwitcher({ currentLang, onSwitch }) {
  return (
    <TouchableOpacity onPress={() => onSwitch(
      currentLang === 'th-TH' ? 'en-US' : 'th-TH'
    )}>
      <Text>{currentLang === 'th-TH' ? '🇹🇭 ไทย' : '🇺🇸 EN'}</Text>
    </TouchableOpacity>
  );
}
```

---

## 5. Meeting Component Implementation

### 5.1 JitsiMeeting React Native Component

```tsx
// components/meeting/JitsiMeetingView.tsx
import { JitsiMeeting } from '@jitsi/react-native-sdk';

interface Props {
  roomName: string;
  serverUrl: string;
  token: string;
  userInfo: {
    displayName: string;
    email: string;
    avatarURL?: string;
  };
  isHost: boolean;
  onConferenceJoined: () => void;
  onConferenceLeft: () => void;
  onParticipantJoined: (participant: any) => void;
}

export function JitsiMeetingView({
  roomName,
  serverUrl,
  token,
  userInfo,
  isHost,
  onConferenceJoined,
  onConferenceLeft,
  onParticipantJoined,
}: Props) {
  
  const configOverrides = {
    // Disable features not needed
    'toolbox.alwaysVisible': false,
    'chat.enabled': true,
    'recording.enabled': isHost,
    'lobby.enabled': true,
    'breakoutRooms.hideAddRoomButton': true,
    
    // Mobile-specific
    'pip.enabled': true,
    'callIntegration.enabled': true,  // CallKit/ConnectionService
    'audioRoute.enabled': true,
    
    // Thai language
    'defaultLanguage': 'th',
    
    // Security
    'requireDisplayName': true,
    'disableDeepLinking': true,
    'disableInviteFunctions': !isHost,
    
    // Quality
    'resolution': 720,
    'constraints': {
      video: { height: { ideal: 720, max: 1080 } },
    },
    
    // Privacy
    'disableThirdPartyRequests': true,
    'analytics.disabled': true,
  };

  return (
    <JitsiMeeting
      serverURL={serverUrl}
      room={roomName}
      token={token}
      config={configOverrides}
      userInfo={userInfo}
      style={{ flex: 1 }}
      onConferenceJoined={onConferenceJoined}
      onConferenceTerminated={onConferenceLeft}
      onParticipantJoined={onParticipantJoined}
      flags={{
        'meeting-password.enabled': false,
        'pip.enabled': true,
        'call-integration.enabled': true,
        'audio-only.enabled': true,
        'close-captions.enabled': true,
        'chat.enabled': true,
        'invite.enabled': isHost,
        'recording.enabled': isHost,
        'tile-view.enabled': true,
        'toolbox.enabled': true,
        'overflow-menu.enabled': true,
      }}
    />
  );
}
```

### 5.2 Meeting Screen (Patient App)

```tsx
// apps/patient/app/meeting/[meetingId].tsx
import { useLocalSearchParams, router } from 'expo-router';
import { JitsiMeetingView } from '@/components/meeting/JitsiMeetingView';
import { MobileTranscriptionService } from '@/services/transcription';

export default function PatientMeetingScreen() {
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const { data: meeting } = useQuery(['meeting', meetingId], () => 
    patientApi.getMeetingDetails(meetingId)
  );
  const { user } = useAuth();
  const transcription = useRef(new MobileTranscriptionService());

  const handleConferenceJoined = useCallback(async () => {
    // Start transcription
    await transcription.current.startTranscription(meetingId, 'patient');
    
    // Update meeting status
    await patientApi.joinMeeting(meeting.appointmentId);
  }, [meetingId]);

  const handleConferenceLeft = useCallback(async () => {
    // Stop transcription
    await transcription.current.stopTranscription();
    
    // Navigate to post-meeting feedback
    router.replace(`/meeting/${meetingId}/feedback`);
  }, [meetingId]);

  if (!meeting) return <LoadingScreen />;

  return (
    <View style={{ flex: 1 }}>
      <JitsiMeetingView
        roomName={meeting.room_name}
        serverUrl={meeting.jitsi_server_url}
        token={meeting.jwt_token}
        userInfo={{
          displayName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          avatarURL: user.avatarUrl,
        }}
        isHost={false}
        onConferenceJoined={handleConferenceJoined}
        onConferenceLeft={handleConferenceLeft}
        onParticipantJoined={() => {}}
      />
    </View>
  );
}
```

### 5.3 Meeting Screen (Doctor App — HOST)

```tsx
// apps/doctor/app/meeting/[meetingId].tsx
export default function DoctorMeetingScreen() {
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'info' | 'cds' | 'emr'>('info');
  const { data: meeting } = useQuery(['meeting', meetingId]);
  const { data: patientInfo } = useQuery(['patient', meeting?.patient_id]);
  
  // HOST controls
  const handleEndMeeting = useCallback(async () => {
    // End meeting → triggers AI summary generation
    await doctorApi.endMeeting(meeting.appointmentId);
    
    // Navigate to post-meeting EMR creation
    router.replace(`/patients/${meeting.patient_id}/emr/new?appointmentId=${meeting.appointmentId}`);
  }, [meeting]);

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* Main Video Area */}
      <View style={{ flex: showSidePanel ? 0.6 : 1 }}>
        <JitsiMeetingView
          roomName={meeting.room_name}
          serverUrl={meeting.jitsi_server_url}
          token={meeting.jwt_token}
          userInfo={{
            displayName: `Dr. ${doctor.firstName}`,
            email: doctor.email,
          }}
          isHost={true}
          onConferenceJoined={() => {}}
          onConferenceLeft={handleEndMeeting}
          onParticipantJoined={() => {}}
        />
      </View>
      
      {/* Doctor Side Panel (tablet/landscape) */}
      {showSidePanel && (
        <View style={{ flex: 0.4, borderLeftWidth: 1 }}>
          <SegmentedControl
            values={['ข้อมูลคนไข้', 'CDS', 'EMR']}
            selectedIndex={['info', 'cds', 'emr'].indexOf(sidePanelTab)}
            onChange={(index) => setSidePanelTab(['info', 'cds', 'emr'][index])}
          />
          
          {sidePanelTab === 'info' && <PatientInfoPanel patient={patientInfo} />}
          {sidePanelTab === 'cds' && <CDSAlertsPanel appointmentId={meeting.appointmentId} />}
          {sidePanelTab === 'emr' && <QuickEMRPanel appointmentId={meeting.appointmentId} />}
        </View>
      )}
      
      {/* HOST Floating Controls */}
      <FloatingHostControls
        onToggleTranscription={() => {}}
        onToggleSidePanel={() => setShowSidePanel(!showSidePanel)}
        onEndMeeting={handleEndMeeting}
        onInviteParticipant={() => {}}
      />
    </View>
  );
}
```

---

## 6. CallKit / ConnectionService Integration

### 6.1 Incoming Call UI (iOS CallKit)

```typescript
// When meeting notification arrives, show as incoming call
import RNCallKeep from 'react-native-callkeep';

export function setupCallKit() {
  RNCallKeep.setup({
    ios: {
      appName: 'Izara Dr. Anywhere',
      supportsVideo: true,
      maximumCallGroups: 1,
      maximumCallsPerCallGroup: 1,
    },
    android: {
      alertTitle: 'การประชุมวิดีโอ',
      alertDescription: 'ต้องการอนุญาตให้แสดงหน้าจอรับสาย?',
      cancelButton: 'ยกเลิก',
      okButton: 'ตกลง',
      additionalPermissions: [],
      selfManaged: true,
    },
  });

  // Handle incoming "call" (meeting invitation)
  RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
    // Navigate to meeting screen
    const meetingId = callUUIDs.get(callUUID);
    if (meetingId) {
      router.push(`/meeting/${meetingId}`);
    }
  });

  RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
    // Decline meeting
    const meetingId = callUUIDs.get(callUUID);
    if (meetingId) {
      // Optionally notify server
    }
  });
}

// Display incoming call when push arrives
export function showIncomingCall(meetingId: string, callerName: string) {
  const callUUID = generateUUID();
  callUUIDs.set(callUUID, meetingId);
  
  RNCallKeep.displayIncomingCall(
    callUUID,
    callerName,
    callerName,
    'generic',
    true  // hasVideo
  );
}
```

---

## 7. Post-Meeting Workflow

### 7.1 Doctor Post-Meeting Flow

```text
Meeting Ends
     │
     ▼
┌─────────────────────┐
│ AI generates:        │
│ - Meeting summary    │
│ - Transcript         │
│ - CDS suggestions    │
│ - Draft EMR          │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ EMR Creation Screen  │
│                      │
│ Pre-filled from AI:  │
│ - Chief complaint    │
│ - History            │
│ - Assessment         │
│ - Plan               │
│                      │
│ Doctor reviews and:  │
│ ✅ Validates AI output│
│ ✏️ Edits as needed   │
│ 📝 Signs EMR         │
│                      │
│ Optional:            │
│ 💊 Add prescription  │
│ 🧪 Order labs        │
│ 📄 Send instructions │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ Push notifications to│
│ patient:             │
│ - EMR signed ✅       │
│ - Prescription 💊    │
│ - Instructions 📄    │
└─────────────────────┘
```

### 7.2 Patient Post-Meeting Flow

```text
Meeting Ends
     │
     ▼
┌─────────────────────┐
│ Feedback Screen      │
│                      │
│ ⭐⭐⭐⭐⭐ Rate Doctor │
│                      │
│ 🎤 Audio quality     │
│ 📹 Video quality     │
│ 👨‍⚕️ Doctor rating    │
│                      │
│ 💬 Comments          │
│                      │
│ [Submit Feedback]    │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ Wait for EMR/Rx      │
│ (Push notification   │
│  when ready)         │
└─────────────────────┘
```

---

## 8. Meeting Quality & Network Handling

### 8.1 Network Quality Indicator

```typescript
// Monitor WebRTC stats for quality indicator
import NetInfo from '@react-native-community/netinfo';

export function useNetworkQuality() {
  const [quality, setQuality] = useState<'good' | 'fair' | 'poor'>('good');
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        setQuality('poor');
      } else if (state.type === 'wifi') {
        setQuality('good');
      } else if (state.type === 'cellular') {
        const gen = state.details?.cellularGeneration;
        setQuality(gen === '4g' || gen === '5g' ? 'fair' : 'poor');
      }
    });
    return unsubscribe;
  }, []);

  return quality;
}

// Adaptive video quality based on network
function getVideoConstraints(quality: string) {
  switch (quality) {
    case 'good':
      return { height: { ideal: 720 }, frameRate: { ideal: 30 } };
    case 'fair':
      return { height: { ideal: 480 }, frameRate: { ideal: 24 } };
    case 'poor':
      return { height: { ideal: 240 }, frameRate: { ideal: 15 } };
    default:
      return { height: { ideal: 480 } };
  }
}
```

### 8.2 Reconnection Strategy

```typescript
// Auto-reconnect on network drop
const RECONNECT_CONFIG = {
  maxAttempts: 5,
  delays: [1000, 2000, 4000, 8000, 16000],  // Exponential backoff
};

export function useMeetingReconnect(meetingId: string) {
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'failed'>('connected');
  const attemptRef = useRef(0);
  
  const reconnect = useCallback(async () => {
    setStatus('reconnecting');
    
    while (attemptRef.current < RECONNECT_CONFIG.maxAttempts) {
      try {
        await new Promise(r => setTimeout(r, RECONNECT_CONFIG.delays[attemptRef.current]));
        // Rejoin meeting
        await meetingApi.joinMeeting(meetingId);
        setStatus('connected');
        attemptRef.current = 0;
        return;
      } catch {
        attemptRef.current++;
      }
    }
    
    setStatus('failed');
    Alert.alert(
      'การเชื่อมต่อขาดหาย',
      'ไม่สามารถเชื่อมต่อกลับได้ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ต',
      [
        { text: 'ลองใหม่', onPress: () => { attemptRef.current = 0; reconnect(); } },
        { text: 'ออกจากประชุม', onPress: () => router.back() },
      ]
    );
  }, [meetingId]);
  
  return { status, reconnect };
}
```

---

### End of Mobile Video Meeting — February 2026
