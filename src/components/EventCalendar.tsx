import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';

export interface EventCalendarProps {
  mode?: 'all' | 'store-only' | 'performance-only';
}

export type EventCategory = 'leave' | 'base' | 'performance' | 'merch' | 'birthday' | 'regular' | 'other';

interface CalendarEvent {
  title: string;
  subtitle: string;
  category: EventCategory;
}

interface MonthDay {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  dayName: string;
}

// Format Date object to YYYY-MM-DD local date string
const getLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Generate month days for a 42-cell grid
const getMonthDays = (referenceDate: Date): MonthDay[] => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed

  // First day of current month
  const firstDayOfMonth = new Date(year, month, 1);
  // Get day of week for the 1st of the month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  let firstDayOfWeek = firstDayOfMonth.getDay();
  // Adjust so that 0 = Monday, ..., 6 = Sunday
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Number of days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Number of days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthDaysList: MonthDay[] = [];
  const todayStr = getLocalDateString(new Date());
  const dayNames = ['一', '二', '三', '四', '五', '六', '日'];

  // Previous month fill-in days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDayNum = daysInPrevMonth - i;
    const d = new Date(year, month - 1, prevDayNum);
    const dateStr = getLocalDateString(d);
    const dayOfWeek = (firstDayOfWeek - 1 - i + 7) % 7;
    monthDaysList.push({
      dateStr,
      dayNum: prevDayNum,
      isToday: dateStr === todayStr,
      isCurrentMonth: false,
      dayName: dayNames[dayOfWeek],
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = getLocalDateString(d);
    const dayOfWeek = (firstDayOfWeek + i - 1) % 7;
    monthDaysList.push({
      dateStr,
      dayNum: i,
      isToday: dateStr === todayStr,
      isCurrentMonth: true,
      dayName: dayNames[dayOfWeek],
    });
  }

  // Next month fill-in days to complete the 6-row grid (42 cells)
  const remainingCells = 42 - monthDaysList.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = getLocalDateString(d);
    const dayOfWeek = (firstDayOfWeek + daysInMonth + i - 1) % 7;
    monthDaysList.push({
      dateStr,
      dayNum: i,
      isToday: dateStr === todayStr,
      isCurrentMonth: false,
      dayName: dayNames[dayOfWeek],
    });
  }

  return monthDaysList;
};

// Colors mapping matching specified criteria
export const CATEGORY_COLORS: Record<EventCategory, { hex: string, label: string, desc: string }> = {
  leave: { hex: '#F08080', label: '成員請假', desc: '成員公休與自主練習日' },       // Red
  base: { hex: '#FFB347', label: '店面活動', desc: '居酒屋店面與實體基地特別企劃' }, // Orange
  performance: { hex: '#FFFF00', label: '公演相關', desc: 'Live舞台、先行直播與公演' }, // Yellow
  merch: { hex: '#7CFC00', label: '特別物販', desc: '官方快閃周邊與特典販售' },    // Green
  birthday: { hex: '#9ADDFF', label: '生日會直播', desc: '團體成員線上慶生特番' },  // Blue
  regular: { hex: '#D1B3FF', label: '常駐活動', desc: '每週居酒屋固定主題之夜' },   // Purple
  other: { hex: '#4C5E6E', label: '其他資訊', desc: '系統維護、最新公告與說明' },   // Gray-blue
};

// Highlight/emphasized rule logic
export const isCategoryHighlighted = (category: EventCategory, mode: 'all' | 'store-only' | 'performance-only'): boolean => {
  if (mode === 'all') {
    return true; // Main calendar displays all colors!
  }
  
  if (mode === 'store-only') {
    // 店面活動、特別物販、常駐活動 顯示為彩色
    return category === 'base' || category === 'merch' || category === 'regular';
  }
  
  if (mode === 'performance-only') {
    // 公演相關、特別物販 顯示為彩色
    return category === 'performance' || category === 'merch';
  }
  
  return false;
};

// Unified official schedule database
const EVENTS: Record<string, CalendarEvent | CalendarEvent[]> = {
  '2026-07-14': {
    title: '酸欠像素偶像居酒屋 開始試營運',
    subtitle: 'Official Soft Opening of Oxygen-deficient Pixel Idol Izakaya',
    category: 'base',
  },
  '2026-07-16': [
    {
      title: '涼海璃請假',
      subtitle: 'Umiri on Leave (Member Absence)',
      category: 'leave',
    },
    {
      title: '居酒屋暫停營業',
      subtitle: 'Izakaya Closed (Temporary Suspension)',
      category: 'other',
    }
  ],
  '2026-08-10': [
    {
      title: '涼海璃請假',
      subtitle: 'Umiri on Leave (Member Absence)',
      category: 'leave',
    },
    {
      title: '居酒屋暫停營業',
      subtitle: 'Izakaya Closed (Temporary Suspension)',
      category: 'other',
    }
  ],
  '2026-08-21': {
    title: '涼海すう生日同好會',
    subtitle: 'Suzumi Suu Birthday Gathering (Store Event)',
    category: 'base',
  },
  '2026-08-22': {
    title: '涼海すう生日同好會',
    subtitle: 'Suzumi Suu Birthday Gathering (Store Event)',
    category: 'base',
  },
  '2026-08-23': {
    title: '涼海すう生日同好會',
    subtitle: 'Suzumi Suu Birthday Gathering (Store Event)',
    category: 'base',
  }
};

export const getEventsForDate = (dateStr: string): CalendarEvent[] => {
  const list: CalendarEvent[] = [];
  const val = EVENTS[dateStr];
  if (val) {
    if (Array.isArray(val)) {
      list.push(...val);
    } else {
      list.push(val);
    }
  } else {
    // Fallback: match by MM-DD if exact year string is not found
    const monthDay = dateStr.slice(5);
    const matchedKey = Object.keys(EVENTS).find(k => k.slice(5) === monthDay);
    if (matchedKey) {
      const fallbackVal = EVENTS[matchedKey];
      if (Array.isArray(fallbackVal)) {
        list.push(...fallbackVal);
      } else {
        list.push(fallbackVal);
      }
    }
  }

  return list;
};

export const EventCalendar: React.FC<EventCalendarProps> = ({ mode = 'all' }) => {
  const activeMode = mode as 'all' | 'store-only' | 'performance-only';
  const todayDate = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(todayDate);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(todayDate));

  const monthDays = getMonthDays(currentDate);

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const targetDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
      // Auto select the first event of the navigated month if any exists
      const foundEventDate = Object.keys(EVENTS).find(dateKey => {
        return dateKey.startsWith(`${targetYear}-${targetMonth}`);
      });
      if (foundEventDate) {
        setSelectedDate(foundEventDate);
      } else {
        setSelectedDate(`${targetYear}-${targetMonth}-01`);
      }
      return targetDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const targetDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
      // Auto select the first event of the navigated month if any exists
      const foundEventDate = Object.keys(EVENTS).find(dateKey => {
        return dateKey.startsWith(`${targetYear}-${targetMonth}`);
      });
      if (foundEventDate) {
        setSelectedDate(foundEventDate);
      } else {
        setSelectedDate(`${targetYear}-${targetMonth}-01`);
      }
      return targetDate;
    });
  };

  const getSelectedDateInfo = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month - 1, day);
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      return {
        month,
        day,
        dayName: dayNames[dateObj.getDay()],
      };
    } catch (e) {
      return null;
    }
  };

  const selectedInfo = getSelectedDateInfo(selectedDate);
  const selectedEvents = getEventsForDate(selectedDate);

  // Border theme based on the active mode of the calendar
  const getThemeLaserBorderColor = () => {
    if (activeMode === 'store-only') return 'border-[#FFB347]';
    if (activeMode === 'performance-only') return 'border-[#FFFF00]';
    return 'border-[#87CEEB]';
  };

  const getThemeShadow = () => {
    if (activeMode === 'store-only') return 'shadow-[0_0_50px_rgba(255,179,71,0.08)]';
    if (activeMode === 'performance-only') return 'shadow-[0_0_50px_rgba(255,255,0,0.05)]';
    return 'shadow-[0_0_50px_rgba(135,206,235,0.08)]';
  };

  return (
    <div 
      id="event-calendar-container" 
      className={`flex flex-col w-full bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-12 relative overflow-hidden group/cal ${getThemeShadow()}`}
    >
      {/* Laser line styles on container */}
      <div className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 ${getThemeLaserBorderColor()}`} />
      <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 ${getThemeLaserBorderColor()}`} />
      <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 ${getThemeLaserBorderColor()}`} />
      <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 ${getThemeLaserBorderColor()}`} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-5">
          <CalendarIcon className={`w-7 h-7 ${activeMode === 'performance-only' ? 'text-[#FFFF00]' : activeMode === 'store-only' ? 'text-[#FFB347]' : 'text-[#87CEEB]'}`} />
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-[0.1em]">
              {activeMode === 'all' ? '紡塊像素活動日曆' : activeMode === 'store-only' ? '官方基地小活動' : '公演時間表'}
            </h3>
            <p className="text-xs sm:text-sm text-white/40 font-mono tracking-wider uppercase font-black">
              CUBELENDAR~
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5 shrink-0 self-stretch sm:self-auto justify-between">
          <button 
            onClick={handlePrevMonth}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-lg font-bold"
          >
            ←
          </button>
          <span className="text-sm sm:text-base font-mono font-black text-white/80 tracking-widest px-6 select-none">
            {currentDate.getFullYear()} . {String(currentDate.getMonth() + 1).padStart(2, '0')}
          </span>
          <button 
            onClick={handleNextMonth}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-lg font-bold"
          >
            →
          </button>
        </div>
      </div>

      {/* Category Legend Panel with Dynamic Grayscale Indicators */}
      {activeMode === 'all' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8 bg-white/5 border border-white/5 rounded-2xl p-4">
          {(Object.keys(CATEGORY_COLORS) as EventCategory[]).map((cat) => {
            const colorInfo = CATEGORY_COLORS[cat];
            const isHighlighted = isCategoryHighlighted(cat, activeMode);
            return (
              <div 
                key={cat} 
                className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${
                  isHighlighted ? 'opacity-100 bg-white/5 border border-white/10' : 'opacity-25 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ 
                      backgroundColor: isHighlighted ? colorInfo.hex : '#888888',
                      boxShadow: isHighlighted ? `0 0 8px ${colorInfo.hex}` : 'none'
                    }} 
                  />
                  <span className="text-[11px] font-black text-white/90 tracking-wider">
                    {colorInfo.label}
                  </span>
                </div>
                {!isHighlighted && (
                  <span className="text-[9px] text-white/40 text-center leading-normal">
                    灰階顯示
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4 text-center border-b border-white/5 pb-3">
        {['一', '二', '三', '四', '五', '六', '日'].map(dayName => (
          <div key={dayName} className="text-xs sm:text-sm md:text-base font-black text-white/40 font-mono tracking-wider uppercase py-1">
            {dayName}
          </div>
        ))}
      </div>

      {/* Monthly Days Grid */}
      <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-8">
        {monthDays.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          const dayEvents = getEventsForDate(day.dateStr);
          const hasEvent = dayEvents.length > 0;
          
          // Find primary or highlighted event
          const highlightedEvent = dayEvents.find(e => isCategoryHighlighted(e.category, activeMode));
          const primaryEvent = highlightedEvent || dayEvents[0];
          
          const colorInfo = hasEvent && primaryEvent ? CATEGORY_COLORS[primaryEvent.category] : null;
          const isHighlighted = !!highlightedEvent;

          // Determine button style & inline style
          let buttonStyle = "";
          let inlineStyle: React.CSSProperties = {};
          
          if (isSelected) {
            if (hasEvent && colorInfo) {
              if (isHighlighted) {
                buttonStyle = 'text-white border-2 scale-105 z-10';
                inlineStyle = {
                  borderColor: colorInfo.hex,
                  backgroundColor: `${colorInfo.hex}33`,
                  boxShadow: `0 0 20px ${colorInfo.hex}66`,
                };
              } else {
                buttonStyle = 'text-white/60 border-2 scale-105 z-10 border-white/20 bg-white/10';
                inlineStyle = {
                  boxShadow: '0 0 15px rgba(255,255,255,0.1)',
                };
              }
            } else {
              buttonStyle = 'bg-white/15 text-white border-2 border-white/30 scale-105 z-10';
            }
          } else if (day.isToday) {
            if (hasEvent && colorInfo && isHighlighted) {
              buttonStyle = 'border-2 hover:scale-105 z-10 transition-all duration-300';
              inlineStyle = {
                borderColor: colorInfo.hex,
                backgroundColor: `${colorInfo.hex}22`,
                color: colorInfo.hex,
                boxShadow: `0 0 15px ${colorInfo.hex}33`,
              };
            } else {
              buttonStyle = 'bg-white/10 text-white border border-white/30';
            }
          } else if (hasEvent && colorInfo) {
            if (isHighlighted) {
              buttonStyle = 'border hover:scale-105 z-10 transition-all duration-300';
              inlineStyle = {
                borderColor: `${colorInfo.hex}40`,
                backgroundColor: `${colorInfo.hex}15`,
                color: colorInfo.hex,
                boxShadow: `0 0 10px ${colorInfo.hex}1a`,
              };
            } else {
              // Grayscale/muted style
              buttonStyle = 'bg-white/5 text-white/25 border border-white/5 hover:bg-white/10 hover:text-white/40';
            }
          } else {
            buttonStyle = day.isCurrentMonth
              ? 'text-white/70 hover:bg-white/5 hover:text-white border border-transparent'
              : 'text-white/20 hover:bg-white/5 border border-transparent';
          }

          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`
                flex flex-col items-center py-3 sm:py-5 rounded-2xl transition-all duration-300 relative min-h-[55px] sm:min-h-[80px] justify-center
                ${buttonStyle}
              `}
              style={inlineStyle}
            >
              <span className="text-sm sm:text-xl md:text-2xl font-black font-mono">{day.dayNum}</span>
              {day.isToday && (
                <span className="absolute top-2 sm:top-3 right-2 sm:right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
              {hasEvent && !day.isToday && (
                <div className="absolute bottom-1.5 sm:bottom-2.5 flex justify-center gap-1">
                  {dayEvents.slice(0, 3).map((ev, idx) => {
                    const evColor = CATEGORY_COLORS[ev.category];
                    const evHighlighted = isCategoryHighlighted(ev.category, activeMode);
                    return (
                      <span 
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full animate-pulse" 
                        style={{
                          backgroundColor: evHighlighted ? evColor.hex : 'rgba(255,255,255,0.2)',
                          boxShadow: evHighlighted ? `0 0 6px ${evColor.hex}` : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day info */}
      <div className="border-t border-white/5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center justify-center py-8 px-6 bg-white/5 rounded-2xl border border-white/5 text-center min-h-[140px]"
          >
            {selectedEvents.length > 0 ? (
              <div className="w-full flex flex-col gap-4">
                {selectedEvents.map((ev, index) => {
                  const category = ev.category;
                  const colorInfo = CATEGORY_COLORS[category];
                  const isHighlighted = isCategoryHighlighted(category, activeMode);
                  
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center w-full"
                    >
                      {isHighlighted ? (
                        <>
                          <Sparkles className="w-6 h-6 mb-2 animate-pulse" style={{ color: colorInfo.hex }} />
                          <p className="text-base sm:text-xl font-black tracking-[0.1em] select-none" style={{ color: colorInfo.hex, filter: `drop-shadow(0 0 10px ${colorInfo.hex}40)` }}>
                            {ev.title}
                          </p>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6 text-white/20 mb-2" />
                          <p className="text-base sm:text-xl font-black text-white/40 tracking-[0.1em] select-none">
                            {ev.title}
                          </p>
                          <p className="text-xs text-white/40 mt-1 font-bold tracking-wider font-mono">
                            【{colorInfo.label}】
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
                <div className="mt-2 text-xs text-white/40 font-bold tracking-widest font-mono text-center">
                  ★ {selectedInfo ? `${selectedInfo.month} 月 ${selectedInfo.day} 日 (星期${selectedInfo.dayName})` : ''} ★
                </div>
              </div>
            ) : (
              <>
                <Sparkles className="w-7 h-7 text-white/20 mb-3" />
                <p className="text-base sm:text-lg font-bold text-white/70 select-none">
                  {selectedInfo ? `${selectedInfo.month} 月 ${selectedInfo.day} 日 (星期${selectedInfo.dayName})` : ''} 暫無活動行程
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
