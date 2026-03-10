from selenium.webdriver.common.by import By

def resolve_locator(data):
    """Chuyển đổi method + selector từ JSON thành (By.xxx, selector)."""
    method = data.get("method", "XPath")
    selector = data.get("selector", "")

    method_map = {
        "XPath": By.XPATH,
        "ID": By.ID,
        "Class Name": By.CLASS_NAME,
        "CSS Selector": By.CSS_SELECTOR,
    }

    by = method_map.get(method, By.XPATH)
    return by, selector
