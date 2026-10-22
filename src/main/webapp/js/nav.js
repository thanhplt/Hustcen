/**
 * HUST Cine - Navigation & Route Mapping
 * Connects all data-path attributes and buttons to the corresponding HTML screens
 */
(function() {
  const ROUTE_MAP = {
    // Customer Screens
    'trang-chu': 'index.html',
    'danh-sach-phim': 'danh-sach-phim.html',
    'chi-tiet-phim': 'chi-tiet-phim.html',
    'lich-chieu': 'chi-tiet-phim.html#showtimes',
    'chon-ghe': 'chon-ghe-imax.html',
    'chon-ghe-imax': 'chon-ghe-imax.html',
    'chon-ghe-tieu-chuan': 'chon-ghe-tieu-chuan.html',
    'chon-ghe-luxury': 'chon-ghe-luxury.html',
    'bap-nuoc': 'chon-combo-bap-nuoc.html',
    'bap-nuoc-combo': 'chon-combo-bap-nuoc.html',
    'combo-fb': 'chon-combo-bap-nuoc.html',
    'combo-va-dich-vu': 'chon-combo-bap-nuoc.html',
    'dat-ve': 'thanh-toan.html',
    'thanh-toan': 'thanh-toan.html',
    'thanh-toan-in-ve': 'thanh-toan.html',
    've-dien-tu': 've-dien-tu.html',
    'tai-khoan': 'tai-khoan.html',
    'hoi-vien-hust-club': 'tai-khoan.html',
    'khach-hang-va-thanh-vien': 'tai-khoan.html',
    'rap-va-gia-ve': 'cum-rap.html',
    'rap-va-phong-chieu': 'cum-rap.html',
    'cum-rap': 'cum-rap.html',
    'loai-phong-chieu': 'loai-phong-chieu.html',
    'phong-chieu': 'loai-phong-chieu.html',
    'phong-chieu-chuan-ky-thuat': 'loai-phong-chieu.html',
    'phong-private': 'phong-private.html',
    'phong-trai-nghiem-studio-lab': 'phong-private.html',
    'modal-trailer': 'modal-trailer-dat-ve.html',
    'trang-thai-giu-ghe': 'trang-thai-giu-ghe.html',
    'thong-bao-va-trang-thai-ve': 'trang-thai-giu-ghe.html',
    'uu-dai': 'index.html#promotions',
    'khuyen-mai-va-voucher': 'index.html#promotions',
    'chinh-sach-dieu-khoan': 'index.html#terms',
    'chinh-sach-thanh-toan': 'index.html#payment-policy',
    'chinh-sach-bao-mat': 'index.html#privacy',
    'chinh-sach-hoan-ve': 'index.html#refund',

    // Staff POS
    'staff-pos': 'staff-pos.html',
    'staff-pos-dark': 'staff-pos-dark.html',
    'chon-phim-suat-chieu': 'staff-pos.html',

    // Admin Portal
    'dashboard': 'admin-dashboard.html',
    'admin-dashboard': 'admin-dashboard.html',
    'suat-chieu': 'admin-suat-chieu.html',
    'admin-suat-chieu': 'admin-suat-chieu.html',
    'so-do-phong': 'admin-so-do-phong.html',
    'admin-so-do-phong': 'admin-so-do-phong.html',
    'don-hang-va-giao-dich': 'admin-don-hang.html',
    'admin-don-hang': 'admin-don-hang.html',
    'quan-ly-phim': 'admin-phim.html',
    'admin-phim': 'admin-phim.html',
    'bang-gia-ve-va-ghe': 'admin-gia-ve.html',
    'admin-gia-ve': 'admin-gia-ve.html',
    'combo-fnb': 'admin-combo-fnb.html',
    'admin-combo-fnb': 'admin-combo-fnb.html',
    'bao-cao-doanh-thu': 'admin-bao-cao.html',
    'admin-bao-cao': 'admin-bao-cao.html',
    'cai-dat-he-thong': 'admin-dashboard.html#settings',
    
    // Hub
    'hub': 'hub.html',
    'sitemap': 'hub.html'
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Intercept clicks on [data-path]
    document.querySelectorAll('[data-path]').forEach(el => {
      const pathKey = el.getAttribute('data-path');
      if (ROUTE_MAP[pathKey]) {
        if (el.tagName === 'A' && (!el.getAttribute('href') || el.getAttribute('href') === '#')) {
          el.setAttribute('href', ROUTE_MAP[pathKey]);
        }
        el.addEventListener('click', (e) => {
          if (el.tagName !== 'A') {
            e.preventDefault();
            window.location.href = ROUTE_MAP[pathKey];
          }
        });
      }
    });

    // Add Floating Hub Switcher Button if not present
    if (!document.getElementById('hust-hub-switcher')) {
      const switcher = document.createElement('div');
      switcher.id = 'hust-hub-switcher';
      switcher.className = 'hust-quick-switcher';
      switcher.innerHTML = `
        <a href="hub.html" class="hust-quick-switcher-btn" title="Xem tất cả 25 màn hình hệ thống">
          <span class="material-symbols-outlined" style="font-size:18px;">grid_view</span>
          <span>Sitemap / Hub (25 Màn)</span>
        </a>
      `;
      document.body.appendChild(switcher);
    }
  });
})();
