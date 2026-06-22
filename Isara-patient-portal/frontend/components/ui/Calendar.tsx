import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

/** Get day-of-week color class (Sunday=red, Saturday=blue, else gray) */
const getDayColor = (dayIndex: number): string => {
  if (dayIndex === 0) return 'text-red-500';
  if (dayIndex === 6) return 'text-blue-500';
  return 'text-gray-600';
};

/** Compute CSS class for a calendar day button (extracted to reduce cognitive complexity) */
function getDayButtonClass(_date: Date, isDisabledDay: boolean, isSelectedDay: boolean, isTodayDay: boolean, isHighlightedDay: boolean): string {
  const parts = ['w-full h-full p-2 rounded-lg transition-all text-left'];
  if (isDisabledDay) {
    parts.push('opacity-30 cursor-not-allowed');
  } else {
    parts.push('hover:bg-emerald-50');
  }
  if (isSelectedDay) {
    parts.push('bg-emerald-600 text-white hover:bg-emerald-700');
  }
  if (isTodayDay && !isSelectedDay) {
    parts.push('ring-2 ring-emerald-500 ring-offset-1');
  }
  if (isHighlightedDay && !isSelectedDay) {
    parts.push('bg-yellow-50');
  }
  return parts.join(' ');
}

/** Compute CSS class for the day number text */
function getDayTextClass(date: Date, isSelectedDay: boolean): string {
  const parts = ['text-sm font-medium block'];
  if (isSelectedDay) {
    parts.push('text-white');
  } else if (date.getDay() === 0) {
    parts.push('text-red-500');
  } else if (date.getDay() === 6) {
    parts.push('text-blue-500');
  }
  return parts.join(' ');
}

/** Compute CSS class for a time-slot button */
function getTimeSlotClass(isAvailable: boolean, isSelected: boolean): string {
  if (!isAvailable) {
    return 'py-2 px-3 rounded-lg text-sm font-medium transition-all bg-gray-100 text-gray-400 cursor-not-allowed line-through';
  }
  if (isSelected) {
    return 'py-2 px-3 rounded-lg text-sm font-medium transition-all bg-emerald-600 text-white shadow-md';
  }
  return 'py-2 px-3 rounded-lg text-sm font-medium transition-all bg-white border border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-600';
}

/** Compute CSS class for a weekly-grid slot button */
function getWeeklySlotClass(available: boolean, selected: boolean): string {
  if (!available) {
    return 'w-full h-10 rounded-lg text-xs font-medium transition-all bg-gray-50 text-gray-300 cursor-not-allowed';
  }
  if (selected) {
    return 'w-full h-10 rounded-lg text-xs font-medium transition-all bg-emerald-600 text-white shadow-md';
  }
  return 'w-full h-10 rounded-lg text-xs font-medium transition-all bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200';
}

/** Compute label for a weekly-grid slot */
function getWeeklySlotLabel(available: boolean, selected: boolean): string {
  if (!available) return '-';
  if (selected) return '✓';
  return 'ว่าง';
}

interface TimeSlot {
  time: string;
  available: boolean;
  doctorId?: string;
  doctorName?: string;
}

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  selectedTime?: string;
  onTimeSelect?: (time: string, slot?: TimeSlot) => void;
  availableSlots?: Record<string, TimeSlot[]>;
  minDate?: Date;
  maxDate?: Date;
  highlightDates?: Date[];
  showTimeSlots?: boolean;
  className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  onDateSelect,
  selectedTime,
  onTimeSelect,
  availableSlots = {},
  minDate = new Date(),
  maxDate,
  highlightDates = [],
  showTimeSlots = true,
  className = '',
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let i = 1; i <= lastDate; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentMonth]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  const isDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    
    return false;
  };

  const hasSlots = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const slots = availableSlots[dateStr];
    return slots?.some(s => s.available) ?? false;
  };

  const isHighlighted = (date: Date) => {
    return highlightDates.some(d => d.toDateString() === date.toDateString());
  };

  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return availableSlots[dateStr] || [];
  }, [selectedDate, availableSlots]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
        <div className="flex items-center justify-between text-white">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear() + 543}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {dayNames.map((day, i) => (
          <div
            key={day}
            className={`py-3 text-center text-sm font-medium ${getDayColor(i)}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {daysInMonth.map((date, index) => (
          <div
            key={date?.toISOString() ?? `empty-${index}`}
            className={`
              bg-white min-h-[60px] p-1
              ${date ? 'cursor-pointer' : ''}
            `}
          >
            {date && (
              <button
                onClick={() => !isDisabled(date) && onDateSelect(date)}
                disabled={isDisabled(date)}
                className={getDayButtonClass(date, isDisabled(date), isSelected(date), isToday(date), isHighlighted(date))}
              >
                <span className={getDayTextClass(date, isSelected(date))}>
                  {date.getDate()}
                </span>
                {hasSlots(date) && !isSelected(date) && (
                  <div className="mt-1 flex gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Time Slots */}
      {showTimeSlots && selectedDate && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            เลือกเวลานัด - {selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          
          {selectedDateSlots.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              ไม่มีช่วงเวลาว่างในวันนี้
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {selectedDateSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && onTimeSelect?.(slot.time, slot)}
                  disabled={!slot.available}
                  className={getTimeSlotClass(slot.available, selectedTime === slot.time)}
                >
                  {slot.time}
                  {slot.doctorName && slot.available && (
                    <span className="block text-xs opacity-75 truncate">
                      {slot.doctorName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Weekly View Calendar Component
interface WeeklyCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  selectedTime?: string;
  onTimeSelect?: (time: string) => void;
  doctorSchedule?: Record<string, string[]>; // day -> available times
  bookedSlots?: Record<string, string[]>; // date -> booked times
  className?: string;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  selectedDate,
  onDateSelect,
  selectedTime,
  onTimeSelect,
  doctorSchedule = {},
  bookedSlots = {},
  className = '',
}) => {
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    return new Date(today.setDate(today.getDate() - day));
  });

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekStart]);

  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
  
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00'
  ];

  const prevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const nextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const isSlotAvailable = (date: Date, time: string) => {
    const dayName = dayNames[date.getDay()];
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if doctor works this day/time
    const daySchedule = doctorSchedule[dayName] || [];
    if (!daySchedule.includes(time)) return false;
    
    // Check if slot is already booked
    const booked = bookedSlots[dateStr] || [];
    if (booked.includes(time)) return false;
    
    // Check if date is in the past
    const now = new Date();
    const slotDateTime = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    slotDateTime.setHours(hours, minutes, 0, 0);
    if (slotDateTime < now) return false;
    
    return true;
  };

  const isSelected = (date: Date, time: string) => {
    return selectedDate?.toDateString() === date.toDateString() && selectedTime === time;
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
        <div className="flex items-center justify-between text-white">
          <button
            onClick={prevWeek}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {weekDays[0].toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
          </h2>
          <button
            onClick={nextWeek}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-3 bg-gray-50 text-center text-sm font-medium text-gray-600">
              เวลา
            </div>
            {weekDays.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={date.toISOString()}
                  className={`p-3 text-center ${isToday ? 'bg-emerald-50' : 'bg-gray-50'}`}
                >
                  <div className={`text-xs font-medium ${getDayColor(i)}`}>
                    {dayNames[i]}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Slots */}
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-8 border-b border-gray-100">
              <div className="p-2 text-center text-sm text-gray-500 bg-gray-50 flex items-center justify-center">
                {time}
              </div>
              {weekDays.map((date) => {
                const available = isSlotAvailable(date, time);
                const selected = isSelected(date, time);
                
                return (
                  <div key={date.toISOString()} className="p-1">
                    <button
                      onClick={() => {
                        if (available) {
                          onDateSelect(date);
                          onTimeSelect?.(time);
                        }
                      }}
                      disabled={!available}
                      className={getWeeklySlotClass(available, selected)}
                    >
                      {getWeeklySlotLabel(available, selected)}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
