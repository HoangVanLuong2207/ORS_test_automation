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



def log(msg):
    """In log và flush ngay lập tức."""
    print(msg, flush=True)


def resolve_vars(text, variables):
    """Thay thế {{var_name}} bằng giá trị từ variables."""
    if not isinstance(text, str):
        return text
    import re
    def replacer(match):
        var_name = match.group(1).strip()
        return str(variables.get(var_name, match.group(0)))
    return re.sub(r'\{\{(.*?)\}\}', replacer, text)


def run_flow_on_driver(driver, wait, flow_path):
    """Thực thi một flow trên driver hiện tại với khả năng rẽ nhánh (Runtime Branching)."""
    log(f"[SESSION] Dang tai kich ban: {flow_path}")

    # Khoi tao trang thai bien runtime
    variables = {}

    with open(flow_path, 'r', encoding='utf-8') as f:
        flow_data = json.load(f)
    
    # ... (giữ nguyên logic nodes, edges, adj)
    nodes = {n['id']: n for n in flow_data.get('nodes', [])}
    edges = flow_data.get('edges', [])
    adj = {}
    for edge in edges:
        src = edge['source']
        if src not in adj: adj[src] = []
        adj[src].append(edge)

    # Tìm Start Node
    current_node = None
    for node in flow_data.get('nodes', []):
        if node.get('data', {}).get('isStart'):
            current_node = node
            break

    if not current_node:
        log("[SESSION][ERROR] Khong tim thay Start Node!")
        return

    visited_count = {}
    MAX_LOOP = 50
    step_count = 0

    try:
        while current_node:
            node_id = current_node['id']
            data = current_node.get('data', {})
            action_id = data.get('originalId', '')
            label = data.get('label', action_id)

            # Loop detection
            visited_count[node_id] = visited_count.get(node_id, 0) + 1
            if visited_count[node_id] > MAX_LOOP:
                log(f"[SESSION][ERROR] Phat hien vong lap vo han tai: {label}")
                break

            step_count += 1
            
            is_start = data.get('isStart')
            is_end = data.get('isEnd')

            branch_result = None
            if not is_start and not is_end:
                action_fn = ACTION_REGISTRY.get(action_id)
                if action_fn:
                    log(f"[SESSION] [{step_count}] Thuc thi: {label}")
                    # Resolving variables trong data truoc khi truyen vao action
                    resolved_data = {}
                    for k, v in data.items():
                        resolved_data[k] = resolve_vars(v, variables)
                    
                    branch_result = action_fn(driver, wait, resolved_data, variables)
                else:
                    log(f"[SESSION][WARN] [{step_count}] Khong tim thay handler: '{action_id}'")
            else:
                log(f"[SESSION] [{step_count}] {label} (structural)")

            if is_end:
                break

            # Tìm node tiếp theo
            outgoing_edges = adj.get(node_id, [])
            if not outgoing_edges:
                current_node = None
                continue

            next_node_id = None
            if branch_result:
                for edge in outgoing_edges:
                    if edge.get('sourceHandle') == branch_result:
                        next_node_id = edge['target']
                        break
            
            if not next_node_id:
                next_node_id = outgoing_edges[0]['target']

            current_node = nodes.get(next_node_id)

        log("[SESSION] Kich ban hoan tat thanh công!")

    except Exception as e:
        log(f"[SESSION][ERROR] Loi khi thuc thi: {str(e)}")
        raise e


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
