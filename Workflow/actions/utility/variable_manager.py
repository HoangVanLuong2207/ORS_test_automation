from .get_text import get_text
from .get_attribute import get_attribute

def variable_manager(driver, wait, data, variables):
    """
    Hành động hợp nhất: Lấy văn bản, thuộc tính hoặc gán giá trị tĩnh.
    """
    action_type = data.get("type", "Gán giá trị cố định")
    
    if action_type == "Lấy văn bản (Web)":
        return get_text(driver, wait, data, variables)
    
    elif action_type == "Lấy thuộc tính (Web)":
        return get_attribute(driver, wait, data, variables)
    
    else: # Gán giá trị cố định
        name = data.get("variable")
        value = data.get("value")
        if name:
            variables[name] = value
            print(f"[VAR-MANAGER] Da gan bien tinh: {name} = {value}", flush=True)
        else:
            print("[VAR-MANAGER][WARN] Thieu ten bien de gan gia tri tinh.", flush=True)
