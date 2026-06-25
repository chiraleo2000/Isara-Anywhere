import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2, Sun, Moon, Globe } from 'lucide-react';

type ViewMode = 'login' | 'forgot-password' | 'reset-sent';

/** Compute all theme-dependent CSS classes at once */
const loginTv = (isDark: boolean, dark: string, light: string) => isDark ? dark : light;

function getLoginThemeClasses(theme: string) {
  const isDark = theme === 'dark';
  return {
    page: loginTv(isDark, 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900', 'bg-gradient-to-br from-emerald-50 via-white to-teal-50'),
    themeBtn: loginTv(isDark, 'bg-slate-700 text-yellow-400 hover:bg-slate-600', 'bg-white/80 text-gray-600 hover:bg-gray-100'),
    langBtn: loginTv(isDark, 'bg-slate-700 text-gray-200 hover:bg-slate-600', 'bg-white/80 text-gray-600 hover:bg-gray-100'),
    heading: loginTv(isDark, 'text-white', 'text-gray-800'),
    subtitle: loginTv(isDark, 'text-gray-400', 'text-gray-600'),
    card: loginTv(isDark, 'bg-slate-800 border border-slate-700', 'bg-white'),
    errorBg: loginTv(isDark, 'bg-red-900/30 border border-red-800 text-red-400', 'bg-red-50 border border-red-200 text-red-600'),
    successBg: loginTv(isDark, 'bg-green-900/30 border border-green-800 text-green-400', 'bg-green-50 border border-green-200 text-green-600'),
    label: loginTv(isDark, 'text-gray-300', 'text-gray-700'),
    icon: loginTv(isDark, 'text-gray-500', 'text-gray-400'),
    input: loginTv(isDark, 'bg-slate-700 border-slate-600 text-white placeholder-gray-400', 'border border-gray-200 text-gray-900'),
    eyeBtn: loginTv(isDark, 'text-gray-400 hover:text-gray-200', 'text-gray-400 hover:text-gray-600'),
    forgotLink: loginTv(isDark, 'text-emerald-400 hover:text-emerald-300', 'text-emerald-600 hover:text-emerald-700'),
    backBtn: loginTv(isDark, 'text-gray-400 hover:text-gray-200', 'text-gray-600 hover:text-gray-800'),
    iconBg: loginTv(isDark, 'bg-emerald-900/50', 'bg-emerald-100'),
    iconColor: loginTv(isDark, 'text-emerald-400', 'text-emerald-600'),
    warningBg: loginTv(isDark, 'bg-amber-900/30 border border-amber-800', 'bg-amber-50 border border-amber-200'),
    warningText: loginTv(isDark, 'text-amber-400', 'text-amber-800'),
    link: loginTv(isDark, 'text-emerald-400', 'text-emerald-600'),
    registerText: loginTv(isDark, 'text-gray-400', 'text-gray-600'),
  };
}

type LoginThemeClasses = ReturnType<typeof getLoginThemeClasses>;

/* ---- Extracted form sub-components ---- */

interface LoginFormProps {
  readonly tc: LoginThemeClasses;
  readonly email: string;
  readonly setEmail: (v: string) => void;
  readonly password: string;
  readonly setPassword: (v: string) => void;
  readonly showPassword: boolean;
  readonly setShowPassword: (v: boolean) => void;
  readonly loading: boolean;
  readonly handleLogin: (e: FormEvent) => void;
  readonly switchToForgotPassword: () => void;
  readonly t: (key: string) => string;
}

function LoginFormView({ tc, email, setEmail, password, setPassword, showPassword, setShowPassword, loading, handleLogin, switchToForgotPassword, t }: LoginFormProps) {
  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div>
        <label htmlFor="login-email" className={`block text-sm font-medium mb-1 ${tc.label}`}>{t('auth.email')}</label>
        <div className="relative">
          <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${tc.icon}`} />
          <input
            id="login-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${tc.input}`}
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="login-password" className={`block text-sm font-medium ${tc.label}`}>{t('auth.password')}</label>
          <button
            type="button"
            onClick={switchToForgotPassword}
            className={`text-sm hover:underline ${tc.forgotLink}`}
          >
            {t('auth.forgotPassword')}
          </button>
        </div>
        <div className="relative">
          <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${tc.icon}`} />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full pl-10 pr-12 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${tc.input}`}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${tc.eyeBtn}`}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('common.loading')}
          </>
        ) : (
          t('auth.login')
        )}
      </button>
    </form>
  );
}

interface ForgotPasswordFormProps {
  readonly tc: LoginThemeClasses;
  readonly email: string;
  readonly setEmail: (v: string) => void;
  readonly loading: boolean;
  readonly handleForgotPassword: (e: FormEvent) => void;
  readonly switchToLogin: () => void;
  readonly t: (key: string) => string;
}

function ForgotPasswordFormView({ tc, email, setEmail, loading, handleForgotPassword, switchToLogin, t }: ForgotPasswordFormProps) {
  return (
    <form onSubmit={handleForgotPassword} className="space-y-5">
      <button
        type="button"
        onClick={switchToLogin}
        className={`flex items-center gap-1 text-sm mb-4 ${tc.backBtn}`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      <div className="text-center mb-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${tc.iconBg}`}>
          <Mail className={`w-8 h-8 ${tc.iconColor}`} />
        </div>
        <h2 className={`text-lg font-semibold mb-2 ${tc.heading}`}>{t('auth.forgotPassword')}</h2>
        <p className={`text-sm ${tc.subtitle}`}>
          กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้คุณ
        </p>
      </div>

      <div>
        <label htmlFor="forgot-email" className={`block text-sm font-medium mb-1 ${tc.label}`}>{t('auth.email')}</label>
        <div className="relative">
          <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${tc.icon}`} />
          <input
            id="forgot-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${tc.input}`}
            placeholder="your@email.com"
            required
            autoComplete="email"
            autoFocus
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            กำลังส่ง...
          </>
        ) : (
          'ส่งลิงก์รีเซ็ตรหัสผ่าน'
        )}
      </button>
    </form>
  );
}

interface ResetSentViewProps {
  readonly tc: LoginThemeClasses;
  readonly email: string;
  readonly switchToLogin: () => void;
  readonly t: (key: string) => string;
}

function ResetSentView({ tc, email, switchToLogin, t }: ResetSentViewProps) {
  return (
    <div className="text-center py-4">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className={`text-xl font-semibold mb-2 ${tc.heading}`}>ตรวจสอบอีเมลของคุณ</h2>
      <p className={`mb-6 ${tc.subtitle}`}>
        เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยัง
        <br />
        <span className={`font-medium ${tc.heading}`}>{email}</span>
      </p>

      <div className={`rounded-lg p-4 mb-6 ${tc.warningBg}`}>
        <p className={`text-sm ${tc.warningText}`}>
          <strong>หมายเหตุ:</strong> ลิงก์จะหมดอายุภายใน 1 ชั่วโมง
          <br />
          หากไม่พบอีเมล กรุณาตรวจสอบโฟลเดอร์สแปม
        </p>
      </div>

      <button
        onClick={switchToLogin}
        className={`font-medium hover:underline ${tc.link}`}
      >
        {t('common.back')}
      </button>
    </div>
  );
}

/** Map viewMode to subtitle text */
const viewModeSubtitles: Record<ViewMode, (t: (k: string) => string) => string> = {
  'login': (t) => t('auth.login'),
  'forgot-password': (t) => t('auth.forgotPassword'),
  'reset-sent': () => 'ตรวจสอบอีเมลของคุณ',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();
  const { theme, language, toggleTheme, toggleLanguage, t } = useSettings();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('login');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setSuccess('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านของคุณ');
      setViewMode('login');
      searchParams.delete('registered');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Email validation
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle login
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password request
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email.trim()) {
        throw new Error('กรุณากรอกอีเมล');
      }

      if (!validateEmail(email)) {
        throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
      }

      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ไม่สามารถส่งคำขอรีเซ็ตรหัสผ่านได้');
      }

      setSuccess('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว');
      setViewMode('reset-sent');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  // Reset form state when switching views
  const switchToLogin = () => {
    setViewMode('login');
    setError('');
    setSuccess('');
  };

  const switchToForgotPassword = () => {
    setViewMode('forgot-password');
    setError('');
    setSuccess('');
  };

  const tc = getLoginThemeClasses(theme);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${tc.page}`}>
      {/* Theme and Language Toggle - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors ${tc.themeBtn} shadow-sm`}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleLanguage}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${tc.langBtn} shadow-sm`}
          title="Change Language"
        >
          <Globe className="w-5 h-5" />
          <span className="text-xs font-medium">{language === 'th' ? 'TH' : 'EN'}</span>
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <img
            src="/IzaraLogo.png"
            alt="Izara"
            className="w-20 h-20 mx-auto mb-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className={`text-2xl font-bold ${tc.heading}`}>Izara Patient Portal</h1>
          <p className={`mt-1 ${tc.subtitle}`}>
            {viewModeSubtitles[viewMode](t)}
          </p>
        </div>

        <div className={`rounded-2xl shadow-xl p-8 transition-colors duration-300 ${tc.card}`}>
          {/* Error Message */}
          {error && (
            <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 ${tc.errorBg}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 ${tc.successBg}`}>
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {viewMode === 'login' && (
            <LoginFormView
              tc={tc} email={email} setEmail={setEmail} password={password} setPassword={setPassword}
              showPassword={showPassword} setShowPassword={setShowPassword} loading={loading}
              handleLogin={handleLogin} switchToForgotPassword={switchToForgotPassword} t={t}
            />
          )}

          {viewMode === 'forgot-password' && (
            <ForgotPasswordFormView
              tc={tc} email={email} setEmail={setEmail} loading={loading}
              handleForgotPassword={handleForgotPassword} switchToLogin={switchToLogin} t={t}
            />
          )}

          {viewMode === 'reset-sent' && (
            <ResetSentView tc={tc} email={email} switchToLogin={switchToLogin} t={t} />
          )}

          {/* Register Link */}
          {viewMode === 'login' && (
            <div className="mt-6 text-center">
              <p className={tc.registerText}>
                {t('auth.noAccount')}{' '}
                <Link to="/register" className={`font-medium hover:underline ${tc.link}`}>
                  {t('auth.register')}
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm mt-6 text-gray-500">
          ข้อมูลของคุณได้รับการปกป้องตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
        </p>
      </div>
    </div>
  );
}
