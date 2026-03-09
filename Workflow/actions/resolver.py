from selenium.webdriver.common.by import By

def resolve_locator(node_data):
    """Chuyển đổi method + selector từ JSON thành (By.xxx, selector)."""
    method = node_data.get("method", "XPath")
    selector = node_data.get("selector", "")

    method_map = {
        "XPath": By.XPATH,
        "ID": By.ID,
        "Class Name": By.CLASS_NAME,
        "CSS Selector": By.CSS_SELECTOR,
    }

    by = method_map.get(method, By.XPATH)
    return by, selector
