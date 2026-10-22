/**
 * HUST Cine - Theme Controller (Dark/Light Mode)
 * Shortcut: [D] key
 */
(function() {
  function initTheme() {
    const savedTheme = localStorage.getItem('hustcine_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateThemeUI();
  }

  function updateThemeUI() {
    const isDark = document.documentElement.classList.contains('dark');
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');

    if (icon) {
      if (isDark) {
        icon.textContent = 'light_mode';
        icon.classList.remove('text-gold-vip');
        icon.classList.add('text-status-warning');
      } else {
        icon.textContent = 'dark_mode';
        icon.classList.add('text-gold-vip');
        icon.classList.remove('text-status-warning');
      }
    }
    if (label) {
      label.textContent = isDark ? 'Sáng' : 'Tối';
    }
  }

  window.toggleHustTheme = function() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('hustcine_theme', isDark ? 'dark' : 'light');
    updateThemeUI();
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.addEventListener('click', window.toggleHustTheme);
    }
  });

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if (!isTyping && (e.key === 'd' || e.key === 'D')) {
      window.toggleHustTheme();
    }
  });
})();
