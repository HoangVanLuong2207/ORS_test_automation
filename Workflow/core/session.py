"""
session.py - Trình quản lý phiên trình duyệt (Browser Session Daemon)
======================================================================
Chạy như một tiến trình nền (daemon). Giữ trình duyệt Chrome mở 
và nhận lệnh chạy flow qua stdin (JSON lines protocol).

Giao thức:
  - Nhận 1 dòng JSON: {"command": "run", "flow_path": "Login.json"}
  - Trả về nhiều dòng log, kết thúc bằng: {"status": "done"} hoặc {"status": "error"}
  - Nhận: {"command": "quit"} => Đóng trình duyệt và thoát.
"""
import sys
import json
import os
import traceback

# Fix encoding cho Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

WORKFLOW_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, WORKFLOW_DIR)

from core.driver import create_driver, create_wait
from actions import ACTION_REGISTRY


def build_execution_order(flow_data):
    """Duyệt graph từ Start Node theo thứ tự edges."""
    nodes = {n['id']: n for n in flow_data.get('nodes', [])}
    edges = flow_data.get('edges', [])

    adj = {}
    for edge in edges:
        src = edge['source']
        tgt = edge['target']
        if src not in adj:
            adj[src] = []
        adj[src].append(tgt)

    start_node = None
    for node in flow_data.get('nodes', []):
        if node.get('data', {}).get('isStart'):
            start_node = node
            break

    if not start_node:
        return []

    order = []
    current_id = start_node['id']
    visited = set()

    while current_id and current_id not in visited:
        visited.add(current_id)
        node = nodes.get(current_id)
        if node:
            order.append(node)
        # Lấy node tiếp theo (bỏ qua self-loop và các node đã duyệt)
        next_ids = adj.get(current_id, [])
        next_id = None
        for nid in next_ids:
            if nid != current_id and nid not in visited:
                next_id = nid
                break
        current_id = next_id

    return order


def log(msg):
    """In log và flush ngay lập tức."""
    print(msg, flush=True)


def run_flow_on_driver(driver, wait, flow_path):
    """Thực thi một flow trên driver hiện tại (KHÔNG tạo driver mới)."""
    log(f"[SESSION] Dang tai kich ban: {flow_path}")

    with open(flow_path, 'r', encoding='utf-8') as f:
        flow_data = json.load(f)

    execution_order = build_execution_order(flow_data)
    total = len(execution_order)

    if total == 0:
        log("[SESSION][ERROR] Kich ban trong hoac khong hop le.")
        return

    log(f"[SESSION] Tong so buoc: {total}")

    for i, node in enumerate(execution_order):
        data = node.get('data', {})
        action_id = data.get('originalId', '')
        label = data.get('label', action_id)

        if data.get('isStart') or data.get('isEnd'):
            log(f"[SESSION] [{i+1}/{total}] {label} (bo qua)")
            continue

        action_fn = ACTION_REGISTRY.get(action_id)
        if action_fn:
            log(f"[SESSION] [{i+1}/{total}] Thuc thi: {label}")
            action_fn(driver, wait, data)
        else:
            log(f"[SESSION][WARN] [{i+1}/{total}] Khong tim thay handler: '{action_id}'")

    log("[SESSION] Kich ban hoan tat thanh cong!")


def main():
    log("[SESSION] Dang khoi tao trinh duyet Chrome...")
    driver = create_driver()
    wait = create_wait(driver, timeout=15)
    log("[SESSION] READY")

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            try:
                cmd = json.loads(line)
            except json.JSONDecodeError:
                log(f"[SESSION][ERROR] JSON khong hop le: {line}")
                continue

            command = cmd.get("command", "")

            if command == "run":
                flow_path = cmd.get("flow_path", "")
                if not flow_path:
                    log("[SESSION][ERROR] Thieu flow_path")
                    print(json.dumps({"status": "error"}), flush=True)
                    continue

                # Resolve path relative to Workflow dir
                if not os.path.isabs(flow_path):
                    flow_path = os.path.join(WORKFLOW_DIR, flow_path)

                try:
                    run_flow_on_driver(driver, wait, flow_path)
                    print(json.dumps({"status": "done"}), flush=True)
                except Exception as e:
                    log(f"[SESSION][ERROR] {str(e)}")
                    traceback.print_exc()
                    print(json.dumps({"status": "error"}), flush=True)

            elif command == "quit":
                log("[SESSION] Dang dong trinh duyet...")
                break

            else:
                log(f"[SESSION][WARN] Lenh khong hop le: {command}")

    except (EOFError, KeyboardInterrupt):
        pass

    finally:
        try:
            driver.quit()
        except:
            pass
        log("[SESSION] Da dong trinh duyet. Tam biet!")


if __name__ == "__main__":
    main()
