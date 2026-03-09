"""
driver.py - Quản lý khởi tạo trình duyệt Chrome / Profile
===========================================================
Bạn có thể tùy chỉnh file này để:
  - Thay đổi đường dẫn chromedriver
  - Chỉ định Chrome Profile (như các profile Garena)
  - Thêm các tùy chọn stealth (disable-blink-features, v.v.)
"""
import sys
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait


def create_driver(profile_path=None, headless=False):
    """Khởi tạo Chrome WebDriver với các tùy chọn tùy biến."""
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])

    if headless:
        chrome_options.add_argument("--headless=new")

    if profile_path:
        chrome_options.add_argument(f"user-data-dir={profile_path}")

    try:
        driver = webdriver.Chrome(options=chrome_options)
        print("[DRIVER] Trình duyệt Chrome đã khởi tạo thành công.", flush=True)
        return driver
    except Exception as e:
        print(f"[DRIVER][ERROR] Không thể khởi tạo Chrome: {e}", flush=True)
        sys.exit(1)


def create_wait(driver, timeout=10):
    """Tạo WebDriverWait instance."""
    return WebDriverWait(driver, timeout)
