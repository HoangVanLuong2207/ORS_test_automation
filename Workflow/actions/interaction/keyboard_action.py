from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains

def press_key(driver, wait, data, variables):
    """Nhấn một phím chức năng đơn lẻ (ENTER, TAB, ESCAPE, v.v.)."""
    key_name = data.get("key", "ENTER").upper()
    count = int(data.get("count", 1) or 1)
    
    # Map string to Selenium Keys
    key_map = {
        "ENTER": Keys.ENTER,
        "TAB": Keys.TAB,
        "ESCAPE": Keys.ESCAPE,
        "BACKSPACE": Keys.BACKSPACE,
        "DELETE": Keys.DELETE,
        "UP": Keys.UP,
        "DOWN": Keys.DOWN,
        "LEFT": Keys.LEFT,
        "RIGHT": Keys.RIGHT,
        "SPACE": Keys.SPACE,
        "F5": Keys.F5,
    }
    
    key_to_press = key_map.get(key_name, Keys.ENTER)
    
    print(f"[KEYBOARD] Đang nhấn phím: {key_name} ({count} lần)", flush=True)
    actions = ActionChains(driver)
    for _ in range(count):
        actions.send_keys(key_to_press)
    actions.perform()
    print(f"[KEYBOARD] Đã nhấn phím {key_name} {count} lần thành công.", flush=True)

def key_combination(driver, wait, data, variables):
    """Nhấn tổ hợp phím (ví dụ: CONTROL + A)."""
    modifier_name = data.get("modifier", "CONTROL").upper()
    key_to_combine = data.get("key", "").lower()
    count = int(data.get("count", 1) or 1)
    
    modifier_map = {
        "CONTROL": Keys.CONTROL,
        "SHIFT": Keys.SHIFT,
        "ALT": Keys.ALT,
        "COMMAND": Keys.COMMAND,
    }
    
    modifier = modifier_map.get(modifier_name, Keys.CONTROL)
    
    if not key_to_combine:
        print("[KEYBOARD][WARN] Phím kết hợp trống.", flush=True)
        return

    print(f"[KEYBOARD] Đang nhấn tổ hợp: {modifier_name} + {key_to_combine} ({count} lần)", flush=True)
    
    actions = ActionChains(driver)
    for _ in range(count):
        actions.key_down(modifier).send_keys(key_to_combine).key_up(modifier)
    actions.perform()
    
    print(f"[KEYBOARD] Đã thực hiện tổ hợp {modifier_name} + {key_to_combine} {count} lần thành công.", flush=True)
