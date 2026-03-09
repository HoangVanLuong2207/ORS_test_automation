import time

def open_url(driver, wait, node_data):
    """Mở một URL trong trình duyệt."""
    url = node_data.get("url", "")
    if not url:
        print("[NAVIGATION][WARN] Không có URL được cung cấp.", flush=True)
        return

    print(f"[NAVIGATION] Đang mở: {url}", flush=True)
    driver.get(url)
    time.sleep(1)  # Chờ trang load cơ bản
    print(f"[NAVIGATION] Đã mở thành công: {driver.title}", flush=True)
