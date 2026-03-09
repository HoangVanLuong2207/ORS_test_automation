from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator

def wait_element(driver, wait, node_data, variables):
    """Đợi phần tử xuất hiện hoặc biến mất."""
    by, selector = resolve_locator(node_data)
    condition = node_data.get("condition", "visible") # visible, hidden, present
    # Hỗ trợ tiếng Việt
    condition_map = {
        "Hiển thị": "visible",
        "Ẩn": "hidden",
        "Có mặt (DOM)": "present"
    }
    condition = condition_map.get(condition, condition)
    
    timeout = int(node_data.get("timeout", 10))
    
    if not selector:
        print("[WAIT_EL][WARN] Không có selector.", flush=True)
        return

    print(f"[WAIT_EL] Đang đợi '{selector}' ở trạng thái: {condition} (timeout: {timeout}s)", flush=True)
    
    from selenium.webdriver.support.ui import WebDriverWait
    custom_wait = WebDriverWait(driver, timeout)
    
    if condition == "visible":
        custom_wait.until(EC.visibility_of_element_located((by, selector)))
    elif condition == "hidden":
        custom_wait.until(EC.invisibility_of_element_located((by, selector)))
    elif condition == "present":
        custom_wait.until(EC.presence_of_element_located((by, selector)))
        
    print(f"[WAIT_EL] Điều kiện đã thỏa mãn.", flush=True)
