/**
 * Python Compiler for Mind-Map Test Builder
 * Converts React Flow JSON (Nodes & Edges) into executable Python Selenium scripts.
 */

export const compileJsonToPython = (jsonData) => {
    const { nodes, edges } = jsonData;

    // Find the start node
    const startNode = nodes.find(n => n.data?.isStart);
    if (!startNode) return "# Lỗi: Không tìm thấy điểm bắt đầu (Start Node)";

    // Build a map for easy traversal
    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const edgeMap = new Map();
    edges.forEach(e => {
        if (!edgeMap.has(e.source)) edgeMap.set(e.source, []);
        edgeMap.get(e.source).push(e.target);
    });

    let pythonCode = `
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
`;

    // Start traversing from start node
    let currentNodeId = startNode.id;
    const visitedNodes = new Set();

    // Simple linear traversal for now
    while (currentNodeId) {
        if (visitedNodes.has(currentNodeId)) break;
        visitedNodes.add(currentNodeId);

        const node = nodeMap.get(currentNodeId);
        if (!node) break;

        const { data } = node;
        const actionType = data.originalId;

        pythonCode += `        # Thực thi: ${data.label || actionType}\n`;

        switch (actionType) {
            case 'open-url':
                pythonCode += `        print("[ACTION] Mở URL: ${data.url}")\n`;
                pythonCode += `        driver.get('${data.url}')\n`;
                break;

            case 'mouse-click':
                pythonCode += `        print('[ACTION] Click chuột: ${data.selector}')\n`;
                pythonCode += generateSeleniumSelector(data, "click()") + "\n";
                break;

            case 'type-text':
                pythonCode += `        print('[ACTION] Nhập văn bản vào: ${data.selector}')\n`;
                pythonCode += generateSeleniumSelector(data, `send_keys("${data.text || ''}")`) + "\n";
                break;

            case 'wait-time':
                pythonCode += `        print("[ACTION] Đợi ${data.seconds} giây...")\n`;
                pythonCode += `        time.sleep(${data.seconds || 1})\n`;
                break;

            case 'end-flow':
                pythonCode += `        print("[SYSTEM] Luồng kết thúc thành công.")\n`;
                break;
        }

        // Move to next node
        const nextNodeIds = edgeMap.get(currentNodeId);
        if (nextNodeIds && nextNodeIds.length > 0) {
            currentNodeId = nextNodeIds[0]; // Take first edge (simple logic)
        } else {
            currentNodeId = null;
        }

        pythonCode += `\n`;
    }

    pythonCode += `
    except Exception as e:
        print(f"[ERROR] Đã xảy ra lỗi: {str(e)}")
    finally:
        # time.sleep(5)
        # driver.quit()
        print("[SYSTEM] Trình duyệt đã đóng.")

if __name__ == "__main__":
    run_automation()
`;

    return pythonCode;
};

const generateSeleniumSelector = (data, action) => {
    const method = data.method || 'XPath';
    let selectorType = "XPATH";

    if (method === "ID") selectorType = "ID";
    else if (method === "Class Name") selectorType = "CLASS_NAME";
    else if (method === "CSS Selector") selectorType = "CSS_SELECTOR";

    // Use single quotes and escape them to handle double quotes in XPath safely
    const safeSelector = data.selector?.replace(/'/g, "\\'");
    return `        wait.until(EC.presence_of_element_located((By.${selectorType}, '${safeSelector}'))).${action}`;
};
