from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from ..resolver import resolve_locator

def if_condition(driver, wait, node_data):
    """
    Kiểm tra điều kiện và trả về 'true' hoặc 'false' để rẽ nhánh.
    """
    variable = node_data.get("variable", "")
    operator = node_data.get("operator", "Equals")
    value = node_data.get("value", "")
    
    # Sử dụng resolve_locator chuẩn để lấy element
    by, selector = resolve_locator(node_data)
    
    # Fallback cho kịch bản cũ dùng trường 'variable'
    if not selector:
        selector = node_data.get("variable", "")
        if selector.startswith("//") or selector.startswith("/"):
            by = By.XPATH
        elif selector.startswith("#") or selector.startswith("."):
            by = By.CSS_SELECTOR
        else:
            by = By.XPATH

    print(f"[IF] Đang kiểm tra điều kiện trên: {selector} (Toán tử: {operator}, Giá trị: {value})", flush=True)
    
    target_text = ""
    exists = False
    
    if not selector:
        print("[IF][WARN] Không có selector hoặc biến để kiểm tra.", flush=True)
        return "false"
        
    try:
        from selenium.webdriver.support.ui import WebDriverWait
        short_wait = WebDriverWait(driver, 2)
        element = short_wait.until(EC.presence_of_element_located((by, selector)))
        exists = True
        target_text = element.text
    except Exception:
        exists = False
        target_text = ""

    result = False
    if operator in ["Exists", "Tồn tại"]:
        result = exists
    elif operator in ["Equals", "Bằng"]:
        result = (target_text == value)
    elif operator in ["Contains", "Chứa"]:
        result = (value in target_text)
    elif operator in ["Matches", "Khớp (Regex)"]:
        import re
        result = bool(re.search(value, target_text))
        
    print(f"[IF] Kết quả: {result}", flush=True)
    return "true" if result else "false"
