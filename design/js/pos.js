/**
 * HUST Cine - Staff Box Office POS Controller
 */
(function() {
  document.addEventListener('keydown', (e) => {
    // Function keys shortcuts for cashier
    if (e.key === 'F1') { e.preventDefault(); console.log('POS: Chọn phim'); }
    if (e.key === 'F2') { e.preventDefault(); console.log('POS: Chọn ghế'); }
    if (e.key === 'F3') { e.preventDefault(); console.log('POS: Bắp nước F&B'); }
    if (e.key === 'F8') { e.preventDefault(); console.log('POS: Thanh toán Tiền mặt'); }
    if (e.key === 'F9') { e.preventDefault(); console.log('POS: Quét QR VietQR/VNPay'); }
    if (e.key === 'Enter' && e.ctrlKey) { window.print(); }
  });
})();
