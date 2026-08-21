# Ghi chú tích hợp FrierenCloud

## Discord OAuth2

FrierenCloud dùng Authorization Code Grant với scope tối thiểu `identify`. Máy chủ sẽ tạo `state` ngẫu nhiên, lưu dạng cookie `httpOnly`, chuyển hướng đến `https://discord.com/oauth2/authorize`, rồi đổi `code` tại `https://discord.com/api/oauth2/token` bằng dữ liệu biểu mẫu. Sau khi lấy token, máy chủ gọi `GET https://discord.com/api/users/@me` để lấy định danh Discord và tạo session ứng dụng; access token Discord không được trả về trình duyệt hoặc lưu vào cơ sở dữ liệu.

## GitHub Actions và log

Máy chủ dùng GitHub REST API để gửi `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` cùng input hostname. Sau đó ứng dụng lưu workflow run, kiểm tra trạng thái và lấy dữ liệu từ các endpoint workflow run/job/log. Link SSHX chỉ được lưu sau khi parser nhận diện nó trong output do GitHub Actions trả về; không tạo hoặc hiển thị link mẫu.

## Ràng buộc bảo mật

GitHub token người dùng nhập chỉ được giữ trong bộ nhớ trong thời gian gửi dispatch. Token không được ghi vào bảng dữ liệu, log, phản hồi API, local storage, phân tích sự kiện hay URL. Tên máy phải được chuẩn hóa theo giới hạn hostname Linux trước khi gửi vào workflow.

## Runtime npm Node.js

FrierenCloud dùng một process Node.js duy nhất: Express phục vụ website và Discord Gateway chạy cùng runtime. Build bằng `npm run build` và khởi động bằng `npm run start` trên host có HTTPS public URL. Cấu hình `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DATABASE_URL` và `JWT_SECRET` phải nằm trong môi trường server; không đưa secret vào client bundle.

## Nguồn tham khảo

- Discord OAuth2: https://docs.discord.com/developers/topics/oauth2
- GitHub Actions workflow runs API: https://docs.github.com/en/rest/actions/workflow-runs
