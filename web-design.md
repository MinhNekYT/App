# FrierenCloud Web Design

FrierenCloud sẽ là **web app tối màu, desktop-first nhưng mobile-first trong bố cục**. Giao diện tiếp tục dùng nền navy `#12213C`, bề mặt xanh đậm `#1C2D4C`, màu nhấn cyan `#43C6E8` và lilac `#B9B7E8`. Mục tiêu là giữ cảm giác console gọn gàng, không mô phỏng điện thoại trên desktop.

| Kích thước viewport | Điều hướng | Bố cục nội dung |
| --- | --- | --- |
| Phone `< 720px` | Bottom navigation hai mục | Một cột, nút tạo VPS full-width, log chiếm toàn bộ chiều rộng. |
| Tablet `720–1099px` | Thanh điều hướng ngang phía trên | Nội dung giới hạn khoảng 920px; danh sách VM và panel trạng thái đặt cạnh nhau khi có không gian. |
| Desktop `≥ 1100px` | Sidebar cố định, profile và repository ở cuối | Canvas tối đa 1440px; dashboard dùng grid hai cột, form và log chia panel rõ ràng. |

Các route **VM Instances**, **Settings**, **Create Linux VPS** và **Setup Log** giữ nguyên chức năng. Điều hướng và spacing thay đổi theo breakpoint; không có auto-refresh, worker hay background polling. Người dùng chủ động bấm làm mới để đọc GitHub Actions log.

## Chuyển đổi web-only

Ứng dụng export static bằng Expo Web/Metro. Các cấu hình Android/iOS, EAS profile, workflow tạo APK/IPA và script tải EAS artifact bị loại bỏ. GitHub Actions build `dist/`, tạo file nén website và tải lên GitHub Release `Version <version>`.
