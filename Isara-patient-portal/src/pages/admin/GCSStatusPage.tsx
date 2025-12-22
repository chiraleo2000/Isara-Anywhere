import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cloud, CheckCircle2, XCircle, RefreshCw, ArrowLeft,
  Database, Users, UserCog, Calendar, FileText, Loader2
} from 'lucide-react';
import api from '../../lib/api';

interface BucketStatus {
  name: string;
  bucket: string;
  connected: boolean;
  error?: string;
}

interface GCSHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  buckets: BucketStatus[];
  error?: string;
}

const BUCKET_ICONS: Record<string, any> = {
  AUTH: Users,
  PATIENT: Database,
  DOCTOR: UserCog,
  APPOINTMENTS: Calendar,
  METADATA: FileText,
};

const BUCKET_DESCRIPTIONS: Record<string, string> = {
  AUTH: 'ข้อมูลผู้ใช้และ Sessions',
  PATIENT: 'ข้อมูลสุขภาพผู้ป่วย (PHR)',
  DOCTOR: 'ข้อมูลแพทย์และโปรไฟล์',
  APPOINTMENTS: 'การนัดหมายและจองคิว',
  METADATA: 'ข้อมูลระบบและการตั้งค่า',
};

export default function GCSStatusPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<GCSHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkGCSStatus = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await api.get<GCSHealthResponse>('/api/health/gcs');
      setStatus(response);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเชื่อมต่อกับ API Server');
      setStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkGCSStatus();
  }, []);

  const getStatusBadge = () => {
    if (!status) return null;
    
    const statusColors = {
      healthy: 'bg-green-100 text-green-800 border-green-200',
      degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      unhealthy: 'bg-red-100 text-red-800 border-red-200',
    };

    const statusText = {
      healthy: 'ปกติ',
      degraded: 'บางส่วน',
      unhealthy: 'ขัดข้อง',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[status.status]}`}>
        {statusText[status.status]}
      </span>
    );
  };

  const connectedCount = status?.buckets.filter(b => b.connected).length || 0;
  const totalCount = status?.buckets.length || 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Cloud className="w-7 h-7 text-blue-600" />
                สถานะ Google Cloud Storage
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                ตรวจสอบการเชื่อมต่อ GCS Buckets ทั้ง 5 รายการ
              </p>
            </div>
          </div>
          <button
            onClick={() => checkGCSStatus(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>

        {/* Status Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">สถานะโดยรวม</h2>
              {status && (
                <p className="text-gray-500 text-sm">
                  อัพเดทล่าสุด: {new Date(status.timestamp).toLocaleString('th-TH')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              ) : (
                <>
                  <span className="text-2xl font-bold text-gray-800">
                    {connectedCount}/{totalCount}
                  </span>
                  {getStatusBadge()}
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!loading && status && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    connectedCount === totalCount 
                      ? 'bg-green-500' 
                      : connectedCount > 0 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${(connectedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">ไม่สามารถเชื่อมต่อได้</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                กรุณาตรวจสอบว่า API Server กำลังทำงานอยู่ที่ port 3004
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bucket List */}
        {!loading && status && (
          <div className="space-y-4">
            {status.buckets.map((bucket) => {
              const Icon = BUCKET_ICONS[bucket.name] || Database;
              return (
                <div
                  key={bucket.name}
                  className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all ${
                    bucket.connected 
                      ? 'border-green-100 hover:border-green-200' 
                      : 'border-red-100 hover:border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      bucket.connected ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        bucket.connected ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{bucket.name}</h3>
                      <p className="text-sm text-gray-500">
                        {BUCKET_DESCRIPTIONS[bucket.name]}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        gs://{bucket.bucket}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {bucket.connected ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <span className="text-sm font-medium text-green-600">เชื่อมต่อแล้ว</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-500" />
                          <span className="text-sm font-medium text-red-600">ไม่สามารถเชื่อมต่อ</span>
                        </>
                      )}
                    </div>
                  </div>
                  {bucket.error && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">{bucket.error}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-semibold text-blue-800 mb-2">ข้อมูลเพิ่มเติม</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong>AUTH</strong>: เก็บข้อมูลผู้ใช้, รหัสผ่าน (hashed), และ session tokens</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong>PATIENT</strong>: เก็บข้อมูลสุขภาพ (PHR), ประวัติการรักษา, ผลแล็บ</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong>DOCTOR</strong>: เก็บข้อมูลแพทย์, ตารางเวลา, ความเชี่ยวชาญ</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong>APPOINTMENTS</strong>: เก็บข้อมูลการนัดหมาย, ประวัติการจอง</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong>METADATA</strong>: เก็บข้อมูลระบบ, สาขาแพทย์, โรงพยาบาล</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
