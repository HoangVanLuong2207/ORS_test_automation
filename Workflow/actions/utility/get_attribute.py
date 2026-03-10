from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator

def get_attribute(driver, wait, data, variables):
    """Lấy giá trị thuộc tính của một phần tử và gán vào biến."""
    by, selector = resolve_locator(data)
    attribute = data.get("attribute")
    var_name = data.get("variable")

    if not selector or not attribute or not var_name:
        print("[GET-ATTR][WARN] Thiếu thông tin (selector, attribute hoặc variable).", flush=True)
        return

    try:
        element = wait.until(EC.presence_of_element_located((by, selector)))
        attr_value = element.get_attribute(attribute)
        variables[var_name] = attr_value
        print(f"[GET-ATTR] Đã lấy '{attribute}': '{attr_value}' -> Biến: {var_name}", flush=True)
    except Exception as e:
        print(f"[GET-ATTR][ERROR] Không thể lấy thuộc tính: {e}", flush=True)
