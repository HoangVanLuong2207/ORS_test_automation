from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator

def get_text(driver, wait, node_data, variables):
    """Lấy văn bản của một phần tử và gán vào biến."""
    by, selector = resolve_locator(node_data)
    var_name = node_data.get("variable")

    if not selector:
        print("[GET-TEXT][WARN] Không có selector.", flush=True)
        return

    if not var_name:
        print("[GET-TEXT][WARN] Không có tên biến được chỉ định.", flush=True)
        return

    try:
        element = wait.until(EC.presence_of_element_located((by, selector)))
        text_value = element.text
        variables[var_name] = text_value
        print(f"[GET-TEXT] Đã lấy: '{text_value}' -> Biến: {{var_name}}", flush=True)
    except Exception as e:
        print(f"[GET-TEXT][ERROR] Không thể lấy text: {e}", flush=True)
