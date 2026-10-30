# MyEdit

**Tiếng Việt** · [English](#english)

Ứng dụng chỉnh sửa video miễn phí, chạy ngay trên trình duyệt. Video được xử lý trên máy của bạn và không bao giờ bị tải lên mạng. Không cần tài khoản.

Dùng thử: https://lemyx1997.github.io/MyEdit/

> Trạng thái: **Giai đoạn 2** (hiệu ứng thẩm mỹ) đã xong. Đang phát triển.

## Hiệu ứng (Giai đoạn 2)
- **Chữ:** 11 mẫu có sẵn, 15 font (có tiếng Việt, đóng gói sẵn, không cần mạng), màu, viền, đổ bóng/phát sáng, nền, căn lề, nhiều dòng.
- **Nhãn dán:** 48 emoji, cộng ảnh PNG/GIF của bạn (GIF động chạy đúng cả khi xuất video).
- **Bộ lọc màu:** 21 bộ lọc + chỉnh tay: sáng, tương phản, bão hoà, nhiệt độ màu, làm mờ, làm nét, làm tối viền.
- **Chuyển cảnh:** 16 kiểu (mờ dần, trượt, quét, phóng, xoay, vòng tròn…).
- **Hoạt ảnh vào / ra / lặp** cho mọi clip, chữ, nhãn dán.
- **Hoà trộn & độ trong suốt**, **mặt nạ** (tròn, chữ nhật, trái tim), **xoá phông xanh**.
- **Khung chính (keyframe)** cho vị trí, kích thước, xoay, độ trong suốt, âm lượng.
- Kéo / xoay / phóng clip trực tiếp trên khung xem trước.
- **Nền khung hình:** đen, màu, nhoè theo video hoặc ảnh.

## Tính năng cơ bản (Giai đoạn 1)
- Nhập video, ảnh, nhạc bằng kéo thả; xem trước và phát trực tiếp.
- Dòng thời gian nhiều lớp: kéo thả clip, kéo mép để cắt đầu/cuối, tách cảnh, nhân đôi, xoá, đổi dòng, nam châm hít.
- Chỉnh âm lượng, tắt tiếng, đổi tốc độ 0.1x–10x; ẩn/tắt tiếng từng dòng.
- Hoàn tác / làm lại nhiều bước; tự lưu, tải lại trang vẫn còn dự án.
- Xuất MP4 (H.264 + AAC) ở 720p, 1080p, 4K, 24/30/60 fps, có thanh tiến độ và nút huỷ.
- Tỉ lệ khung hình: 9:16, 16:9, 1:1, 4:5, 4:3, 21:9. Giao diện tối/sáng.

## Phím tắt
| Phím | Việc |
|---|---|
| Space | Phát / dừng |
| Ctrl+B | Tách clip tại kim chỉ |
| Delete | Xoá clip |
| Ctrl+Z / Ctrl+Shift+Z | Hoàn tác / làm lại |
| Ctrl+C / Ctrl+V | Sao chép / dán clip |
| Ctrl+D | Nhân đôi clip |

## Lộ trình
- [x] Giai đoạn 0 – Khung giao diện tối 4 vùng, chạy trên GitHub Pages
- [x] Giai đoạn 1 – Nhập clip, cắt/ghép, tốc độ, âm lượng, hoàn tác, xuất MP4
- [x] Giai đoạn 2 – Chữ, nhãn dán, bộ lọc, chuyển cảnh, keyframe, mặt nạ
- [ ] Giai đoạn 3 – Sóng âm, ghi âm, phụ đề tự động (Whisper trong trình duyệt)
- [ ] Giai đoạn 4 – Mẫu dự án, đa ngôn ngữ, proxy cho máy yếu

## Chạy trên máy
```bash
npm install
npm run dev
npm test
```

Cần Chrome hoặc Edge bản mới (dùng WebCodecs để xuất video).

## Giấy phép
MIT. Dự án lấy cảm hứng từ cách bố trí của các trình dựng video phổ biến; **không liên kết** với CapCut/ByteDance và không dùng tài nguyên của họ.

---

## English
MyEdit is a free, in-browser video editor. Everything runs locally; your videos never leave your computer. No account required. Status: Phase 1 (core editing: import, trim/split, speed, volume, undo, MP4 export up to 4K). Needs a recent Chrome or Edge. Not affiliated with CapCut/ByteDance.
