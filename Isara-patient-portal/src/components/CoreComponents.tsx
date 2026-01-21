import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Appointment, Doctor, AppointmentStatus } from '../types';
import { Send, Mic, Paperclip, X, Clock, MapPin } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'purple' | 'red' | 'yellow' | 'green';
  trend?: { value: number; direction: 'up' | 'down' };
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
            </p>
          )}
        </div>
        <div className={`p-4 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

interface QuickActionButtonProps {
  label: string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'purple' | 'red';
  onClick: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ label, icon: Icon, color, onClick }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500 hover:bg-emerald-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    red: 'bg-red-500 hover:bg-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} text-white rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors hover:shadow-lg`}
    >
      <Icon className="w-8 h-8" />
      <span className="font-medium text-sm text-center">{label}</span>
    </button>
  );
};

interface UpcomingAppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
}

export const UpcomingAppointmentCard: React.FC<UpcomingAppointmentCardProps> = ({ appointment, onClick }) => {
  const statusColors: Record<AppointmentStatus, string> = {
    [AppointmentStatus.Pending]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    [AppointmentStatus.Confirmed]: 'bg-green-50 text-green-700 border-green-200',
    [AppointmentStatus.Completed]: 'bg-blue-50 text-blue-700 border-blue-200',
    [AppointmentStatus.Cancelled]: 'bg-red-50 text-red-700 border-red-200',
    [AppointmentStatus.InProgress]: 'bg-purple-50 text-purple-700 border-purple-200',
    [AppointmentStatus.NoShow]: 'bg-gray-50 text-gray-700 border-gray-200',
    [AppointmentStatus.Rescheduled]: 'bg-orange-50 text-orange-700 border-orange-200',
    [AppointmentStatus.InPool]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    [AppointmentStatus.AwaitingDoctorResponse]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };

  const statusLabels: Record<AppointmentStatus, string> = {
    [AppointmentStatus.Pending]: 'รอยืนยัน',
    [AppointmentStatus.Confirmed]: 'ยืนยันแล้ว',
    [AppointmentStatus.Completed]: 'เสร็จสิ้น',
    [AppointmentStatus.Cancelled]: 'ยกเลิก',
    [AppointmentStatus.InProgress]: 'กำลังดำเนินการ',
    [AppointmentStatus.NoShow]: 'ไม่มาตามนัด',
    [AppointmentStatus.Rescheduled]: 'เลื่อนนัดแล้ว',
    [AppointmentStatus.InPool]: 'รอจัดสรรแพทย์',
    [AppointmentStatus.AwaitingDoctorResponse]: 'รอแพทย์ตอบรับ',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <img
          src={appointment.doctorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(appointment.doctorId)}`}
          alt={appointment.doctorName}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">{appointment.doctorName}</h3>
              <p className="text-sm text-gray-600">{appointment.doctorSpecialty}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[appointment.status]}`}>
              {statusLabels[appointment.status]}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
            <span>📅 {new Date(appointment.date).toLocaleDateString('th-TH', { 
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}</span>
            <span>🕐 {appointment.appointmentTime}</span>
          </div>
          {appointment.reason && (
            <p className="mt-2 text-sm text-gray-600">เหตุผล: {appointment.reason}</p>
          )}
        </div>
      </div>
    </div>
  );
};

interface HealthMetricCardProps {
  label: string;
  value: string | number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  icon?: string;
}

export const HealthMetricCard: React.FC<HealthMetricCardProps> = ({ label, value, unit, status, icon }) => {
  const statusColors = {
    normal: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50',
  };

  const statusIndicators = {
    normal: '✓',
    warning: '⚠',
    critical: '✗',
  };

  const statusTextColors = {
    normal: 'text-green-700',
    warning: 'text-yellow-700',
    critical: 'text-red-700',
  };

  return (
    <div className={`border-2 rounded-xl p-4 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-xl ${statusTextColors[status]}`}>{icon || statusIndicators[status]}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-800">{value}</span>
        <span className="text-sm text-gray-600">{unit}</span>
      </div>
    </div>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'emerald' | 'blue' | 'white';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color = 'emerald' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const colorClasses = {
    emerald: 'border-emerald-600',
    blue: 'border-blue-600',
    white: 'border-white',
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`} />
  );
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <Icon className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-center mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, title, message, onClose }) => {
  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`border rounded-lg p-4 ${typeStyles[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{icons[type]}</span>
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className={`relative bg-white rounded-2xl shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden`}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-2xl text-gray-500">×</span>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TabsProps {
  tabs: { id: string; label: string; icon?: LucideIcon }[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {Icon && <Icon className="w-5 h-5" />}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading,
  placeholder = 'พิมพ์ข้อความ...',
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl border border-gray-200">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-emerald-100' : 'text-gray-500'}`}>
                {new Date(message.timestamp).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={loading}
          />
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

interface AppointmentListProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  emptyMessage?: string;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  onAppointmentClick,
  emptyMessage = 'ไม่มีการนัดหมาย',
}) => {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <UpcomingAppointmentCard
          key={appointment.id}
          appointment={appointment}
          onClick={() => onAppointmentClick(appointment)}
        />
      ))}
    </div>
  );
};

interface DoctorCardProps {
  doctor: Doctor;
  onSelect: (doctor: Doctor) => void;
  showBookButton?: boolean;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onSelect, showBookButton = true }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <img
          src={doctor.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(doctor.id)}`}
          alt={doctor.name}
          className="w-20 h-20 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{doctor.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{doctor.specialty}</p>
          
          {doctor.hospital && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <MapPin className="w-4 h-4" />
              <span>{doctor.hospital}</span>
            </div>
          )}
          
          {doctor.experience && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              <span>ประสบการณ์ {doctor.experience}</span>
            </div>
          )}

          {doctor.rating && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-yellow-500">★</span>
              <span className="text-sm font-medium text-gray-700">{doctor.rating.toFixed(1)}</span>
            </div>
          )}

          {doctor.consultationFee && (
            <p className="text-emerald-600 font-semibold mt-2">
              ค่าปรึกษา: ฿{doctor.consultationFee.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {showBookButton && (
        <button
          onClick={() => onSelect(doctor)}
          className="w-full mt-4 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          จองนัดหมาย
        </button>
      )}
    </div>
  );
};

interface FormFieldProps {
  label: string;
  type?: 'text' | 'email' | 'tel' | 'date' | 'time' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  icon?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  error,
  options,
  rows = 4,
  icon,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">เลือก{label}</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={`w-full ${icon ? 'pl-10' : ''} px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

interface TimelineItemProps {
  date: Date;
  title: string;
  description: string;
  type: 'diagnosis' | 'treatment' | 'medication' | 'lab' | 'imaging' | 'consultation';
  icon?: React.ReactNode;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ date, title, description, type, icon }) => {
  const typeColors = {
    diagnosis: 'bg-red-100 text-red-600',
    treatment: 'bg-blue-100 text-blue-600',
    medication: 'bg-green-100 text-green-600',
    lab: 'bg-purple-100 text-purple-600',
    imaging: 'bg-yellow-100 text-yellow-600',
    consultation: 'bg-emerald-100 text-emerald-600',
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeColors[type]}`}>
          {icon || '●'}
        </div>
        <div className="w-px h-full bg-gray-300 mt-2" />
      </div>

      <div className="flex-1 pb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-800">{title}</h4>
            <span className="text-sm text-gray-500">
              {date.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
};

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, actions, className = '' }) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      {(title || subtitle || actions) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'emerald' | 'blue' | 'red' | 'yellow';
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'emerald',
  showLabel = true,
  label,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    emerald: 'bg-emerald-600',
    blue: 'bg-blue-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
  };

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-medium text-gray-700">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'ค้นหา...',
  onSearch,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.();
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        🔍
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </form>
  );
};
