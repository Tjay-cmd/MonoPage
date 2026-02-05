import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    // Add cache-busting: always fetch fresh data
    const cacheBuster = searchParams.get('_t') || Date.now().toString();

    if (!userId) {
      // Return HTML error page instead of JSON
      const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendar Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: #ffffff; 
      color: #111827; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      padding: 2rem;
    }
    .error-container {
      text-align: center;
      max-width: 500px;
    }
    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .error-title {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
      color: #ef4444;
    }
    .error-message {
      color: #6b7280;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <div class="error-title">User ID Required</div>
    <div class="error-message">Please ensure you are logged in and try again.</div>
  </div>
</body>
</html>`;
      return new NextResponse(errorHtml, {
        status: 400,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // Get calendar settings - always fetch fresh (no caching)
    const calendarRef = adminDb.collection('businessCalendars').doc(userId);
    const calendarDoc = await calendarRef.get();

    const settingsData = calendarDoc.exists ? calendarDoc.data() : null;
    const lastUpdatedTimestamp = settingsData?.lastUpdatedTimestamp || Date.now();
    
    // Default design settings
    const defaultDesign = {
      primaryColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      borderColor: '#e5e7eb',
      selectedDayColor: '#fef3c7',
      closedDayColor: '#f3f4f6',
      buttonColor: '#f59e0b',
      buttonTextColor: '#ffffff',
      darkMode: false,
    };
    
    const design = settingsData?.design || defaultDesign;
    const isDarkMode = design.darkMode || false;
    
    // Ensure background color is never completely black (minimum lightness)
    // This prevents the calendar from appearing as a black screen
    let safeBackgroundColor = design.backgroundColor || defaultDesign.backgroundColor;
    if (safeBackgroundColor === '#000000' || safeBackgroundColor === '#000' || safeBackgroundColor.toLowerCase() === 'black') {
      safeBackgroundColor = isDarkMode ? '#1f2937' : '#ffffff'; // Use dark gray instead of pure black
    }
    
    const settings = settingsData ? {
      timeIncrement: settingsData.timeIncrement || 60,
      startTime: settingsData.startTime || '08:00',
      endTime: settingsData.endTime || '18:00',
      lunchBreakStart: settingsData.lunchBreakStart || '12:00',
      lunchBreakEnd: settingsData.lunchBreakEnd || '13:00',
      hasLunchBreak: settingsData.hasLunchBreak !== undefined ? settingsData.hasLunchBreak : true,
      closedOnWeekends: settingsData.closedOnWeekends || false,
      closedDates: settingsData.closedDates || [],
      design,
    } : {
      timeIncrement: 60,
      startTime: '08:00',
      endTime: '18:00',
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00',
      hasLunchBreak: true,
      closedOnWeekends: false,
      closedDates: [],
      design: defaultDesign,
    };

    // Get bookings (handle gracefully if index doesn't exist)
    let bookings: any[] = [];
    try {
      const bookingsRef = adminDb.collection('bookings')
        .where('userId', '==', userId)
        .where('status', 'in', ['confirmed', 'pending']);
      
      const bookingsSnapshot = await bookingsRef.get();
      bookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (bookingError: any) {
      // If index doesn't exist yet, try without status filter
      try {
        const bookingsRef = adminDb.collection('bookings')
          .where('userId', '==', userId);
        const bookingsSnapshot = await bookingsRef.get();
        bookings = bookingsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((b: any) => b.status === 'confirmed' || b.status === 'pending' || !b.status);
      } catch (e) {
        console.warn('Could not fetch bookings:', e);
        bookings = [];
      }
    }

    // Return HTML page with embedded calendar
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Calendar</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { min-height: 100%; height: auto; overflow-x: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${safeBackgroundColor}; color: ${design.textColor}; }
    .calendar-container { width: 100%; min-height: 600px; background: ${safeBackgroundColor}; padding: 1.5rem; }
    .calendar-header { display: none; }
    .month-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .month-nav button { padding: 0.5rem 1rem; background: ${isDarkMode ? '#374151' : '#f3f4f6'}; border: none; border-radius: 0.5rem; cursor: pointer; transition: background 0.2s; color: ${design.textColor}; }
    .month-nav button:hover { background: ${isDarkMode ? '#4b5563' : '#e5e7eb'}; }
    .month-nav h3 { font-size: 1.25rem; font-weight: bold; color: #111827; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; margin-bottom: 1.5rem; }
    .day-header { text-align: center; font-weight: bold; color: ${isDarkMode ? '#9ca3af' : '#6b7280'}; padding: 0.5rem; }
    .day-cell { padding: 0.75rem; min-height: 60px; text-align: center; border-radius: 0.5rem; cursor: pointer; border: 1px solid ${design.borderColor}; background: ${design.backgroundColor}; transition: all 0.2s; color: ${design.textColor}; }
    .day-cell:hover:not(.closed) { background: ${isDarkMode ? '#374151' : '#f9fafb'}; border-color: ${isDarkMode ? '#4b5563' : '#d1d5db'}; }
    .day-cell.today { background: ${design.selectedDayColor}; border-color: ${design.primaryColor}; font-weight: bold; }
    .day-cell.selected { background: ${design.selectedDayColor}; border-color: ${design.primaryColor}; border-width: 2px; }
    .day-cell.closed { opacity: 0.5; cursor: not-allowed; color: #9ca3af; background: ${design.closedDayColor}; }
    .day-cell.has-bookings { border-color: ${isDarkMode ? '#60a5fa' : '#2563eb'}; }
    .day-cell.has-bookings:hover:not(.closed) { border-color: ${isDarkMode ? '#60a5fa' : '#2563eb'}; }
    .time-slots-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; align-items: center; justify-content: center; }
    .time-slots-modal.active { display: flex; }
    .time-modal-content { background: ${design.backgroundColor}; border-radius: 1rem; padding: 2rem; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
    .time-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .time-modal-header h3 { font-size: 1.5rem; font-weight: bold; color: ${design.textColor}; margin: 0; }
    .time-modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: ${isDarkMode ? '#9ca3af' : '#6b7280'}; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; transition: background 0.2s; }
    .time-modal-close:hover { background: ${isDarkMode ? '#374151' : '#f3f4f6'}; color: ${design.textColor}; }
    .time-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem; max-height: 400px; overflow-y: auto; padding: 0.5rem 0; }
    .time-grid::-webkit-scrollbar { width: 8px; }
    .time-grid::-webkit-scrollbar-track { background: ${isDarkMode ? '#374151' : '#f3f4f6'}; border-radius: 4px; }
    .time-grid::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#6b7280' : '#d1d5db'}; border-radius: 4px; }
    .time-grid::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#9ca3af' : '#9ca3af'}; }
    .time-slot { padding: 1rem; border-radius: 0.5rem; border: 2px solid ${design.borderColor}; background: ${design.backgroundColor}; cursor: pointer; transition: all 0.2s; text-align: center; font-weight: 500; color: ${design.textColor}; }
    .time-slot:hover:not(.booked) { border-color: ${design.primaryColor}; background: ${design.selectedDayColor}; transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .time-slot.selected { border-color: ${design.primaryColor}; background: ${design.selectedDayColor}; font-weight: bold; }
    .time-slot.booked { background: ${isDarkMode ? '#374151' : '#f3f4f6'}; color: ${isDarkMode ? '#6b7280' : '#9ca3af'}; cursor: not-allowed; opacity: 0.6; }
    .booking-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000; align-items: center; justify-content: center; }
    .booking-modal.active { display: flex; }
    .modal-content { background: ${design.backgroundColor}; border-radius: 1rem; padding: 2.5rem; max-width: 600px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; }
    #modal-body { display: flex; flex-direction: column; }
    form { display: flex; flex-direction: column; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid ${design.borderColor}; }
    .modal-header h3 { font-size: 1.75rem; font-weight: bold; color: ${design.textColor}; margin: 0; }
    .modal-close { background: none; border: none; font-size: 1.75rem; cursor: pointer; color: ${isDarkMode ? '#9ca3af' : '#6b7280'}; padding: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; transition: all 0.2s; line-height: 1; }
    .modal-close:hover { background: ${isDarkMode ? '#374151' : '#f3f4f6'}; color: ${design.textColor}; transform: rotate(90deg); }
    .booking-summary { background: #f9fafb; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 2rem; border: 1px solid #e5e7eb; }
    .booking-summary p { margin: 0.5rem 0; color: #374151; font-size: 1rem; }
    .booking-summary p:first-child { margin-top: 0; }
    .booking-summary p:last-child { margin-bottom: 0; }
    .booking-summary strong { color: #111827; font-weight: 600; }
    .form-group { margin-bottom: 1.5rem; }
    .form-group label { display: block; margin-bottom: 0.75rem; font-weight: 500; color: #374151; font-size: 0.9375rem; }
    .form-group input { width: 100%; padding: 1rem; border-radius: 0.75rem; border: 1px solid ${design.borderColor}; font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; background: ${design.backgroundColor}; color: ${design.textColor}; }
    .form-group input:focus { outline: none; border-color: ${design.primaryColor}; box-shadow: 0 0 0 3px ${design.primaryColor}33; }
    .form-group input::placeholder { color: #9ca3af; }
    .form-actions { display: flex; gap: 1rem; margin-top: auto; padding-top: 1rem; }
    .btn { padding: 1rem 2rem; border: none; border-radius: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 1rem; flex: 1; }
    .btn-primary { background: ${design.buttonColor}; color: ${design.buttonTextColor}; }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; transform: translateY(-1px); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .modal-loading-overlay { display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.3); border-radius: 1rem; z-index: 10; align-items: center; justify-content: center; }
    .modal-loading-overlay.active { display: flex; }
    .loading-spinner { width: 40px; height: 40px; border: 4px solid ${isDarkMode ? '#374151' : '#f3f4f6'}; border-top-color: ${design.primaryColor}; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .toast-container { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; gap: 0.75rem; pointer-events: none; }
    .toast { background: ${design.backgroundColor}; color: ${design.textColor}; padding: 1rem 1.25rem; border-radius: 0.75rem; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); border: 1px solid ${design.borderColor}; min-width: 300px; max-width: 400px; display: flex; align-items: center; gap: 0.75rem; pointer-events: auto; animation: toastSlideIn 0.3s ease-out; }
    @keyframes toastSlideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .toast.success { border-left: 4px solid #10b981; }
    .toast.error { border-left: 4px solid #ef4444; }
    .toast-icon { width: 20px; height: 20px; flex-shrink: 0; }
    .toast-message { flex: 1; font-size: 0.9375rem; line-height: 1.5; }
    .toast-close { background: none; border: none; color: ${isDarkMode ? '#9ca3af' : '#6b7280'}; cursor: pointer; padding: 0.25rem; line-height: 1; font-size: 1.25rem; opacity: 0.7; transition: opacity 0.2s; }
    .toast-close:hover { opacity: 1; }
    .time-slots-modal, .booking-modal { animation: modalFadeIn 0.2s ease-out; }
    @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
    .time-modal-content, .modal-content { animation: modalScaleIn 0.2s ease-out; }
    @keyframes modalScaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  </style>
</head>
<body>
  <div class="toast-container" id="toast-container"></div>
  <div class="calendar-container">
    <div id="calendar-root"></div>
  </div>
  
  <!-- Time Slots Modal -->
  <div id="time-slots-modal" class="time-slots-modal" onclick="if(event.target.id === 'time-slots-modal') window.closeTimeSlotsModal()">
    <div class="time-modal-content" onclick="event.stopPropagation()">
      <div class="time-modal-header">
        <h3 id="time-slots-title">Select Time</h3>
        <button class="time-modal-close" onclick="window.closeTimeSlotsModal()" aria-label="Close">&times;</button>
      </div>
      <div id="time-slots-body"></div>
    </div>
  </div>
  
  <!-- Booking Modal -->
  <div id="booking-modal" class="booking-modal" onclick="if(event.target.id === 'booking-modal') window.closeModal()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>Book Appointment</h3>
        <button class="modal-close" onclick="window.closeModal()" aria-label="Close">&times;</button>
      </div>
      <div id="modal-body"></div>
    </div>
  </div>
  <script>
    const settings = ${JSON.stringify(settings)};
    const bookings = ${JSON.stringify(bookings)};
    const userId = '${userId}';
    const isDarkMode = ${isDarkMode};
    
    // Toast notification system
    window.showToast = function(message, type = 'success') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      
      const icon = type === 'success' 
        ? '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
        : '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
      
      toast.innerHTML = icon + '<span class="toast-message">' + message + '</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>';
      
      container.appendChild(toast);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    };
    
    window.showLoadingOverlay = function(show) {
      const modal = document.getElementById('booking-modal');
      if (!modal) return;
      
      let overlay = modal.querySelector('.modal-loading-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'modal-loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
          modalContent.style.position = 'relative';
          modalContent.appendChild(overlay);
        }
      }
      
      if (show) {
        overlay.classList.add('active');
      } else {
        overlay.classList.remove('active');
      }
    };
    
    // Calendar logic here (will be injected)
    (function() {
      let selectedDate = '';
      let selectedTime = '';
      let currentMonth = new Date().getMonth();
      let currentYear = new Date().getFullYear();
      
      function renderCalendar() {
        const root = document.getElementById('calendar-root');
        if (!root) return;
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        let html = '<div class="month-nav">';
        html += '<button onclick="window.calendarNav(-1)">← Prev</button>';
        html += '<h3>' + monthNames[currentMonth] + ' ' + currentYear + '</h3>';
        html += '<button onclick="window.calendarNav(1)">Next →</button>';
        html += '</div>';
        
        html += '<div class="calendar-grid">';
        dayNames.forEach(day => {
          html += '<div class="day-header">' + day + '</div>';
        });
        
        for (let i = 0; i < firstDay; i++) {
          html += '<div></div>';
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          const isClosed = isDateClosed(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = selectedDate === dateStr;
          const bookingCount = getBookingCount(dateStr);
          
          let classes = 'day-cell';
          if (isToday) classes += ' today';
          if (isSelected) classes += ' selected';
          if (isClosed) classes += ' closed';
          if (bookingCount > 0) classes += ' has-bookings';
          
          html += '<div class="' + classes + '" onclick="window.selectDate(\\'' + dateStr + '\\')">' + day;
          if (isClosed) {
            html += '<div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">Closed</div>';
          } else if (bookingCount > 0) {
            const bookingText = bookingCount === 1 ? 'Booking' : 'Bookings';
            html += '<div style="font-size: 0.75rem; color: ' + (isDarkMode ? '#60a5fa' : '#2563eb') + '; margin-top: 0.25rem; font-weight: 500;">' + bookingCount + ' ' + bookingText + '</div>';
          }
          html += '</div>';
        }
        
        html += '</div>';
        
        root.innerHTML = html;
        
        // Auto-resize iframe after rendering - send multiple times to ensure it's received
        function sendResize() {
          if (window.parent !== window) {
            const height = Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
              document.documentElement.offsetHeight,
              document.body.offsetHeight,
              600 // Minimum height
            );
            window.parent.postMessage({ type: 'calendar-resize', height: height }, '*');
          }
        }
        
        // Send resize immediately and after delays
        setTimeout(sendResize, 100);
        setTimeout(sendResize, 500);
        setTimeout(sendResize, 1000);
        
        // Also send on window resize
        window.addEventListener('resize', function() {
          setTimeout(sendResize, 100);
        });
      }
      
      function isDateClosed(date) {
        if (settings.closedDates && settings.closedDates.includes(date)) return true;
        if (settings.closedOnWeekends) {
          const d = new Date(date);
          const day = d.getDay();
          if (day === 0 || day === 6) return true;
        }
        return false;
      }
      
      function isTimeBooked(date, time) {
        return bookings.some(b => b.date === date && b.time === time && (b.status === 'confirmed' || b.status === 'pending'));
      }
      
      function getBookingCount(date) {
        return bookings.filter(b => b.date === date && (b.status === 'confirmed' || b.status === 'pending')).length;
      }
      
      function generateTimeSlots(date) {
        const slots = [];
        const [startHour, startMin] = settings.startTime.split(':').map(Number);
        const [endHour, endMin] = settings.endTime.split(':').map(Number);
        const increment = settings.timeIncrement || 60;
        
        let hour = startHour;
        let min = startMin;
        
        while (hour < endHour || (hour === endHour && min < endMin)) {
          const timeStr = String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0');
          
          if (settings.hasLunchBreak) {
            const [lunchStartHour, lunchStartMin] = settings.lunchBreakStart.split(':').map(Number);
            const [lunchEndHour, lunchEndMin] = settings.lunchBreakEnd.split(':').map(Number);
            const slotTime = hour * 60 + min;
            const lunchStart = lunchStartHour * 60 + lunchStartMin;
            const lunchEnd = lunchEndHour * 60 + lunchEndMin;
            
            if (slotTime >= lunchStart && slotTime < lunchEnd) {
              const nextMin = min + increment;
              hour += Math.floor(nextMin / 60);
              min = nextMin % 60;
              continue;
            }
          }
          
          slots.push(timeStr);
          
          const nextMin = min + increment;
          hour += Math.floor(nextMin / 60);
          min = nextMin % 60;
        }
        
        return slots;
      }
      
      function showTimeSlotsModal() {
        const modal = document.getElementById('time-slots-modal');
        if (modal && selectedDate) {
          updateTimeSlotsModal();
          modal.classList.add('active');
        }
      }
      
      function hideTimeSlotsModal() {
        const modal = document.getElementById('time-slots-modal');
        if (modal) {
          modal.classList.remove('active');
        }
      }
      
      function updateTimeSlotsModal() {
        if (!selectedDate) return;
        
        const slots = generateTimeSlots(selectedDate);
        const dateStr = new Date(selectedDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        let html = '<div class="time-grid">';
        
        slots.forEach(time => {
          const isBooked = isTimeBooked(selectedDate, time);
          const isSelected = selectedTime === time;
          let classes = 'time-slot';
          if (isSelected) classes += ' selected';
          if (isBooked) classes += ' booked';
          
          html += '<div class="' + classes + '" onclick="window.selectTime(\\'' + time + '\\')">';
          html += '<div style="font-size: 1.125rem; font-weight: 600;">' + time + '</div>';
          if (isBooked) {
            html += '<div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">Booked</div>';
          }
          html += '</div>';
        });
        
        html += '</div>';
        
        const modalBody = document.getElementById('time-slots-body');
        const modalTitle = document.getElementById('time-slots-title');
        if (modalBody) {
          modalBody.innerHTML = html;
        }
        if (modalTitle) {
          modalTitle.textContent = 'Select Time - ' + dateStr;
        }
      }
      
      function showBookingModal() {
        const modal = document.getElementById('booking-modal');
        if (modal) {
          // Ensure loading overlay is hidden when opening modal
          window.showLoadingOverlay(false);
          modal.classList.add('active');
          // Update modal content
          updateModalContent();
        }
      }
      
      function hideBookingModal() {
        const modal = document.getElementById('booking-modal');
        if (modal) {
          // Ensure loading overlay is hidden when closing modal
          window.showLoadingOverlay(false);
          modal.classList.remove('active');
        }
      }
      
      function updateModalContent() {
        if (!selectedDate || !selectedTime) return;
        
        const formHtml = '<form onsubmit="window.submitBooking(event)">' +
          '<div class="form-group"><label>Name <span style="color: #ef4444">*</span></label>' +
          '<input type="text" id="clientName" required></div>' +
          '<div class="form-group"><label>Phone <span style="color: #ef4444">*</span></label>' +
          '<input type="tel" id="clientPhone" required></div>' +
          '<div class="form-group"><label>Email</label>' +
          '<input type="email" id="clientEmail"></div>' +
          '<div class="form-group"><label>Service Type</label>' +
          '<input type="text" id="serviceType" placeholder="e.g., Haircut, Consultation"></div>' +
          '<div class="form-actions">' +
          '<button type="submit" class="btn btn-primary">Confirm Booking</button>' +
          '<button type="button" class="btn btn-secondary" onclick="window.cancelBooking()">Cancel</button>' +
          '</div></form>';
        
        const modalBody = document.getElementById('modal-body');
        if (modalBody) {
          modalBody.innerHTML = formHtml;
        }
      }
      
      window.selectDate = function(date) {
        if (isDateClosed(date)) return;
        selectedDate = date;
        selectedTime = '';
        renderCalendar();
        showTimeSlotsModal();
      };
      
      window.selectTime = function(time) {
        if (isTimeBooked(selectedDate, time)) return;
        selectedTime = time;
        hideTimeSlotsModal();
        renderCalendar();
        showBookingModal();
      };
      
      window.closeTimeSlotsModal = function() {
        hideTimeSlotsModal();
        selectedDate = '';
        selectedTime = '';
        renderCalendar();
      };
      
      window.calendarNav = function(direction) {
        currentMonth += direction;
        if (currentMonth < 0) {
          currentYear--;
          currentMonth = 11;
        }
        if (currentMonth > 11) {
          currentYear++;
          currentMonth = 0;
        }
        renderCalendar();
        // Resize after navigation
        setTimeout(function() {
          if (window.parent !== window) {
            const height = Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
              600
            );
            window.parent.postMessage({ type: 'calendar-resize', height: height }, '*');
          }
        }, 200);
      };
      
      async function refreshBookings() {
        try {
          // Try to refresh bookings from server
          // Note: This may fail for public bookings without auth, which is fine
          const response = await fetch('/api/calendar/bookings?userId=' + userId, {
            headers: {
              'X-User-Id': userId
            }
          });
          if (response.ok) {
            const data = await response.json();
            // Update bookings array
            bookings.length = 0;
            bookings.push(...(data.bookings || []));
            // Re-render calendar to show updated bookings
            renderCalendar();
          } else {
            // If refresh fails (e.g., no auth), optimistically add the booking
            // The calendar will update on next page load
            renderCalendar();
          }
        } catch (error) {
          console.error('Error refreshing bookings:', error);
          // Still re-render calendar even if refresh fails
          renderCalendar();
        }
      }
      
      window.submitBooking = async function(e) {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        const form = e.target;
        
        // Show loading state
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Booking...';
        }
        window.showLoadingOverlay(true);
        
        const formData = {
          date: selectedDate,
          time: selectedTime,
          clientName: document.getElementById('clientName').value,
          clientPhone: document.getElementById('clientPhone').value,
          clientEmail: document.getElementById('clientEmail').value,
          serviceType: document.getElementById('serviceType').value,
        };
        
        try {
          const response = await fetch('/api/calendar/bookings', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'X-User-Id': userId 
            },
            body: JSON.stringify(formData),
          });
          
          if (response.ok) {
            const result = await response.json();
            
            // Show success toast
            window.showToast('Booking confirmed! We will contact you soon.', 'success');
            
            // Optimistically add booking to local array for immediate UI update
            bookings.push({
              id: result.bookingId,
              userId: userId,
              date: formData.date,
              time: formData.time,
              clientName: formData.clientName,
              clientPhone: formData.clientPhone,
              clientEmail: formData.clientEmail,
              serviceType: formData.serviceType,
              status: 'confirmed',
            });
            
            // Clear form and close modal
            selectedDate = '';
            selectedTime = '';
            hideBookingModal();
            
            // Re-render calendar to show the new booking immediately
            renderCalendar();
            
            // Try to refresh from server (may fail for public bookings, which is fine)
            refreshBookings().catch(() => {
              // Ignore errors - optimistic update is already done
            });
          } else {
            let errorMessage = 'Failed to book appointment';
            try {
              const error = await response.json();
              errorMessage = error.error || errorMessage;
            } catch (e) {
              // If response is not JSON, use status-based messages
              if (response.status === 400) {
                errorMessage = 'Invalid booking details. Please check your information and try again.';
              } else if (response.status === 500) {
                errorMessage = 'Server error. Please try again in a moment.';
              } else {
                errorMessage = 'Unable to complete booking. Please try again.';
              }
            }
            
            window.showToast(errorMessage, 'error');
            
            // Reset button state
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = 'Confirm Booking';
            }
            window.showLoadingOverlay(false);
          }
        } catch (error) {
          console.error('Booking error:', error);
          const errorMessage = navigator.onLine 
            ? 'Failed to submit booking. Please check your connection and try again.'
            : 'No internet connection. Please check your network and try again.';
          window.showToast(errorMessage, 'error');
          
          // Reset button state
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Confirm Booking';
          }
          window.showLoadingOverlay(false);
        }
      };
      
      window.cancelBooking = function() {
        selectedTime = '';
        // Ensure loading overlay is hidden when canceling
        window.showLoadingOverlay(false);
        hideBookingModal();
        renderCalendar();
      };
      
      window.closeModal = function() {
        // Ensure loading overlay is hidden when closing modal
        window.showLoadingOverlay(false);
        hideBookingModal();
      };
      
      // Keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        // Escape key: close any open modal
        if (e.key === 'Escape') {
          const timeModal = document.getElementById('time-slots-modal');
          const bookingModal = document.getElementById('booking-modal');
          if (timeModal && timeModal.classList.contains('active')) {
            window.closeTimeSlotsModal();
          } else if (bookingModal && bookingModal.classList.contains('active')) {
            window.closeModal();
          }
        }
      });
      
      // Listen for height requests from parent window
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'get-height') {
          // Respond with current height
          setTimeout(function() {
            if (window.parent !== window) {
              const height = Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
                document.documentElement.offsetHeight,
                document.body.offsetHeight,
                600
              );
              window.parent.postMessage({ type: 'calendar-resize', height: height }, '*');
            }
          }, 100);
        }
      });
      
      // Initial render
      renderCalendar();
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating calendar embed:', error);
    // Return HTML error page instead of JSON so iframe can display it
    const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendar Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: #ffffff; 
      color: #111827; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      padding: 2rem;
    }
    .error-container {
      text-align: center;
      max-width: 500px;
    }
    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .error-title {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
      color: #ef4444;
    }
    .error-message {
      color: #6b7280;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <div class="error-title">Failed to Load Calendar</div>
    <div class="error-message">Please try refreshing the page or contact support if the problem persists.</div>
  </div>
</body>
</html>`;
    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}

