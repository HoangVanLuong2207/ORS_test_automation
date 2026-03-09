# ORS Test Automation 🚀

Chào mừng bạn đến với hệ thống tự động hóa kịch bản kiểm thử dựa trên sơ đồ tư duy (Mind-map). Hệ thống này cho phép bạn xây dựng, quản lý và thực thi các luồng tự động hóa trình duyệt một cách trực quan.

## 🌟 Tính năng chính
- **Mind-Map Flow Builder**: Xây dựng kịch bản bằng cách kéo thả các node hành động (Click, Type, Open URL, Logic...).
- **AI Flow Summarizer**: Tóm tắt kịch bản của bạn thành văn bản thuần túy bằng AI dựa trên các ghi chú.
- **Execution Dashboard**: Chạy kịch bản trực tiếp trên trình duyệt Chrome và theo dõi log thời gian thực.
- **Stealth Mode**: Tích hợp các kỹ thuật tránh phát hiện bot (Automation controlled, Blink features).

---

## 🛠 Hướng dẫn cài đặt

Để chạy được dự án này, máy bạn cần cài đặt **Node.js** và **Python 3**.

### 1. Cài đặt Node.js (Frontend & API Server)
Dự án sử dụng Vite và React.

```bash
# Di chuyển vào thư mục dự án
cd ORS_testautomation

# Cài đặt các thư viện Node.js
npm install
```

### 2. Cài đặt Python (Runner Engine)
Trình điều khiển trình duyệt được viết bằng Python Selenium.

```bash
# Cài đặt Selenium
pip install selenium
```

*Lưu ý: Hãy đảm bảo bạn đã cài đặt trình duyệt **Google Chrome** mới nhất trên máy.*

---

## 🚀 Cách khởi chạy

### Bước 1: Chạy Server phát triển
Mở terminal tại thư mục gốc và chạy lệnh:

```bash
npm run dev
```
Sau đó, truy cập địa chỉ: `http://localhost:5173`

### Bước 2: Khởi tạo trình duyệt (Trong App)
Để chạy được kịch bản, bạn cần:
1. Nhấn vào nút **"Chạy Flow"** ở thanh sidebar bên trái để sang chế độ Runner.
2. Nhấn nút **"Khởi tạo trình duyệt"**. Một cửa sổ Chrome sẽ hiện ra và được giữ mở để nhận lệnh.

### Bước 3: Thực thi kịch bản
1. Quay lại tab **Builder** để thiết kế flow.
2. Nhấn **"Lưu kịch bản"** (hoặc Tải kịch bản `.json` có sẵn).
3. Sang tab **Runner**, chọn kịch bản và nhấn nút **Play** (hoặc Run).

---

## 📁 Cấu trúc dự án
- `src/`: Mã nguồn giao diện chính (React).
- `vite.config.js`: Nơi chứa backend API (Middleware) xử lý lưu file và giao tiếp với Python.
- `Workflow/`: 
  - `core/`: Chứa engine điều khiển trình duyệt (Python).
  - `actions/`: Chứa mã nguồn cho các hành động riêng lẻ (Click, Type...).
  - `Login.json`: File kịch bản mẫu.

---

## 💡 Lưu ý cho người mới
- Mỗi node hành động có phần **"Ghi chú cho AI"**. Hãy điền vào đây để tính năng **Tóm tắt AI** hoạt động chính xác nhất.
- Hệ thống hỗ trợ rẽ nhánh logic (Branching) dựa trên kết quả trả về của các node kiểm tra.

Chúc bạn có những trải nghiệm tự động hóa tuyệt vời! 🛠️✨
