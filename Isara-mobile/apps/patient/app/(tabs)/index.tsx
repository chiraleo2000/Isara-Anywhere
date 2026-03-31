import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { patientApi } from '@izara/api-client';

// Quick action card component
function QuickAction({
  icon,
  label,
  onPress,
  color = 'bg-sky-50',
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      className={`${color} rounded-2xl p-4 items-center flex-1 mx-1`}
      onPress={onPress}
    >
      <Text className="text-2xl mb-2">{icon}</Text>
      <Text className="text-xs font-medium text-gray-700 text-center">{label}</Text>
    </TouchableOpacity>
  );
}

// Appointment card component
function AppointmentCard({
  appointment,
}: {
  appointment: {
    id: string;
    doctor_name: string;
    specialty: string;
    date: string;
    time: string;
    status: string;
    type: string;
  };
}) {
  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
  };

  const statusLabels: Record<string, string> = {
    confirmed: 'ยืนยันแล้ว',
    pending: 'รอการยืนยัน',
    in_progress: 'กำลังดำเนินการ',
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
      onPress={() => router.push(`/appointment/${appointment.id}`)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">
            {appointment.doctor_name}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">{appointment.specialty}</Text>
          <View className="flex-row items-center mt-2">
            <Text className="text-sm text-gray-600">📅 {appointment.date}</Text>
            <Text className="text-sm text-gray-600 ml-3">🕐 {appointment.time}</Text>
          </View>
        </View>
        <View className={`rounded-full px-3 py-1 ${statusColors[appointment.status] || 'bg-gray-100 text-gray-700'}`}>
          <Text className="text-xs font-medium">
            {statusLabels[appointment.status] || appointment.status}
          </Text>
        </View>
      </View>
      {appointment.type === 'video' && (
        <TouchableOpacity
          className="bg-sky-500 rounded-xl py-2 mt-3 items-center"
          onPress={() => router.push(`/meeting/${appointment.id}`)}
        >
          <Text className="text-white font-semibold text-sm">📹 เข้าร่วมวิดีโอ</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { user } = useAuthStore();

  // Fetch upcoming appointments
  const {
    data: appointments,
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => patientApi.getUpcomingAppointments(),
  });

  // Fetch health summary
  const { data: healthSummary } = useQuery({
    queryKey: ['health', 'summary'],
    queryFn: () => patientApi.getHealthSummary(),
  });

  // Fetch unread notification count
  const { data: notificationCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => patientApi.getUnreadNotificationCount(),
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAppointments();
    setRefreshing(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Greeting Header */}
      <View className="bg-sky-500 px-6 pt-4 pb-8 rounded-b-3xl">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-sm">สวัสดี 👋</Text>
            <Text className="text-white text-xl font-bold mt-1">
              {user?.first_name || 'ผู้ใช้'}
            </Text>
          </View>
          <TouchableOpacity
            className="relative"
            onPress={() => router.push('/notifications')}
          >
            <Text className="text-2xl">🔔</Text>
            {(notificationCount?.count ?? 0) > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {notificationCount!.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-4 -mt-4">
        <View className="bg-white rounded-2xl p-4 shadow-sm flex-row">
          <QuickAction
            icon="📋"
            label="นัดหมาย"
            onPress={() => router.push('/booking')}
            color="bg-sky-50"
          />
          <QuickAction
            icon="🤖"
            label="ปรึกษา AI"
            onPress={() => router.push('/(tabs)/ai-chat')}
            color="bg-purple-50"
          />
          <QuickAction
            icon="💊"
            label="ยาของฉัน"
            onPress={() => router.push('/health/medications')}
            color="bg-green-50"
          />
          <QuickAction
            icon="📍"
            label="ใกล้เคียง"
            onPress={() => router.push('/nearby')}
            color="bg-orange-50"
          />
        </View>
      </View>

      {/* Health Summary */}
      {healthSummary && (
        <View className="px-4 mt-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">สรุปสุขภาพ</Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-2xl">❤️</Text>
                <Text className="text-lg font-bold text-gray-900 mt-1">
                  {healthSummary.heartRate || '--'}
                </Text>
                <Text className="text-xs text-gray-500">ชีพจร (bpm)</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-2xl">🩸</Text>
                <Text className="text-lg font-bold text-gray-900 mt-1">
                  {healthSummary.bloodPressure || '--/--'}
                </Text>
                <Text className="text-xs text-gray-500">ความดัน</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-2xl">🌡️</Text>
                <Text className="text-lg font-bold text-gray-900 mt-1">
                  {healthSummary.temperature || '--'}
                </Text>
                <Text className="text-xs text-gray-500">อุณหภูมิ (°C)</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-2xl">⚖️</Text>
                <Text className="text-lg font-bold text-gray-900 mt-1">
                  {healthSummary.weight || '--'}
                </Text>
                <Text className="text-xs text-gray-500">น้ำหนัก (kg)</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Upcoming Appointments */}
      <View className="px-4 mt-4 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold text-gray-900">นัดหมายที่กำลังจะมาถึง</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
            <Text className="text-sky-500 text-sm font-medium">ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>
        {appointmentsLoading ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Text className="text-gray-400">กำลังโหลด...</Text>
          </View>
        ) : (appointments?.length ?? 0) > 0 ? (
          appointments!.slice(0, 3).map((apt: any) => (
            <AppointmentCard key={apt.id} appointment={apt} />
          ))
        ) : (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Text className="text-4xl mb-2">📅</Text>
            <Text className="text-gray-500 text-center">
              ไม่มีนัดหมายที่กำลังจะมาถึง
            </Text>
            <TouchableOpacity
              className="bg-sky-500 rounded-xl px-6 py-3 mt-4"
              onPress={() => router.push('/booking')}
            >
              <Text className="text-white font-semibold">นัดหมายแพทย์</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
