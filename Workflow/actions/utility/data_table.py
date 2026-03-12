import csv
import io

def data_table(driver, wait, data, variables):
    """
    Xử lý bảng dữ liệu tập trung (Excel-style).
    Tách các cột trong CSV thành các mảng biến riêng biệt trong bộ nhớ.
    """
    data_table_str = data.get("data_table", "")
    if not data_table_str:
        print("[DATA-TABLE][WARN] Bảng dữ liệu trống.", flush=True)
        return

    # Sử dụng StringIO và csv reader để xử lý định dạng CSV chuẩn
    f = io.StringIO(data_table_str.strip())
    reader = csv.reader(f)
    
    try:
        # Dòng đầu tiên là tiêu đề (tên biến)
        headers = [h.strip() for h in next(reader) if h.strip()]
        if not headers:
            print("[DATA-TABLE][ERROR] Không tìm thấy tiêu đề cột.", flush=True)
            return

        # Khởi tạo các mảng rỗng cho mỗi tiêu đề
        for h in headers:
            variables[h] = []
        
        # Đọc dữ liệu các dòng tiếp theo
        row_count = 0
        for row in reader:
            if not any(row): continue # Bỏ qua dòng hoàn toàn trống
            row_count += 1
            for i, val in enumerate(row):
                if i < len(headers):
                    variables[headers[i]].append(val.strip())
        
        print(f"[DATA-TABLE] ✅ Đã nạp bảng: {', '.join(headers)}. Tổng cộng {row_count} dòng dữ liệu.", flush=True)
        
    except StopIteration:
        print("[DATA-TABLE][ERROR] Bảng dữ liệu không có nội dung.", flush=True)
    except Exception as e:
        print(f"[DATA-TABLE][ERROR] Lỗi khi xử lý bảng: {e}", flush=True)
