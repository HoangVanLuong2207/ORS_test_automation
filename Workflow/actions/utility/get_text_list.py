from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator
import re

def get_text_list(driver, wait, data, variables):
    """Lấy danh sách văn bản của tất cả các phần tử khớp với selector và gán vào biến mảng."""
    by, selector = resolve_locator(data)
    var_name = data.get("variable")
    regex = data.get("regex")

    if not selector:
        print("[GET-TEXT-LIST][WARN] Không có selector.", flush=True)
        return

    if not var_name:
        print("[GET-TEXT-LIST][WARN] Không có tên biến được chỉ định.", flush=True)
        return

    try:
        # Chờ ít nhất một phần tử xuất hiện
        wait.until(EC.presence_of_element_located((by, selector)))
        elements = driver.find_elements(by, selector)
        
        results = []
        for element in elements:
            text_value = element.text
            
            if regex:
                match = re.search(regex, text_value)
                if match:
                    # Lấy group 1 nếu có, nếu không lấy group 0
                    val = match.group(1) if match.groups() else match.group(0)
                    results.append(val)
                # Nếu không khớp Regex thì bỏ qua phần tử này trong danh sách
            else:
                results.append(text_value)

        variables[var_name] = results
        print(f"[GET-TEXT-LIST] Đã lấy {len(results)} giá trị vào biến mảng: {var_name}", flush=True)
        for i, val in enumerate(results[:5]): # Log 5 cái đầu tiên để debug
            print(f"  [{i}] {val}", flush=True)
        if len(results) > 5:
            print(f"  ... và {len(results) - 5} giá trị khác.", flush=True)
            
    except Exception as e:
        print(f"[GET-TEXT-LIST][ERROR] Không thể lấy danh sách văn bản: {e}", flush=True)
