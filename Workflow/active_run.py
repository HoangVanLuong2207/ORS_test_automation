
import time
import os
import sys
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Cấu hình Chrome Profile (Dùng cho Garena/Dichhvu Profiles)
def init_driver(profile_path=None):
    chrome_options = Options()
    # chrome_options.add_argument("--start-maximized")
    # chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    
    if profile_path:
        chrome_options.add_argument(f"user-data-dir={profile_path}")
    
    # Ở đây dùng chromedriver mặc định hoặc bạn có thể chỉ định path cụ thể
    # service = Service(executable_path="path/to/chromedriver.exe")
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def run_automation():
    print("[SYSTEM] Khởi tạo quy trình tự động hóa...")
    driver = init_driver()
    wait = WebDriverWait(driver, 10)
    
    try:
        # Thực thi: 🚀 Bắt đầu kịch bản

        # Thực thi: 🌍 Open URL
        print("[ACTION] Mở URL: https://dhv.ors.vn/dashboard/analysis")
        driver.get('https://dhv.ors.vn/dashboard/analysis')

        # Thực thi: ⌨️ Type Text
        print('[ACTION] Nhập văn bản vào: //*[@id="form_item_account"]')
        wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="form_item_account"]'))).send_keys("")

        # Thực thi: ⌨️ Type Text
        print('[ACTION] Nhập văn bản vào: //*[@id="form_item_password"]')
        wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="form_item_password"]'))).send_keys("")

        # Thực thi: 🖱️ Mouse Click
        print('[ACTION] Click chuột: /html/body/div[1]/div/div[2]/div/div[2]/div/form/div[5]/div/div/div/div/button/span[2]')
        wait.until(EC.presence_of_element_located((By.XPATH, '/html/body/div[1]/div/div[2]/div/div[2]/div/form/div[5]/div/div/div/div/button/span[2]'))).click()

        # Thực thi: 🏁 Kết thúc
        print("[SYSTEM] Luồng kết thúc thành công.")


    except Exception as e:
        print(f"[ERROR] Đã xảy ra lỗi: {str(e)}")
    finally:
        # time.sleep(5)
        # driver.quit()
        print("[SYSTEM] Trình duyệt đã đóng.")

if __name__ == "__main__":
    run_automation()
