from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions as EC
from ..resolver import resolve_locator

def hover_element(driver, wait, node_data):
    """Rê chuột (hover) vào một phần tử trên trang."""
    by, selector = resolve_locator(node_data)
    if not selector:
        print("[HOVER][WARN] Không có selector.", flush=True)
        return

    print(f"[HOVER] Đang tìm phần tử để hover: {selector}", flush=True)
    element = wait.until(EC.presence_of_element_located((by, selector)))
    
    actions = ActionChains(driver)
    actions.move_to_element(element).perform()
    
    print(f"[HOVER] Đã hover thành công.", flush=True)
