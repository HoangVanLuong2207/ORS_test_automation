import os
from datetime import datetime

def take_screenshot(driver, wait, data, variables):
    """Chụp ảnh màn hình trình duyệt."""
    # Tạo thư mục screenshots nếu chưa có
    os.makedirs("screenshots", exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = data.get("filename", f"screenshot_{timestamp}.png")
    filepath = os.path.join("screenshots", filename)
    
    print(f"[UTILITY] Đang chụp ảnh màn hình: {filepath}", flush=True)
    driver.save_screenshot(filepath)
    print(f"[UTILITY] Đã chụp ảnh thành công.", flush=True)
