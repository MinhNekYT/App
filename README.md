# FrierenCloud

**FrierenCloud** là website responsive để tạo, theo dõi và mở workspace Linux tạm thời thông qua GitHub Actions. Dự án chỉ xuất bản **web static**; không còn APK, IPA, EAS build profile, API bridge VPS, systemd, Nginx hoặc worker nền tùy chỉnh.

## Giao diện theo thiết bị

| Thiết bị | Điều hướng | Bố cục |
| --- | --- | --- |
| Điện thoại | Bottom navigation gồm **VM Instances** và **Settings** | Một cột, thao tác tạo VPS toàn chiều rộng, log dễ cuộn. |
| Máy tính bảng | Thanh điều hướng ngang | Panel danh sách và thông tin đặt cạnh nhau khi đủ không gian. |
| Máy tính | Sidebar cố định | Dashboard, form tạo VPS và log dùng lưới nhiều panel, giới hạn chiều rộng 1440px. |

Các breakpoint và nguyên tắc bố cục được ghi trong [`web-design.md`](./web-design.md). Website không tự polling; người dùng chủ động bấm **Refresh log** để đọc trạng thái mới nhất.

## Kiến trúc

```text
Web browser
  ├── Discord OAuth qua Supabase Auth
  ├── localStorage: ngôn ngữ, repository, danh sách phiên cục bộ
  └── GitHub REST API: dispatch workflow + đọc run/job log
        └── GitHub Actions runner: đặt hostname + chạy SSHX
```

Discord OAuth do **Supabase Auth** xử lý. Website không chứa Discord client secret. Khi tạo workspace, website gửi token GitHub phụ trực tiếp đến GitHub REST API, xác định workflow run mới tạo và đọc log để phát hiện URL SSHX.[1] [2]

> **Lưu ý bảo mật:** token GitHub phụ chỉ giữ trong bộ nhớ của tab đang mở. Token không được ghi vào localStorage, database, log hay custom API. Sau khi đóng tab, workspace cũ vẫn hiện trong danh sách cục bộ nhưng không thể refresh log nếu không tạo phiên mới và nhập lại token phụ.

## Chức năng

| Phần | Nội dung |
| --- | --- |
| Đăng nhập | **Continue with Discord** qua Supabase OAuth. |
| Ngôn ngữ | Chọn English hoặc Tiếng Việt sau lần đăng nhập đầu tiên. |
| VM Instances | Xem danh sách workspace cục bộ, trạng thái và mở setup log. |
| Tạo Linux VPS | Nhập hostname, token GitHub phụ và bắt buộc xác nhận token không thuộc tài khoản chính. |
| Setup Log | Đọc trực tiếp GitHub Actions log, hiển thị nút mở SSHX khi tìm thấy URL. |
| Settings | Thay repository, xem tài khoản Discord và đăng xuất. |

## Thiết lập Discord qua Supabase

1. Tạo project tại [Supabase](https://supabase.com/dashboard), vào **Authentication → Providers** và bật **Discord**.
2. Tạo application tại [Discord Developer Portal](https://discord.com/developers/applications); đưa **Client ID** và **Client Secret** vào Discord provider của Supabase.
3. Đăng ký callback Supabase trong Discord Developer Portal:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

4. Trong **Supabase → Authentication → URL Configuration**, thêm URL website đã host, chẳng hạn:

```text
https://<your-domain>/
https://<your-domain>/**
```

Supabase giữ Discord client secret tại provider. Website chỉ nhận **Project URL** và **publishable key**, các giá trị công khai cần để client xác thực.[1]

## GitHub Actions provisioning

Workflow [`.github/workflows/provision-linux.yml`](./.github/workflows/provision-linux.yml) nhận hostname bằng `workflow_dispatch`, kiểm tra dữ liệu đầu vào, cài package hệ thống, đặt hostname cho runner rồi chạy:

```bash
curl -sSf https://sshx.io/get | sh && sshx
```

Token GitHub phụ cần quyền tối thiểu để dispatch workflow và xem Actions runs/jobs/logs của repository đã cấu hình.[2]

## GitHub Repository Secrets

Trong **MinhNekYT/App → Settings → Secrets and variables → Actions**, thêm:

| Secret | Mục đích |
| --- | --- |
| `EXPO_PUBLIC_GITHUB_REPOSITORY` | Repository được dùng để tạo workspace, ví dụ `MinhNekYT/App`. |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL Supabase cho Discord login. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key Supabase cho client web. |
| `RELEASE_GITHUB_TOKEN` | Tùy chọn; nếu trống workflow dùng `github.token` để tạo Release. |

Không đưa Discord client secret hoặc token GitHub phụ vào repository secrets dành cho static web build, source code hay cấu hình website. Token GitHub phụ luôn do người dùng nhập trực tiếp khi tạo workspace.

## Build và phát hành website

Mở **Actions → Build and Release FrierenCloud Web → Run workflow**, nhập version semantic như `1.0.0`. Workflow sẽ cài package hệ thống qua `apt-get`, chạy TypeScript và Vitest, export static web vào `dist/`, nén thành `FrierenCloud-1.0.0-web.zip`, rồi upload lên GitHub Release **Version 1.0.0**.

Bạn có thể host nội dung giải nén của archive bằng bất kỳ static host nào hoặc VPS có web server. Không cần Node API bridge cho website này.

## Kiểm tra local

```bash
pnpm check
pnpm test
pnpm web:build
```

## Tài liệu tham khảo

[1]: https://supabase.com/docs/guides/auth/social-login/auth-discord "Supabase: Login with Discord"
[2]: https://docs.github.com/rest/actions/workflows "GitHub REST API: Workflows"
