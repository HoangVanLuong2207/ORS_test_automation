from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator

def click_element(driver, wait, data, variables):
    """Click vào một phần tử trên trang."""
    by, selector = resolve_locator(node_data)
    if not selector:
        print("[CLICK][WARN] Không có selector.", flush=True)
        return

    print(f"[CLICK] Đang tìm phần tử: {selector}", flush=True)
    element = wait.until(EC.element_to_be_clickable((by, selector)))
    element.click()
    print(f"[CLICK] Đã click thành công.", flush=True)
