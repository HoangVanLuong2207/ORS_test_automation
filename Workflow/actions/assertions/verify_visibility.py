import time
from ..resolver import resolve_locator

def verify_visibility(driver, wait, data, variables):
    """Kiểm tra phần tử có hiển thị hay không với thông báo tiến độ mỗi 1 giây."""
    by, selector = resolve_locator(data)
    expected_val = data.get("visible", "Có")
    timeout = int(data.get("timeout", 15))
    
    # Hỗ trợ tiếng Việt và Boolean
    if str(expected_val).lower() in ["có", "true", "yes"]:
        expected = True
    else:
        expected = False
    
    if not selector:
        print("[ASSERT][WARN] Không có selector.", flush=True)
        return

    print(f"[ASSERT] 👁️ Kiểm tra hiển thị: {selector} (Kỳ vọng: {expected})", flush=True)
    print(f"[ASSERT] ⏳ Thời gian chờ tối đa: {timeout} giây.", flush=True)

    start_time = time.time()
    elapsed = 0
    
    while elapsed < timeout:
        try:
            element = driver.find_element(by, selector)
            is_displayed = element.is_displayed()
            
            if is_displayed == expected:
                status_str = "đang hiển thị" if is_displayed else "đang ẩn"
                print(f"[ASSERT] ✅ THÀNH CÔNG (sau {int(elapsed)}s): Phần tử {status_str} đúng như mong đợi.", flush=True)
                return
            
        except Exception:
            # Nếu không tìm thấy element
            if not expected: # Nếu đang mong đợi "Ẩn" và không tìm thấy thì là SUCCESS
                print(f"[ASSERT] ✅ THÀNH CÔNG (sau {int(elapsed)}s): Không tìm thấy phần tử (đúng yêu cầu Ẩn).", flush=True)
                return
            # Nếu đang mong hiển thị mà chưa thấy, im lặng đợi tiếp

        time.sleep(1)
        elapsed = time.time() - start_time

    # Hết timeout
    status_needed = "hiển thị" if expected else "ẩn"
    print(f"[ASSERT] ❌ THẤT BẠI: Đã đợi đủ {timeout}s nhưng phần tử không {status_needed}.", flush=True)
    raise AssertionError(f"Visibility mismatch for {selector} after {timeout}s")
