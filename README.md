# 🎵 SheetSpeed - Tiện ích Luyện Đọc Sheet Nhạc 5s (Gentle Mode)

**SheetSpeed** là tiện ích mở rộng (Chrome Extension Manifest V3) được thiết kế đặc biệt để giúp bạn **luyện phản xạ đọc sheet nhạc (Sight-Reading)** theo từng chuỗi nốt ở cả **Khóa Sol** và **Khóa Fa** mỗi 5 giây, với cơ chế **Chế độ nhẹ nhàng (Gentle Mode)** hoàn toàn không gây phiền toái khi bạn đang làm việc hay lướt web.

---

## ✨ Điểm nổi bật của tiện ích

1. **Chuỗi nốt nhạc chuẩn xác (Sequence Sight-Reading)**:
   - Thay vì từng nốt đơn lẻ dễ nhàm chán, hệ thống sẽ sinh ra một **chuỗi gồm 3 đến 4 nốt liên tiếp** để não bộ hình thành thói quen đọc cụm nốt.
   - Hỗ trợ đầy đủ **Khóa Sol (Treble clef)**, **Khóa Fa (Bass clef)** hoặc **Xen kẽ ngẫu nhiên cả hai khóa**.

2. **Chế độ nhẹ nhàng (Gentle Mode - Không gây phiền)**:
   - **Cách ly hoàn toàn bằng Shadow DOM**: Widget nổi hiển thị độc lập, tuyệt đối không làm méo mó hay vỡ giao diện website bạn đang xem.
   - **Tự do di chuyển & Thu nhỏ**: Bạn có thể kéo thả widget (Drag & Drop) tới bất kỳ góc nào trên màn hình, hoặc bấm nút **Thu nhỏ (−)** để biến thành bong bóng nốt nhạc 🎵 nhỏ gọn.
   - **Đếm ngược 5 giây thông minh**: Nếu bạn đang tập trung đọc tài liệu hoặc làm việc, hết 5s tiện ích sẽ tự động đổi câu mới một cách êm ái, **không chặn chuột, không hiện pop-up phiền toái**.

3. **Gõ phím siêu nhanh & Âm thanh du dương**:
   - Gõ trực tiếp bằng bàn phím máy tính: `C`, `D`, `E`, `F`, `G`, `A`, `B`.
   - Có bàn phím ảo hiển thị kèm phụ đề ký xướng âm: `Đô`, `Rê`, `Mi`, `Fa`, `Sol`, `La`, `Si`.
   - Tích hợp bộ tạo âm thanh đàn piano/chuông bằng **Web Audio API** (tự động tổng hợp âm thanh bằng code, hoạt động offline 100%, không cần tải file MP3).
   - Có nút **Mute** tắt tiếng nhanh khi bạn cần không gian yên tĩnh.

4. **Bảng điều khiển & Chế độ tập trung (Focus Mode)**:
   - Bấm vào icon tiện ích trên thanh công cụ trình duyệt để mở cửa sổ Dashboard.
   - Theo dõi chuỗi đúng liên tiếp (**Streak** 🔥), kỷ lục cá nhân (**Best Streak** 🏆) và tỷ lệ chính xác (**Accuracy** 🎯).
   - Tùy chỉnh linh hoạt: thời gian mỗi câu (3s / 5s / 10s), độ dài chuỗi (3 nốt / 4 nốt), và lựa chọn loại khóa nhạc.

---

## 🛠️ Hướng dẫn Cài đặt vào Trình duyệt (Chrome / Cốc Cốc / Edge / Brave)

1. Mở trình duyệt Chrome và truy cập vào đường dẫn:
   ```
   chrome://extensions
   ```
2. Gạt bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên cùng bên phải.
3. Bấm vào nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
4. Chọn thư mục dự án trên Desktop:
   ```
   /home/tmi_pc_2025_quan/Desktop/music-note-extension
   ```
5. Bấm vào biểu tượng mảnh ghép (Extensions) trên thanh công cụ trình duyệt và **Ghim (Pin)** biểu tượng nốt nhạc của **SheetSpeed** lên để tiện theo dõi.

---

## 🎮 Cách sử dụng

* **Luyện tập thụ động khi lướt web**:
  - Mở bất kỳ website nào (đọc báo, xem tài liệu, blog, youtube...).
  - Thẻ nốt nhạc sẽ nổi ở góc dưới bên phải màn hình.
  - Khi rảnh tay, bạn chỉ cần gõ các phím `C`, `D`, `E`, `F`, `G`, `A`, `B` trên bàn phím để giải chuỗi nốt. Gõ đúng nốt nào, nốt đó trên khuông nhạc sẽ sáng xanh lá ngay lập tức!
  - Bấm nút `−` để thu nhỏ thành bong bóng nốt nhạc nếu cần tập trung đọc văn bản.

* **Luyện tập tập trung (Focus Drill)**:
  - Bấm trực tiếp vào icon **SheetSpeed** trên thanh công cụ để mở giao diện popup.
  - Bạn có thể luyện tốc độ đọc nốt trực tiếp ngay tại đây mà không cần mở trang web nào khác.

---

## 📂 Cấu trúc thư mục

```
music-note-extension/
├── manifest.json              # Khai báo cấu hình Extension (Manifest V3)
├── README.md                  # Tài liệu hướng dẫn sử dụng tiếng Việt
├── icons/                     # Bộ biểu tượng ứng dụng (16px, 48px, 128px)
├── lib/
│   ├── vexflow.min.js         # Thư viện vẽ khuông nhạc vector SVG
│   └── fonts/                 # Bộ font âm nhạc chuẩn Bravura & Academico
└── src/
    ├── engine/
    │   ├── music-engine.js    # Logic sinh chuỗi nốt khóa Sol/Fa & kiểm tra đáp án
    │   └── audio-synth.js     # Bộ phát âm piano chuẩn Web Audio API
    ├── content/
    │   ├── content.js         # Inject widget nổi qua Shadow DOM & quản lý đếm ngược
    │   └── content.css        # Định vị khung giao diện trên trang web
    └── popup/
        ├── popup.html         # Giao diện cài đặt & bảng điều khiển Focus Drill
        ├── popup.js           # Xử lý lưu cài đặt, thống kê chuỗi đúng (Streak)
        └── popup.css          # Giao diện Dark mode hiện đại
```

---

*Chúc bạn luyện tập phản xạ đọc sheet nhạc thật hiệu quả và ngày càng lên tay! 🎹🚀*
