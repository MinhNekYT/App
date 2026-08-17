# Triển khai FrierenCloud trên Vercel

## Cấu hình build

Vercel chạy `pnpm build`, phục vụ frontend từ `dist/public` và dùng các Vercel Functions trong thư mục `api/`. Route catch-all `api/[...path].ts` xuất Express app nên các endpoint Discord OAuth2, tRPC và callback log của GitHub Actions đều cùng dùng một API surface.

## Biến môi trường

Trong **Vercel Project Settings → Environment Variables**, thêm các biến sau cho Production và Preview. Khi chạy local, tạo tệp `.env` cùng các tên biến này rồi điền giá trị của bạn; không commit giá trị thật vào Git.

| Variable | Vai trò | Phạm vi |
| --- | --- | --- |
| `DISCORD_CLIENT_ID` | Client ID của Discord application | Server-only |
| `DISCORD_CLIENT_SECRET` | Client Secret để đổi authorization code | Server-only |
| `DISCORD_REDIRECT_URI` | `https://<vercel-domain>/api/auth/discord/callback` | Server-only |
| `DATABASE_URL` | Kết nối cơ sở dữ liệu MySQL/TiDB | Server-only |
| `JWT_SECRET` | Khóa ký session ứng dụng | Server-only |

> Không dùng tiền tố `VITE_` cho các biến trên. Mọi biến `VITE_*` có thể bị đưa vào bundle trình duyệt khi build frontend.

## Discord Developer Portal

Thêm chính xác giá trị `DISCORD_REDIRECT_URI` vào **OAuth2 → Redirects** của Discord Application. Nếu đổi domain Preview hay Production, thêm callback URL tương ứng; callback sai dù chỉ một ký tự sẽ bị Discord từ chối.

## GitHub Actions runner

Copy `github-actions/frierencloud-vm.yml` trong repository này tới `.github/workflows/frierencloud-vm.yml` trong repository runner bạn đã khai báo ở Settings. Workflow đó đổi hostname theo input, chạy đúng lệnh `curl -sSf https://sshx.io/get | sh && sshx`, rồi gửi output thực tế về FrierenCloud.
