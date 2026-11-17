/**
 * SMART CLASS ROOM - HARDWARE MONITOR JAVASCRIPT
 * Real-time Hardware Telemetry, Camera Management, and Interactive HUD
 */
import('/static/js/dashboard.js').catch(() => {
  const s = document.createElement('script');
  s.src = '/static/js/dashboard.js';
  document.head.appendChild(s);
});
