# MyEdit

**Tiếng Việt** · [English](#english)

Ứng dụng chỉnh sửa video miễn phí, chạy ngay trên trình duyệt. Video được xử lý trên máy của bạn và không bao giờ bị tải lên mạng. Không cần tài khoản.

Dùng thử: https://lemyx1997.github.io/MyEdit/

> Trạng thái: **đã hoàn thành cả 4 giai đoạn** theo lộ trình. Cần Chrome hoặc Edge bản mới.

## Tính năng

**Dựng cơ bản**
- Nhập video, ảnh, nhạc bằng kéo thả; xem trước và phát trực tiếp.
- Dòng thời gian nhiều lớp: kéo thả clip, kéo mép để cắt, tách, nhân đôi, xoá, đổi dòng, nam châm hít, thu phóng.
- Âm lượng, tắt tiếng, tốc độ 0.1x–10x; ẩn/tắt tiếng từng dòng.
- Hoàn tác / làm lại nhiều bước; tự lưu, tải lại trang vẫn còn dự án.
- Xuất MP4 (H.264 + AAC) 720p / 1080p / 4K, 24/30/60 fps, có thanh tiến độ và nút huỷ.

**Hiệu ứng**
- Chữ: 11 mẫu, 15 font (có tiếng Việt, đóng gói sẵn, dùng được khi không có mạng), màu, viền, đổ bóng/phát sáng, nền, căn lề.
- Nhãn dán: 48 emoji + ảnh PNG/GIF của bạn (GIF động chạy đúng cả khi xuất).
- 21 bộ lọc màu + chỉnh tay: sáng, tương phản, bão hoà, nhiệt độ màu, làm mờ, làm nét, làm tối viền.
- 16 kiểu chuyển cảnh; hoạt ảnh vào / ra / lặp; hoà trộn & độ trong suốt; mặt nạ (tròn, chữ nhật, trái tim); xoá phông xanh.
- Khung chính (keyframe) cho vị trí, kích thước, xoay, độ trong suốt, âm lượng. Kéo / xoay / phóng clip trực tiếp trên khung xem trước.
- Nền khung hình: đen, màu, nhoè theo video hoặc ảnh. 6 tỉ lệ: 9:16, 16:9, 1:1, 4:5, 4:3, 21:9.

**Âm thanh & AI miễn phí**
- Sóng âm trên dòng thời gian; mờ dần vào/ra; tách tiếng khỏi video.
- Ghi âm giọng thuyết minh bằng micro.
- Thư viện nhạc & hiệu ứng âm thanh **do chính ứng dụng tự tạo** (không dính bản quyền).
- **Phụ đề tự động** bằng Whisper chạy ngay trong trình duyệt (tiếng Việt, Anh, Trung, Nhật, Hàn…); sửa chữ trực tiếp; nhập / xuất file `.srt`; 4 kiểu phụ đề.
- Tự cắt khoảng lặng; cân bằng âm lượng các clip.

**Hoàn thiện**
- Mẫu dự án TikTok / Reels / Shorts / YouTube / Instagram; cài đặt xuất sẵn cho từng nền tảng.
- Giao diện tiếng Việt và tiếng Anh; hướng dẫn nhanh khi mở lần đầu; chế độ sáng/tối.
- Xem trước nhẹ (360p) và tự hạ chất lượng xem trước khi máy yếu (video xuất ra vẫn giữ chất lượng đầy đủ).
- Thông báo lỗi dễ hiểu; màn hình báo lỗi thân thiện, dự án luôn được tự lưu.

## Phím tắt
| Phím | Việc |
|---|---|
| Space | Phát / dừng |
| Ctrl+B | Tách clip tại kim chỉ |
| Delete | Xoá clip |
| Ctrl+Z / Ctrl+Shift+Z | Hoàn tác / làm lại |
| Ctrl+C / Ctrl+V | Sao chép / dán clip |
| Ctrl+D | Nhân đôi clip |

## Hạn chế đã biết
- Trình duyệt không cho thu giọng "đọc văn bản" (text-to-speech) vào file, nên mục này chỉ để nghe thử. Muốn có giọng trong video, hãy dùng Ghi âm.
- Phụ đề tự động cần tải mô hình lần đầu (khoảng 40–80 MB) nên cần mạng ở lần đó; sau đó chạy offline. Độ chính xác của mô hình nhỏ có hạn, nên soát lại chữ.
- Cân bằng âm lượng chỉ hạ clip quá to, không khuếch đại clip nhỏ (âm lượng tối đa 100%).
- "Xem trước nhẹ" hạ độ phân giải khung vẽ, chưa tạo bản proxy riêng cho video nặng.
- Chưa có khoá dòng (lock) trên dòng thời gian.

## Chạy trên máy
```bash
npm install
npm run dev
npm test
```

## Giấy phép
MIT. Dự án lấy cảm hứng từ cách bố trí của các trình dựng video phổ biến; **không liên kết** với CapCut/ByteDance và không dùng tài nguyên của họ. Font từ gói `@fontsource` (giấy phép OFL); mô hình nhận dạng giọng nói Whisper (MIT) tải từ Hugging Face.

---

## English
MyEdit is a free, in-browser video editor. Everything runs locally; your videos never leave your computer. No account required. Needs a recent Chrome or Edge. Not affiliated with CapCut/ByteDance.

**Features:** multi-track timeline, trim/split/speed/volume, undo/redo with autosave, MP4 export up to 4K; text with Vietnamese-ready fonts, stickers & animated GIFs, 21 filters, 16 transitions, animations, masks, green screen, keyframes, backgrounds; waveform, fades, voice recording, a built-in royalty-free sound library, in-browser Whisper auto-captions with `.srt` import/export, silence cutting, loudness balancing; project templates, platform export presets, Vietnamese/English UI, first-run guide, light preview mode for slow computers.

**Known limits:** text-to-speech is listen-only (browsers cannot record it); auto-captions download a model on first use; no track locking yet.
