import time
from ..resolver import resolve_locator

def verify_text(driver, wait, data, variables):
    """Kiểm tra văn bản với thông báo tiến độ mỗi 1 giây."""
    by, selector = resolve_locator(data)
    expected_text = data.get("text", "")
    timeout = int(data.get("timeout", 15))
    
    if not selector:
        print("[ASSERT][WARN] Không có selector.", flush=True)
        return

    print(f"[ASSERT] 🔍 Bắt đầu kiểm tra: '{expected_text}' tại {selector}", flush=True)
    print(f"[ASSERT] ⏳ Thời gian chờ tối đa: {timeout} giây.", flush=True)

    start_time = time.time()
    elapsed = 0
    
    while elapsed < timeout:
        try:
            # Kiểm tra xem phần tử có tồn tại không
            element = driver.find_element(by, selector)
            actual_text = element.text
            
            if expected_text in actual_text:
                print(f"[ASSERT] ✅ THÀNH CÔNG (sau {int(elapsed)}s): Đã tìm thấy văn bản mong đợi.", flush=True)
                return  # Kết thúc bước thành công
            
        except Exception:
            # Nếu chưa thấy element, im lặng đợi tiếp
            pass

        time.sleep(1)
        elapsed = time.time() - start_time

    # Nếu thoát vòng lặp mà không return -> Hết timeout
    print(f"[ASSERT] ❌ THẤT BẠI: Đã đợi đủ {timeout}s nhưng không thỏa mãn.", flush=True)
    try:
        element = driver.find_element(by, selector)
        raise AssertionError(f"Hết thời gian: Mong đợi '{expected_text}' nhưng thực tế là '{element.text}'")
    except:
        raise AssertionError(f"Hết thời gian: Không tìm thấy phần tử '{selector}' sau {timeout}s")
