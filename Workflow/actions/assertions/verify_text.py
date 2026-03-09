from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator

def verify_text(driver, wait, node_data, variables):
    """Kiểm tra xem phần tử có chứa text mong muốn không."""
    by, selector = resolve_locator(node_data)
    expected_text = node_data.get("text", "")
    
    if not selector:
        print("[ASSERT][WARN] Không có selector.", flush=True)
        return

    print(f"[ASSERT] Đang kiểm tra văn bản tại: {selector} (Mong đợi: '{expected_text}')", flush=True)
    element = wait.until(EC.presence_of_element_located((by, selector)))
    actual_text = element.text
    
    if expected_text in actual_text:
        print(f"[ASSERT] ✅ THÀNH CÔNG: Tìm thấy '{expected_text}'", flush=True)
    else:
        print(f"[ASSERT] ❌ THẤT BẠI: Mong đợi '{expected_text}' nhưng nhận được '{actual_text}'", flush=True)
        raise AssertionError(f"Text mismatch: Expected '{expected_text}' but got '{actual_text}'")
