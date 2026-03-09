import time

def wait_seconds(driver, wait, node_data, variables):
    """Dừng thực thi trong N giây."""
    seconds = float(node_data.get("seconds", 1))
    print(f"[WAIT] Đợi {seconds} giây...", flush=True)
    time.sleep(seconds)
    print(f"[WAIT] Đã hoàn tất.", flush=True)
