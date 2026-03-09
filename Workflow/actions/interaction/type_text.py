from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator

def type_text(driver, wait, node_data, variables):
    """Nhập text vào một phần tử trên trang."""
    by, selector = resolve_locator(node_data)
    text = node_data.get("text", "")
    if not selector:
        print("[TYPE][WARN] Không có selector.", flush=True)
        return

    print(f"[TYPE] Đang tìm phần tử: {selector}", flush=True)
    element = wait.until(EC.presence_of_element_located((by, selector)))
    element.clear()
    element.send_keys(text)
    print(f"[TYPE] Đã nhập '{text}' thành công.", flush=True)
