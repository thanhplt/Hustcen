/**
 * HUST Cine - Main Application Script
 * Live Clock, Quick Booking, Modals, Dynamic Interactivity
 */
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Real-time Clock in Header
    const clockContainers = document.querySelectorAll('.font-code-time');
    function updateClock() {
      const now = new Date();
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[now.getDay()];
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      const h = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');

      clockContainers.forEach(el => {
        const textSpan = el.querySelector('span:last-child');
        if (textSpan && textSpan.textContent.includes('Thứ')) {
          textSpan.textContent = `${dayName}, ${d}/${m}/${y} · ${h}:${min}`;
        }
      });
    }
    updateClock();
    setInterval(updateClock, 30000);

    // 2. Quick Booking Bar handler
    const quickBookBtn = document.querySelector('section button:has(.material-symbols-outlined:contains("local_activity"))');
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.trim().includes('Đặt vé') && btn.closest('section')?.querySelector('select')) {
        btn.addEventListener('click', () => {
          window.location.href = 'chi-tiet-phim.html';
        });
      }
    });

    // 3. Play trailer buttons
    document.querySelectorAll('.material-symbols-outlined').forEach(icon => {
      if (icon.textContent.trim() === 'play_arrow' || icon.textContent.trim() === 'play_circle') {
        const parentBtn = icon.closest('button, .cursor-pointer, .group');
        if (parentBtn && !parentBtn.hasAttribute('data-has-trailer-listener')) {
          parentBtn.setAttribute('data-has-trailer-listener', 'true');
          parentBtn.addEventListener('click', (e) => {
            // If already on trailer modal, do nothing
            if (!window.location.href.includes('modal-trailer-dat-ve.html')) {
              window.location.href = 'modal-trailer-dat-ve.html';
            }
          });
        }
      }
    });
  });
})();
