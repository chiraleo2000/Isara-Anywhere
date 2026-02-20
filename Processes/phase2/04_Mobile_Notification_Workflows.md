# 🔔 Mobile Notification Workflows — Izara Dr. Anywhere

**Version:** 2.0.0  
**Date:** February 2026  
**Platforms:** iOS (APNS) + Android (FCM)

---

## 1. Push Notification Architecture

### 1.1 System Overview

```text
┌───────────────┐         ┌──────────────┐         ┌──────────────┐
│  API Server   │────────►│  FCM / APNS  │────────►│  Mobile App  │
│               │         │              │         │              │
│ Event Trigger │  HTTP   │ Google/Apple │  Push   │ Notification │
│ Queue Worker  │────────►│ Push Service │────────►│ Handler      │
└───────────────┘         └──────────────┘         └──────────────┘
       ▲                                                  │
       │                                                  │
┌──────┴──────┐                                   ┌──────▼──────┐
│ PostgreSQL  │                                   │ Deep Link   │
│ device_tokens│                                  │ Navigation  │
│ notification │                                  │ to Screen   │
│ _preferences │                                  └─────────────┘
└─────────────┘
```

### 1.2 Notification Categories

| Category | Icon | Patient App | Doctor App | Priority |
| ---------- | ------ | :-----------: | :----------: | ---------- |
| Appointment | 📅 | ✅ | ✅ | High |
| Video Meeting | 📹 | ✅ | ✅ | Critical |
| EMR/Prescriptions | 📋 | ✅ | ✅ | Normal |
| Lab Results | 🧪 | ✅ | ✅ | Normal |
| Medication Reminder | 💊 | ✅ | ❌ | High |
| AI Analysis Ready | 🤖 | ✅ | ✅ | Low |
| Payment | 💳 | ✅ | ❌ | Normal |
| System | ⚙️ | ✅ | ✅ | Low |
| Chat/Message | 💬 | ✅ | ✅ | High |

---

## 2. FCM/APNS Configuration

### 2.1 Expo Push Notifications Setup

```typescript
// app.json / app.config.ts
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2563EB",
          "sounds": [
            "./assets/sounds/appointment.wav",
            "./assets/sounds/meeting.wav",
            "./assets/sounds/urgent.wav"
          ],
          "defaultChannel": "default"
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "supportsTablet": true,
      "entitlements": {
        "aps-environment": "production"
      }
    }
  }
}
```

### 2.2 Notification Channels (Android)

```typescript
import * as Notifications from 'expo-notifications';

// Define Android notification channels
const CHANNELS = [
  {
    id: 'appointments',
    name: 'นัดหมาย',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'appointment.wav',
  },
  {
    id: 'meetings',
    name: 'การประชุมวิดีโอ',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    sound: 'meeting.wav',
  },
  {
    id: 'medical',
    name: 'ข้อมูลทางการแพทย์',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  },
  {
    id: 'medications',
    name: 'แจ้งเตือนทานยา',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'appointment.wav',
  },
  {
    id: 'payments',
    name: 'การชำระเงิน',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  },
  {
    id: 'system',
    name: 'ระบบ',
    importance: Notifications.AndroidImportance.LOW,
  },
];

export async function setupNotificationChannels() {
  for (const channel of CHANNELS) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      importance: channel.importance,
      vibrationPattern: channel.vibrationPattern,
      sound: channel.sound,
    });
  }
}
```

---

## 3. Device Token Registration Flow

### 3.1 Registration Workflow

```text
App Launch / Login
       │
       ▼
┌─────────────────────┐
│ Request Push         │
│ Permission           │
│ (expo-notifications) │
└───────┬─────────────┘
        │ Granted
        ▼
┌─────────────────────┐
│ Get Expo Push Token  │
│ OR FCM/APNS Token   │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ POST /api/mobile/    │
│ device/register      │
│ {                    │
│   device_token,      │
│   platform,          │
│   device_id,         │
│   device_model,      │
│   os_version,        │
│   app_version        │
│ }                    │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ Stored in            │
│ device_tokens table  │
│ Linked to user       │
└─────────────────────┘
```

### 3.2 Implementation

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotifications(): Promise<string | null> {
  // 1. Check if physical device
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // 2. Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }

  // 3. Get push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const pushToken = tokenData.data;

  // 4. Register with backend
  await mobileApi.registerDevice({
    device_token: pushToken,
    platform: Platform.OS as 'ios' | 'android',
    device_id: await getDeviceId(),
    device_model: `${Device.manufacturer} ${Device.modelName}`,
    os_version: `${Platform.OS} ${Device.osVersion}`,
    app_version: Constants.expoConfig?.version || '2.0.0',
    push_enabled: true,
  });

  // 5. Setup Android channels
  if (Platform.OS === 'android') {
    await setupNotificationChannels();
  }

  return pushToken;
}

// Handle token refresh
Notifications.addPushTokenListener(async (token) => {
  await mobileApi.updatePushToken(token.data);
});
```

---

## 4. Notification Types & Deep Links

### 4.1 Patient App Notifications

#### Appointment Notifications

```typescript
// Appointment Confirmed
{
  to: '<push_token>',
  title: '✅ นัดหมายได้รับการยืนยัน',
  body: 'แพทย์ นพ.สมชาย ยืนยันนัดหมายวันที่ 20 ก.พ. 2026 เวลา 14:00',
  data: {
    type: 'appointment_confirmed',
    appointmentId: 'apt_12345',
    screen: '/(tabs)/appointments/apt_12345',
  },
  channelId: 'appointments',
  priority: 'high',
  badge: 1,
}

// Appointment Reminder (24h before)
{
  to: '<push_token>',
  title: '⏰ พรุ่งนี้มีนัดหมาย',
  body: 'คุณมีนัดหมายกับ นพ.สมชาย พรุ่งนี้เวลา 14:00',
  data: {
    type: 'appointment_reminder_24h',
    appointmentId: 'apt_12345',
    screen: '/(tabs)/appointments/apt_12345',
  },
  channelId: 'appointments',
  priority: 'high',
}

// Appointment Reminder (1h before)
{
  to: '<push_token>',
  title: '🔔 อีก 1 ชั่วโมงจะถึงเวลานัดหมาย',
  body: 'เตรียมตัวสำหรับการพบ นพ.สมชาย เวลา 14:00',
  data: {
    type: 'appointment_reminder_1h',
    appointmentId: 'apt_12345',
    screen: '/(tabs)/appointments/apt_12345',
    action: 'prepare_for_meeting',
  },
  channelId: 'appointments',
  priority: 'high',
}
```

#### Video Meeting Notifications

```typescript
// Meeting Started (Doctor started the meeting)
{
  to: '<push_token>',
  title: '📹 แพทย์เริ่มการประชุมแล้ว',
  body: 'นพ.สมชาย เริ่มการประชุมวิดีโอแล้ว กดเพื่อเข้าร่วม',
  data: {
    type: 'meeting_started',
    appointmentId: 'apt_12345',
    meetingId: 'meet_67890',
    screen: '/meeting/meet_67890',
    action: 'join_meeting',
  },
  channelId: 'meetings',
  priority: 'max',
  sound: 'meeting.wav',
}

// Meeting Ended (Summary available)
{
  to: '<push_token>',
  title: '📋 สรุปการประชุมพร้อมดู',
  body: 'สรุปการพบแพทย์ นพ.สมชาย พร้อมให้ตรวจสอบ',
  data: {
    type: 'meeting_summary',
    appointmentId: 'apt_12345',
    screen: '/(tabs)/health/health-logs',
  },
  channelId: 'medical',
}
```

#### EMR & Lab Results

```typescript
// EMR Signed by Doctor
{
  to: '<push_token>',
  title: '📋 เวชระเบียนพร้อมดู',
  body: 'นพ.สมชาย ลงนามเวชระเบียนของคุณแล้ว',
  data: {
    type: 'emr_signed',
    emrId: 'emr_11111',
    screen: '/(tabs)/health/health-logs',
  },
  channelId: 'medical',
}

// Lab Results Ready
{
  to: '<push_token>',
  title: '🧪 ผลตรวจพร้อมดู',
  body: 'ผลตรวจเลือด CBC พร้อมให้ตรวจสอบ',
  data: {
    type: 'lab_results_ready',
    labOrderId: 'lab_22222',
    screen: '/(tabs)/health/health-logs',
  },
  channelId: 'medical',
}

// Prescription Ready
{
  to: '<push_token>',
  title: '💊 ใบสั่งยาพร้อม',
  body: 'แพทย์สั่งยา 3 รายการ กดดูรายละเอียด',
  data: {
    type: 'prescription_ready',
    prescriptionId: 'rx_33333',
    screen: '/(tabs)/health/medications',
  },
  channelId: 'medical',
}
```

#### Medication Reminders (Local Notifications)

```typescript
// Scheduled locally — no server push needed
import * as Notifications from 'expo-notifications';

export async function scheduleMedicationReminder(
  medication: Medication,
  times: string[],  // ['08:00', '14:00', '20:00']
): Promise<string[]> {
  const identifiers: string[] = [];
  
  for (const time of times) {
    const [hour, minute] = time.split(':').map(Number);
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 ถึงเวลาทานยา',
        body: `${medication.name} ${medication.dosage}`,
        data: {
          type: 'medication_reminder',
          medicationId: medication.id,
          screen: '/(tabs)/health/medications',
        },
        categoryIdentifier: 'medication',
        sound: 'appointment.wav',
      },
      trigger: {
        type: 'daily',
        hour,
        minute,
        repeats: true,
      },
    });
    
    identifiers.push(id);
  }
  
  return identifiers;
}
```

#### Payment Notifications

```typescript
// Payment Success
{
  to: '<push_token>',
  title: '💳 ชำระเงินสำเร็จ',
  body: 'ชำระค่าบริการ ฿500 สำเร็จ',
  data: {
    type: 'payment_success',
    paymentId: 'pay_44444',
    screen: '/(tabs)/profile/payments',
  },
  channelId: 'payments',
}
```

### 4.2 Doctor App Notifications

```typescript
// New Appointment Request
{
  to: '<push_token>',
  title: '📅 นัดหมายใหม่',
  body: 'คนไข้ สมหญิง แม็ค ขอนัดหมายวันที่ 20 ก.พ. 2026',
  data: {
    type: 'new_appointment',
    appointmentId: 'apt_12345',
    screen: '/(tabs)/appointments',
    action: 'review',
  },
  channelId: 'appointments',
  priority: 'high',
}

// Patient Joined Queue
{
  to: '<push_token>',
  title: '👤 คนไข้เข้าคิว',
  body: 'สมหญิง แม็ค เข้าคิวแล้ว (รอ 3 คน)',
  data: {
    type: 'patient_in_queue',
    queueId: 'q_55555',
    screen: '/(tabs)/queue',
  },
  channelId: 'appointments',
}

// AI Analysis Complete
{
  to: '<push_token>',
  title: '🤖 AI วิเคราะห์เสร็จ',
  body: 'สรุปการประชุมและคำแนะนำ CDS พร้อมตรวจสอบ',
  data: {
    type: 'ai_analysis_ready',
    appointmentId: 'apt_12345',
    screen: '/(tabs)/patients/apt_12345/emr',
  },
  channelId: 'medical',
}

// New Doctor Registration (Admin)
{
  to: '<push_token>',
  title: '👨‍⚕️ แพทย์ใหม่รอการอนุมัติ',
  body: 'นพ.ใหม่ สมัครเข้าระบบ กรุณาตรวจสอบ',
  data: {
    type: 'new_doctor_pending',
    doctorId: 'doc_66666',
    screen: '/(tabs)/admin/pending-doctors',
  },
  channelId: 'system',
}
```

---

## 5. Notification Handler & Deep Linking

### 5.1 Foreground Notification Handler

```typescript
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// Configure foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    
    // Show banner for most notifications, suppress for active meeting
    const shouldShow = type !== 'meeting_started' || !isMeetingActive();
    
    return {
      shouldShowAlert: shouldShow,
      shouldPlaySound: type !== 'system',
      shouldSetBadge: true,
    };
  },
});

// Handle notification tap (app is open)
const responseSubscription = Notifications.addNotificationResponseReceivedListener(
  (response) => {
    const screen = response.notification.request.content.data?.screen;
    const action = response.notification.request.content.data?.action;
    
    if (screen) {
      // Navigate to the appropriate screen
      router.push(screen as any);
    }
    
    if (action === 'join_meeting') {
      // Directly open meeting
      const meetingId = response.notification.request.content.data?.meetingId;
      router.push(`/meeting/${meetingId}`);
    }
  }
);
```

### 5.2 Background/Killed App Handler

```typescript
// Handle notification that opened the app from killed state
const lastNotificationResponse = Notifications.useLastNotificationResponse();

useEffect(() => {
  if (lastNotificationResponse) {
    const screen = lastNotificationResponse.notification.request.content.data?.screen;
    if (screen && isAuthenticated) {
      router.push(screen as any);
    }
  }
}, [lastNotificationResponse, isAuthenticated]);
```

### 5.3 Deep Link URL Scheme

```text
// Expo Router linking configuration
izara-patient://appointments/apt_12345
izara-patient://meeting/meet_67890
izara-patient://health/health-logs
izara-patient://health/medications
izara-patient://notifications

izara-doctor://appointments
izara-doctor://patients/pat_12345/emr
izara-doctor://queue
izara-doctor://meeting/meet_67890
```

---

## 6. Notification Preferences

### 6.1 User Settings Screen

```typescript
interface NotificationPreferences {
  // Global
  push_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;         // "22:00"
  quiet_hours_end: string;           // "07:00"
  
  // Category toggles
  appointment_notifications: boolean;
  meeting_notifications: boolean;     // Cannot disable (critical)
  emr_notifications: boolean;
  lab_result_notifications: boolean;
  medication_reminders: boolean;
  payment_notifications: boolean;
  health_tips: boolean;
  system_notifications: boolean;
  
  // Delivery preferences
  sound_enabled: boolean;
  vibration_enabled: boolean;
  badge_enabled: boolean;
}
```

### 6.2 Notification Settings UI Flow

```text
Profile Tab → Settings → Notifications
       │
       ├── 🔔 Push Notifications [Toggle]
       │
       ├── 🌙 Quiet Hours
       │   ├── Enable [Toggle]
       │   ├── Start Time [22:00]
       │   └── End Time [07:00]
       │
       ├── 📅 Appointment Alerts [Toggle]
       ├── 📹 Meeting Alerts [Always On / Locked]
       ├── 📋 Medical Records [Toggle]
       ├── 🧪 Lab Results [Toggle]
       ├── 💊 Medication Reminders [Toggle]
       ├── 💳 Payment Alerts [Toggle]
       ├── 💡 Health Tips [Toggle]
       │
       └── 🔊 Sound & Vibration
           ├── Sound [Toggle]
           └── Vibration [Toggle]
```

---

## 7. Backend Notification Service

### 7.1 Server-Side Push Service

```typescript
// server/services/pushNotificationService.ts
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export class PushNotificationService {
  // Send push notification to a user (all their devices)
  async sendToUser(userId: number, notification: PushPayload): Promise<void> {
    // 1. Get all active devices for this user
    const devices = await db.query(
      'SELECT device_token FROM device_tokens WHERE user_id = $1 AND is_active = true AND push_enabled = true',
      [userId]
    );

    if (devices.rows.length === 0) return;

    // 2. Check notification preferences
    const prefs = await this.getUserPreferences(userId);
    if (!this.shouldSend(notification.type, prefs)) return;

    // 3. Check quiet hours
    if (prefs.quiet_hours_enabled && this.isQuietHours(prefs)) {
      if (notification.priority !== 'critical') return;
    }

    // 4. Build messages
    const messages: ExpoPushMessage[] = devices.rows
      .filter(d => Expo.isExpoPushToken(d.device_token))
      .map(device => ({
        to: device.device_token,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: notification.sound || 'default',
        priority: notification.priority || 'default',
        channelId: notification.channelId,
        badge: notification.badge,
      }));

    // 5. Send in chunks
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(tickets, devices.rows);
      } catch (error) {
        console.error('Push notification error:', error);
      }
    }

    // 6. Store notification in database
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data, sent_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, notification.type, notification.title, notification.body, JSON.stringify(notification.data)]
    );
  }

  // Handle failed push tokens (mark inactive)
  private async handleTickets(tickets: any[], devices: any[]): Promise<void> {
    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i].status === 'error') {
        if (tickets[i].details?.error === 'DeviceNotRegistered') {
          await db.query(
            'UPDATE device_tokens SET is_active = false WHERE device_token = $1',
            [devices[i].device_token]
          );
        }
      }
    }
  }
}
```

### 7.2 Trigger Points Integration

```typescript
// Integrate push notifications into existing API handlers

// In appointment controller — after doctor confirms
async function confirmAppointment(req, res) {
  // ... existing confirmation logic ...
  
  // NEW: Send push to patient
  await pushService.sendToUser(appointment.patient_id, {
    type: 'appointment_confirmed',
    title: '✅ นัดหมายได้รับการยืนยัน',
    body: `แพทย์ ${doctor.name} ยืนยันนัดหมายวันที่ ${formatDate(appointment.date)}`,
    data: {
      type: 'appointment_confirmed',
      appointmentId: appointment.id,
      screen: '/(tabs)/appointments/' + appointment.id,
    },
    channelId: 'appointments',
    priority: 'high',
  });
  
  // Schedule reminders
  await scheduleAppointmentReminders(appointment);
}

// Schedule 24h and 1h reminders
async function scheduleAppointmentReminders(appointment: Appointment) {
  const appointmentTime = new Date(appointment.date);
  
  // 24h reminder
  const reminder24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
  await scheduleDelayedPush(appointment.patient_id, reminder24h, {
    type: 'appointment_reminder_24h',
    title: '⏰ พรุ่งนี้มีนัดหมาย',
    body: `คุณมีนัดหมายกับ ${appointment.doctor_name} พรุ่งนี้`,
    data: { appointmentId: appointment.id, screen: '/(tabs)/appointments/' + appointment.id },
    channelId: 'appointments',
    priority: 'high',
  });
  
  // 1h reminder
  const reminder1h = new Date(appointmentTime.getTime() - 60 * 60 * 1000);
  await scheduleDelayedPush(appointment.patient_id, reminder1h, {
    type: 'appointment_reminder_1h',
    title: '🔔 อีก 1 ชั่วโมงจะถึงเวลานัดหมาย',
    body: `เตรียมตัวสำหรับการพบ ${appointment.doctor_name}`,
    data: { appointmentId: appointment.id, screen: '/(tabs)/appointments/' + appointment.id },
    channelId: 'appointments',
    priority: 'high',
  });
}
```

---

## 8. Badge Management

```typescript
// Badge count = unread notifications
export async function updateBadgeCount(): Promise<void> {
  try {
    const response = await apiClient.get('/api/notifications/unread-count');
    const count = response.data.count;
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Ignore errors — badge is not critical
  }
}

// Clear badge when user opens notifications tab
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
```

---

### End of Mobile Notification Workflows — February 2026
