import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useDoctorAuthStore } from '@/stores/authStore';
import { doctorApi } from '@izara/api-client';

// Stat card component
function StatCard({
  icon,
  label,
  value,
  color,
}: Readonly<{
  icon: string;
  label: string;
  value: string | number;
  color: string;
}>) {
  return (
    <View className={`${color} rounded-2xl p-4 flex-1 mx-1`}>
      <Text className="text-xl">{icon}</Text>
      <Text className="text-2xl font-bold text-gray-900 mt-2">{value}</Text>
      <Text className="text-xs text-gray-600 mt-1">{label}</Text>
    </View>
  );
}

// Active appointment card
function ActiveAppointmentCard({
  appointment,
}: Readonly<{
  appointment: {
    id: string;
    patient_name: string;
    patient_age: number;
    symptoms: string;
    time: string;
    status: string;
    type: string;
    queue_number?: number;
  };
}>) {
  const statusColors: Record<string, string> = {
    confirmed: 'border-l-green-500',
    waiting: 'border-l-yellow-500',
    in_progress: 'border-l-blue-500',
    pending: 'border-l-orange-500',
  };

  return (
    <TouchableOpacity
      className={`bg-white rounded-xl p-4 mb-3 border-l-4 ${statusColors[appointment.status] || 'border-l-gray-300'} shadow-sm`}
      onPress={() => router.push(`/patient/${appointment.id}`)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            {appointment.queue_number && (
              <View className="bg-blue-800 rounded-full w-7 h-7 items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">{appointment.queue_number}</Text>
              </View>
            )}
            <Text className="text-base font-semibold text-gray-900">
              {appointment.patient_name}
            </Text>
            <Text className="text-sm text-gray-500 ml-2">
              อายุ {appointment.patient_age} ปี
            </Text>
          </View>
          <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
            อาการ: {appointment.symptoms}
          </Text>
          <Text className="text-xs text-gray-400 mt-1">🕐 {appointment.time}</Text>
        </View>
      </View>
      <View className="flex-row mt-3 gap-2">
        {appointment.type === 'video' && (
          <TouchableOpacity
            className="bg-blue-800 rounded-lg py-2 px-4 flex-1 items-center"
            onPress={() => router.push(`/meeting/${appointment.id}`)}
          >
            <Text className="text-white font-semibold text-sm">📹 เริ่มวิดีโอ</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="bg-green-600 rounded-lg py-2 px-4 flex-1 items-center"
          onPress={() => router.push(`/emr/create/${appointment.id}`)}
        >
          <Text className="text-white font-semibold text-sm">📋 สร้าง EMR</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function DoctorDashboardScreen() {
  const { user } = useDoctorAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch today's statistics
  const { data: stats } = useQuery({
    queryKey: ['doctor', 'stats', 'today'],
    queryFn: () => doctorApi.getTodayStats(),
    refetchInterval: 60_000, // Refresh every minute
  });

  // Fetch today's appointments
  const {
    data: appointments,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['doctor', 'appointments', 'today'],
    queryFn: () => doctorApi.getTodayAppointments(),
    refetchInterval: 30_000, // Refresh every 30s
  });

  // Fetch pending approvals count
  const { data: pendingCount } = useQuery({
    queryKey: ['doctor', 'pending-appointments'],
    queryFn: () => doctorApi.getPendingAppointmentsCount(),
  });

  // Fetch unread notifications
  const { data: notifCount } = useQuery({
    queryKey: ['doctor', 'notifications', 'unread-count'],
    queryFn: () => doctorApi.getUnreadNotificationCount(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Doctor Header */}
      <View className="bg-blue-800 px-6 pt-4 pb-8 rounded-b-3xl">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-blue-200 text-sm">สวัสดี 👋</Text>
            <Text className="text-white text-xl font-bold mt-1">
              {user?.prefix || 'นพ.'} {user?.first_name || 'แพทย์'}
            </Text>
            <Text className="text-blue-200 text-sm mt-0.5">
              {user?.specialty || 'แพทย์ทั่วไป'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="relative"
              onPress={() => router.push('/notifications')}
            >
              <Text className="text-2xl">🔔</Text>
              {(notifCount?.count ?? 0) > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">{notifCount!.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats Overview */}
      <View className="px-4 -mt-4">
        <View className="flex-row">
          <StatCard
            icon="📋"
            label="นัดหมายวันนี้"
            value={stats?.todayAppointments ?? 0}
            color="bg-blue-50"
          />
          <StatCard
            icon="✅"
            label="ตรวจแล้ว"
            value={stats?.completedToday ?? 0}
            color="bg-green-50"
          />
          <StatCard
            icon="⏳"
            label="รอยืนยัน"
            value={pendingCount?.count ?? 0}
            color="bg-orange-50"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-4 mt-4">
        <View className="bg-white rounded-2xl p-4 shadow-sm flex-row gap-2">
          <TouchableOpacity
            className="bg-blue-50 rounded-xl py-3 px-4 flex-1 items-center"
            onPress={() => router.push('/(tabs)/queue')}
          >
            <Text className="text-xl mb-1">🏥</Text>
            <Text className="text-xs font-medium text-gray-700">จัดการคิว</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-purple-50 rounded-xl py-3 px-4 flex-1 items-center"
            onPress={() => router.push('/(tabs)/patients')}
          >
            <Text className="text-xl mb-1">🔍</Text>
            <Text className="text-xs font-medium text-gray-700">ค้นหาผู้ป่วย</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-green-50 rounded-xl py-3 px-4 flex-1 items-center"
            onPress={() => router.push('/(tabs)/schedule')}
          >
            <Text className="text-xl mb-1">📅</Text>
            <Text className="text-xs font-medium text-gray-700">ตารางนัด</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Appointments */}
      <View className="px-4 mt-4 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold text-gray-900">นัดหมายวันนี้</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')}>
            <Text className="text-blue-800 text-sm font-medium">ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>
        {isLoading && (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Text className="text-gray-400">กำลังโหลด...</Text>
          </View>
        )}
        {!isLoading && (appointments?.length ?? 0) > 0 && (
          appointments!.map((apt: any) => (
            <ActiveAppointmentCard key={apt.id} appointment={apt} />
          ))
        )}
        {!isLoading && (appointments?.length ?? 0) <= 0 && (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Text className="text-4xl mb-2">✨</Text>
            <Text className="text-gray-500 text-center">ไม่มีนัดหมายวันนี้</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
