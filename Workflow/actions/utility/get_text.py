from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator
import re

def get_text(driver, wait, data, variables):
    """Lấy văn bản của một phần tử và gán vào biến."""
    by, selector = resolve_locator(data)
    var_name = data.get("variable")

    if not selector:
        print("[GET-TEXT][WARN] Không có selector.", flush=True)
        return

    if not var_name:
        print("[GET-TEXT][WARN] Không có tên biến được chỉ định.", flush=True)
        return

    try:
        element = wait.until(EC.presence_of_element_located((by, selector)))
        text_value = element.text
        
        # Apply regex filter if provided
        regex = data.get("regex")
        if regex:
            match = re.search(regex, text_value)
            if match:
                text_value = match.group(1) if match.groups() else match.group(0)
                print(f"[GET-TEXT] Regex match found: '{text_value}'", flush=True)
            else:
                print(f"[GET-TEXT][WARN] Regex '{regex}' không khớp với '{text_value}'. Lưu giá trị rỗng.", flush=True)
                text_value = ""

        variables[var_name] = text_value
        print(f"[GET-TEXT] Đã lấy: '{text_value}' -> Biến: {var_name}", flush=True)
    except Exception as e:
        print(f"[GET-TEXT][ERROR] Không thể lấy text: {e}", flush=True)
