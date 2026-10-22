/**
 * HUST Cine - Seat Booking Engine & Hold Timer
 */
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // 10-minute hold timer logic
    const timerEls = document.querySelectorAll('[class*="countdown"], [class*="text-status-warning"]');
    let timeLeftSeconds = 600; // 10 minutes

    function updateHoldTimer() {
      if (timeLeftSeconds <= 0) return;
      timeLeftSeconds--;
      const mins = String(Math.floor(timeLeftSeconds / 60)).padStart(2, '0');
      const secs = String(timeLeftSeconds % 60).padStart(2, '0');
      
      document.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0 && el.textContent.includes('09:') || el.textContent.includes('07:')) {
          el.textContent = el.textContent.replace(/\d{2}:\d{2}/, `${mins}:${secs}`);
        }
      });
    }
    setInterval(updateHoldTimer, 1000);
  });
})();
