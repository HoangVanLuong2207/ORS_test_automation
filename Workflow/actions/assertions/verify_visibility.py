from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator

def verify_visibility(driver, wait, node_data):
    """Kiểm tra phần tử có hiển thị hay không."""
    by, selector = resolve_locator(node_data)
    expected_val = node_data.get("visible", "Có")
    # Hỗ trợ tiếng Việt và Boolean
    if str(expected_val).lower() in ["có", "true", "yes"]:
        expected = True
    else:
        expected = False
    
    if not selector:
        print("[ASSERT][WARN] Không có selector.", flush=True)
        return

    print(f"[ASSERT] Đang kiểm tra hiển thị: {selector} (Kỳ vọng hiển thị: {expected})", flush=True)
    
    try:
        if expected:
            wait.until(EC.visibility_of_element_located((by, selector)))
            print(f"[ASSERT] ✅ THÀNH CÔNG: Phần tử đã hiển thị.", flush=True)
        else:
            wait.until(EC.invisibility_of_element_located((by, selector)))
            print(f"[ASSERT] ✅ THÀNH CÔNG: Phần tử đã ẩn.", flush=True)
    except Exception:
        status = "không hiển thị" if expected else "vẫn hiển thị"
        print(f"[ASSERT] ❌ THẤT BẠI: Phần tử {status}.", flush=True)
        raise AssertionError(f"Visibility mismatch for {selector}")
