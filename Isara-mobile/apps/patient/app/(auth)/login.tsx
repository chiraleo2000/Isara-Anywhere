import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithBiometric, hasBiometricCredentials } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'เข้าสู่ระบบไม่สำเร็จ',
        error.message || 'กรุณาตรวจสอบอีเมลและรหัสผ่านของคุณ'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('ไม่รองรับ', 'อุปกรณ์ของคุณไม่รองรับการยืนยันตัวตนด้วยไบโอเมตริกซ์');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'เข้าสู่ระบบด้วยไบโอเมตริกซ์',
        cancelLabel: 'ยกเลิก',
        disableDeviceFallback: false,
        fallbackLabel: 'ใช้รหัสผ่าน',
      });

      if (result.success) {
        await loginWithBiometric();
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('ข้อผิดพลาด', error.message || 'การยืนยันตัวตนล้มเหลว');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-8">
          {/* Logo */}
          <View className="items-center mb-8">
            <Image
              source={require('../../assets/icon.png')}
              className="w-24 h-24 mb-4"
              resizeMode="contain"
            />
            <Text className="text-3xl font-bold text-sky-600">Izara Patient</Text>
            <Text className="text-gray-500 mt-2 text-base">เข้าสู่ระบบเพื่อดำเนินการต่อ</Text>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">อีเมล</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</Text>
            <View className="relative">
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50 pr-12"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                className="absolute right-3 top-3"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text className="text-sky-600 text-sm font-medium">
                  {showPassword ? 'ซ่อน' : 'แสดง'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity className="mb-6">
              <Text className="text-sky-600 text-sm text-right">ลืมรหัสผ่าน?</Text>
            </TouchableOpacity>
          </Link>

          {/* Login Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center mb-4 ${
              isLoading ? 'bg-sky-300' : 'bg-sky-500'
            }`}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text className="text-white font-semibold text-base">
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Text>
          </TouchableOpacity>

          {/* Biometric Login */}
          {hasBiometricCredentials && (
            <TouchableOpacity
              className="rounded-xl py-4 items-center mb-6 border border-sky-500"
              onPress={handleBiometricLogin}
            >
              <Text className="text-sky-600 font-semibold text-base">
                🔐 เข้าสู่ระบบด้วยไบโอเมตริกซ์
              </Text>
            </TouchableOpacity>
          )}

          {/* Register Link */}
          <View className="flex-row justify-center">
            <Text className="text-gray-500">ยังไม่มีบัญชี? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-sky-600 font-semibold">สมัครสมาชิก</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
