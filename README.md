# 🎵 SheetSpeed 2.0 - Tiện ích Luyện Đọc Sheet Nhạc 5s (Gentle Mode & Pro Upgrade)

**SheetSpeed 2.0** là bản nâng cấp toàn diện của tiện ích mở rộng Chrome (Manifest V3), mang đến trải nghiệm **luyện phản xạ đọc nốt nhạc (Sight-Reading)** đẳng cấp dành cho cả người mới bắt đầu lẫn người chơi piano chuyên nghiệp.

---

## 🚀 Các Tính Năng Mới Trên Bản 2.0

### 1. 🎹 Hỗ trợ Đàn Piano/Keyboard Thật (Web MIDI API)
- **Tự động nhận diện thiết bị**: Cắm đàn piano điện hoặc MIDI keyboard qua cổng USB vào máy tính, tiện ích sẽ tự động kết nối và hiển thị nhãn `🎹 MIDI: Connected (Tên đàn)`.
- **Bấm thẳng trên phím đàn thật**: Bạn bấm phím đàn nào, hệ thống sẽ nhận diện chính xác nốt đó theo thời gian thực (hỗ trợ toàn bộ 88 phím, cả phím trắng lẫn phím đen thăng/giáng).

### 2. 🎼 Dấu Hóa Thăng/Giáng (Accidentals: ♯ / ♭)
- Bổ sung các nốt thăng/giáng (`C#`, `D#`, `F#`, `G#`, `A#` và các nốt đồng âm `Db`, `Eb`, `Gb`, `Ab`, `Bb`).
- **Giao diện phím đàn chân thực**: Bàn phím ảo gồm 7 phím trắng + 5 phím đen đặt đúng chuẩn layout đàn piano acoustic.
- **Phím tắt máy tính thông minh**:
  - Gõ phím thường: `C`, `D`, `E`...
  - Gõ nốt Thăng: Giữ `Shift` + Nốt (ví dụ: `Shift + C` = `C#`).

### 3. 🎮 Chế Độ Cấp Độ RPG & Combo Fever (Gamification)
- **7 Cấp bậc thăng tiến theo điểm kinh nghiệm (XP)**:
  - *Cấp 1 - Nhập môn (Novice)*: Khóa Sol, 2 nốt, 8 giây.
  - *Cấp 2 - Tập sự (Apprentice)*: Khóa Sol, 3 nốt, 5 giây.
  - *Cấp 3 - Khám phá Khóa Fa (Bass Explorer)*: Khóa Fa xuất hiện, 6 giây.
  - *Cấp 4 - Nhạc sinh (Musician)*: Xen kẽ Sol + Fa, 5 giây.
  - *Cấp 5 - Thăng trầm (Accidentals)*: Xuất hiện dấu Thăng/Giáng, 5 giây.
  - *Cấp 6 - Cao thủ (Virtuoso)*: Chuỗi 4 nốt, tốc độ 4 giây.
  - *Cấp 7 - Bậc thầy (Maestro)*: Tốc độ thần tốc 3 giây!
- **Combo Fever Mode**: Đạt chuỗi 10 câu đúng liên tiếp, widget sẽ phát sáng ánh hào quang Neon rực rỡ và nhân đôi điểm kinh nghiệm (x2 XP)!
- Âm thanh vinh danh: Hiệu ứng Fanfare chúc mừng mỗi khi bạn lên cấp (Level Up).

### 4. 📊 Heatmap Nốt Hay Sai & Spaced Repetition (Lặp Lại Ngắt Quãng)
- **Bản đồ nhiệt (Heatmap)**: Cung cấp thống kê trực quan về độ chính xác của từng nốt nhạc:
  - 🟢 **Xanh lá**: Phản xạ cực tốt (>80%).
  - 🟡 **Vàng**: Khá ổn (60-80%).
  - 🔴 **Đỏ**: Hay đọc nhầm (<60%).
- **Thuật toán Spaced Repetition**: Hệ thống tự động tính toán trọng số, ưu tiên xuất hiện nhiều hơn các nốt đang bị yếu hoặc phản xạ chậm để ép não bộ rèn luyện cho đến khi thành thạo.

---

## 🛠️ Hướng dẫn Cài đặt vào Chrome / Cốc Cốc / Edge / Brave

1. Mở trình duyệt Chrome và truy cập:
   ```
   chrome://extensions
   ```
2. Gạt bật **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
3. Bấm vào nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
4. Chọn thư mục dự án trên Desktop:
   ```
   /home/tmi_pc_2025_quan/Desktop/music-note-extension
   ```
5. Ghim (Pin) biểu tượng nốt nhạc của **SheetSpeed** lên thanh công cụ trình duyệt để bắt đầu trải nghiệm!

---

## 🎮 Cách sử dụng

* **Luyện tập thụ động khi lướt web (Gentle Mode)**:
  - Mở bất kỳ trang web nào (báo chí, blog, youtube, tài liệu làm việc...).
  - Thẻ nốt nhạc nổi tinh tế ở góc dưới màn hình (cách ly 100% bằng **Shadow DOM**, không bao giờ làm hỏng layout web).
  - Có thể kéo thả (Drag & Drop) di chuyển vị trí hoặc bấm nút `−` để thu nhỏ thành bong bóng 🎵 nhỏ gọn.
  - Khi rảnh tay, bạn chỉ cần gõ phím máy tính hoặc bấm đàn MIDI. Nếu đang bận việc, hết 5s thẻ tự động chuyển câu êm ái mà không chặn màn hình.
* **Luyện tập tập trung (Focus Mode)**:
  - Bấm vào icon **SheetSpeed** trên thanh công cụ để mở Dashboard.
  - Xem Heatmap, thanh tiến trình Level, tùy chỉnh thời gian (3s, 5s, 10s) hoặc chuyển đổi giữa chế độ Tự do (Custom) và RPG Level.

---

## 📂 Cấu trúc thư mục

```
music-note-extension/
├── manifest.json              # Khai báo cấu hình Extension (Manifest V3)
├── README.md                  # Hướng dẫn sử dụng tiếng Việt chi tiết
├── icons/                     # Bộ biểu tượng ứng dụng (16px, 48px, 128px)
├── lib/
│   ├── vexflow.min.js         # Thư viện vẽ khuông nhạc vector SVG
│   └── fonts/                 # Bộ font âm nhạc Bravura & Academico offline
└── src/
    ├── engine/
    │   ├── music-engine.js    # Lõi sinh nốt, dấu hóa, Spaced Repetition & Level RPG
    │   ├── audio-synth.js     # Bộ phát âm piano, Level Up Fanfare & Fever Mode
    │   └── midi-controller.js # Kết nối đàn piano thật qua Web MIDI API
    ├── content/
    │   ├── content.js         # Widget nổi Shadow DOM, bàn phím piano trắng/đen
    │   └── content.css        # Định vị khung giao diện
    └── popup/
        ├── popup.html         # Giao diện Dashboard, Heatmap & RPG level bar
        ├── popup.js           # Điều khiển Popup, xử lý dữ liệu và phím bấm
        └── popup.css          # Giao diện Dark mode hiện đại
```

---

*Chúc bạn có những giờ phút luyện tập phản xạ đọc sheet nhạc thật hào hứng và nhanh chóng đạt danh hiệu Bậc Thầy (Maestro)! 🎹🏆✨*
