- [x] Cài dependencies hệ thống trước build trong GitHub Actions bằng bước apt-get phù hợp.
- [x] Build APK/IPA hoàn toàn bằng GitHub Actions và đọc cấu hình từ Repository Secrets.
- [x] Tạo nhiệm vụ phát hành sau build để upload artifact lên GitHub Release bằng GITHUB_TOKEN.
- [x] Cập nhật tài liệu cách lấy EXPO_TOKEN và cấu hình toàn bộ Repository Secrets.
- [x] Kiểm thử tĩnh workflow, đồng bộ cấu hình project và xác nhận các lệnh kiểm tra.

- [x] Đổi toàn bộ thương hiệu LinuxDroid thành FrierenCloud và dùng logo người dùng cung cấp.
- [x] Xây dựng splash logo, đăng nhập Google qua Supabase và quản lý phiên an toàn.
- [x] Xây dựng chọn English/Tiếng Việt, VM Instances và thanh điều hướng hai tab.
- [x] Xây dựng form tạo Linux VPS với tên máy, GitHub token phụ và checkbox xác nhận.
- [x] Tạo luồng GitHub Actions đổi hostname, chạy SSHX, lấy log và hiển thị link SSHX.
- [x] Hoàn thiện cấu hình build/release và kiểm thử trải nghiệm FrierenCloud.

- [x] Viết README.md giới thiệu dự án FrierenCloud và toàn bộ luồng sử dụng.
- [x] Tài liệu hóa cách tạo Expo token, Supabase keys và nhập Repository Secrets an toàn.
- [x] Bổ sung cấu hình và hướng dẫn deploy phiên bản web FrierenCloud lên VPS.
- [x] Kiểm tra tài liệu, lưu checkpoint và bàn giao thay đổi.

- [x] Thiết kế API bridge và mô hình dữ liệu dùng chung cho Android, iOS và Web.
- [x] Lưu và đồng bộ VM instances qua Supabase theo quyền người dùng.
- [x] Tạo API bridge Node.js chạy cục bộ tại cổng 8000, với GET /health công khai và API VM dùng Supabase session.
- [x] Kết nối web Vercel và app Android/iOS qua HTTPS API bridge mà không nhúng secret client-side.
- [x] Thêm logo Google cho nút Continue with Google và ẩn logo app khỏi giao diện sau splash.
- [x] Không dùng file `.env`, Base64 hoặc app bundle để lưu API secret.
- [x] Cập nhật hướng dẫn VPS/Vercel và đồng bộ bản hoàn chỉnh lên MinhNekYT/App.

- [x] Chuyển đăng nhập từ Google/Supabase sang Discord OAuth.
- [x] Thêm audit log hoạt động API vào api/logs mà không ghi token hoặc dữ liệu nhạy cảm.
- [x] Cập nhật UI, hướng dẫn Discord/VPS và kiểm thử luồng đăng nhập mới.
- [x] Đồng bộ thay đổi Discord lên MinhNekYT/App và lưu checkpoint.

- [x] Loại bỏ static web export, Vercel và cấu hình bridge URL dành cho web.
- [x] Triển khai Discord OAuth trực tiếp tại API bridge cho Android/iOS.
- [x] Thiết lập session bridge và audit log an toàn trong api/logs.

- [x] Sửa fallback session Discord để preview không gọi Expo SecureStore trên web.
