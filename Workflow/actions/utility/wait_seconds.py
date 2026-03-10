import time

def wait_seconds(driver, wait, data, variables):
    """Dừng thực thi trong N giây."""
    seconds = float(data.get("seconds", 1))
    print(f"[WAIT] Đợi {seconds} giây...", flush=True)
    time.sleep(seconds)
    print(f"[WAIT] Đã hoàn tất.", flush=True)
