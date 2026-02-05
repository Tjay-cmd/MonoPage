'use client';

import { useEffect, useState, useRef } from 'react';

interface CalendarSettings {
  timeIncrement: number;
  startTime: string;
  endTime: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  hasLunchBreak: boolean;
  closedOnWeekends: boolean;
  closedDates: string[];
}

interface Booking {
  id: string;
  date: string;
  time: string;
  endTime?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceType?: string;
  status: string;
}

interface BookingCalendarProps {
  userId: string;
  title?: string;
  subtitle?: string;
}

export default function BookingCalendar({ userId, title = 'Book an Appointment', subtitle = 'Select a date and time that works for you' }: BookingCalendarProps) {
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    serviceType: '',
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCalendarData();
  }, [userId]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/settings?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (date: string): string[] => {
    if (!settings) return [];
    
    const slots: string[] = [];
    const [startHour, startMin] = settings.startTime.split(':').map(Number);
    const [endHour, endMin] = settings.endTime.split(':').map(Number);
    const increment = settings.timeIncrement;
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      
      // Skip lunch break if enabled
      if (settings.hasLunchBreak) {
        const [lunchStartHour, lunchStartMin] = settings.lunchBreakStart.split(':').map(Number);
        const [lunchEndHour, lunchEndMin] = settings.lunchBreakEnd.split(':').map(Number);
        
        const slotTime = currentHour * 60 + currentMin;
        const lunchStart = lunchStartHour * 60 + lunchStartMin;
        const lunchEnd = lunchEndHour * 60 + lunchEndMin;
        
        if (slotTime >= lunchStart && slotTime < lunchEnd) {
          // Skip this slot (lunch break)
          const nextMin = currentMin + increment;
          currentHour += Math.floor(nextMin / 60);
          currentMin = nextMin % 60;
          continue;
        }
      }
      
      slots.push(timeStr);
      
      // Move to next slot
      const nextMin = currentMin + increment;
      currentHour += Math.floor(nextMin / 60);
      currentMin = nextMin % 60;
    }
    
    return slots;
  };

  const isDateClosed = (date: string): boolean => {
    if (!settings) return false;
    
    // Check if date is in closedDates array
    if (settings.closedDates.includes(date)) return true;
    
    // Check if closed on weekends
    if (settings.closedOnWeekends) {
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return true; // Sunday or Saturday
    }
    
    return false;
  };

  const isTimeSlotBooked = (date: string, time: string): boolean => {
    return bookings.some(
      b => b.date === date && b.time === time && (b.status === 'confirmed' || b.status === 'pending')
    );
  };

  const handleDateClick = (date: string) => {
    if (isDateClosed(date)) return;
    setSelectedDate(date);
    setSelectedTime('');
    setShowBookingForm(false);
  };

  const handleTimeClick = (time: string) => {
    if (isTimeSlotBooked(selectedDate, time)) return;
    setSelectedTime(time);
    setShowBookingForm(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !bookingForm.clientName || !bookingForm.clientPhone) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/calendar/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          endTime: selectedTime, // Calculate end time based on increment
          clientName: bookingForm.clientName,
          clientPhone: bookingForm.clientPhone,
          clientEmail: bookingForm.clientEmail,
          serviceType: bookingForm.serviceType,
        }),
      });

      if (response.ok) {
        alert('Booking confirmed! We will contact you soon.');
        setShowBookingForm(false);
        setBookingForm({ clientName: '', clientPhone: '', clientEmail: '', serviceType: '' });
        setSelectedDate('');
        setSelectedTime('');
        await loadCalendarData(); // Reload to show new booking
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="booking-calendar-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📅</div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="booking-calendar-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Calendar settings not found. Please configure your calendar in the Business Dashboard.</p>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const days: (number | null)[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => {
      let newMonth = prev + direction;
      if (newMonth < 0) {
        setCurrentYear(prev => prev - 1);
        return 11;
      }
      if (newMonth > 11) {
        setCurrentYear(prev => prev + 1);
        return 0;
      }
      return newMonth;
    });
  };

  return (
    <div ref={calendarRef} className="booking-calendar-container" style={{ padding: '2rem', background: '#f9fafb', borderRadius: '1rem', maxWidth: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>{title}</h2>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>{subtitle}</p>
      </div>

      {/* Calendar */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {/* Month Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigateMonth(-1)}
            style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            ← Prev
          </button>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={() => navigateMonth(1)}
            style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {dayNames.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: '#6b7280', padding: '0.5rem' }}>
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} style={{ padding: '0.5rem' }}></div>;
            }
            
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isClosed = isDateClosed(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            
            return (
              <div
                key={day}
                onClick={() => handleDateClick(dateStr)}
                style={{
                  padding: '0.75rem',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  cursor: isClosed ? 'not-allowed' : 'pointer',
                  background: isSelected ? '#fef3c7' : isToday ? '#fef3c7' : 'transparent',
                  border: isSelected ? '2px solid #f59e0b' : isToday ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                  opacity: isClosed ? 0.5 : 1,
                  color: isClosed ? '#9ca3af' : '#111827',
                  fontWeight: isToday ? 'bold' : 'normal',
                }}
              >
                {day}
                {isClosed && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Closed</div>}
              </div>
            );
          })}
        </div>

        {/* Time Slots */}
        {selectedDate && !isDateClosed(selectedDate) && (
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
              Available Times for {new Date(selectedDate).toLocaleDateString()}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
              {generateTimeSlots(selectedDate).map(time => {
                const isBooked = isTimeSlotBooked(selectedDate, time);
                const isSelected = selectedTime === time;
                
                return (
                  <button
                    key={time}
                    onClick={() => handleTimeClick(time)}
                    disabled={isBooked}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                      background: isBooked ? '#f3f4f6' : isSelected ? '#fef3c7' : 'white',
                      color: isBooked ? '#9ca3af' : '#111827',
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      fontWeight: isSelected ? 'bold' : 'normal',
                    }}
                  >
                    {time}
                    {isBooked && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Booked</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Booking Form */}
        {showBookingForm && selectedDate && selectedTime && (
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
              Book Appointment
            </h4>
            <form onSubmit={handleSubmitBooking} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookingForm.clientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Phone <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={bookingForm.clientPhone}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={bookingForm.clientEmail}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Service Type
                </label>
                <input
                  type="text"
                  value={bookingForm.serviceType}
                  onChange={(e) => setBookingForm({ ...bookingForm, serviceType: e.target.value })}
                  placeholder="e.g., Haircut, Consultation"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingForm(false);
                    setSelectedTime('');
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

