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


def resolve_variables(data, variables):
    """
    Duyệt qua dữ liệu node (dict hoặc list) và thay thế các placeholder {{var_name}}
    bằng giá trị thực từ dictionary variables.
    Hỗ trợ:
    - {{tên_biến}}: Tự động lấy theo loop_index nếu là mảng và đang lặp.
    - {{tên_mảng[chỉ_số]}}: Lấy theo chỉ số cụ thể.
    """
    if isinstance(data, str):
        import re
        # Tìm tất cả các mẫu {{biến}}
        matches = re.findall(r'\{\{(.*?)\}\}', data)
        for match in matches:
            raw_match = match.strip()
            val = None
            
            # 1. Hỗ trợ truy cập mảng tường minh: biến[chỉ_số]
            array_match = re.match(r'^(.*?)\[(.*?)\]$', raw_match)
            if array_match:
                arr_name = array_match.group(1).strip()
                idx_key = array_match.group(2).strip()
                
                if arr_name in variables:
                    arr = variables[arr_name]
                    try:
                        if idx_key.isdigit():
                            idx = int(idx_key)
                        else:
                            idx = int(variables.get(idx_key, 0))
                        
                        if isinstance(arr, list) and 0 <= idx < len(arr):
                            val = arr[idx]
                        else:
                            val = f"[Error: Index {idx} out of range for {arr_name}]"
                    except:
                        val = f"[Error: Invalid index {idx_key}]"
            else:
                # 2. Truy cập biến thông thường hoặc "Magic Indexing" cho mảng trong loop
                if raw_match in variables:
                    val = variables[raw_match]
                    # Nếu là mảng và đang trong vòng lặp, tự động lấy phần tử hiện tại
                    if isinstance(val, list) and "loop_index" in variables:
                        try:
                            idx = int(variables["loop_index"])
                            if 0 <= idx < len(val):
                                val = val[idx]
                        except:
                            pass
            
            if val is not None:
                # Nếu kết quả vẫn là list/dict (sau khi resolve), convert sang string JSON
                if isinstance(val, (list, dict)):
                    import json
                    val = json.dumps(val, ensure_ascii=False)
                data = data.replace(f'{{{{{match}}}}}', str(val))
                
        return data
    elif isinstance(data, list):
        return [resolve_variables(item, variables) for item in data]
    elif isinstance(data, dict):
        return {k: resolve_variables(v, variables) for k, v in data.items()}
    return data


def run_flow_on_driver(driver, wait, flow_path):
    """Thực thi một flow trên driver hiện tại với khả năng rẽ nhánh (Runtime Branching)."""
    log(f"[SESSION] Đang tải kịch bản: {flow_path}")

    # Khoi tao trang thai bien runtime
    variables = {}

    with open(flow_path, 'r', encoding='utf-8') as f:
        flow_data = json.load(f)
    
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
        log("[SESSION][ERROR] Không tìm thấy Start Node!")
        return

    visited_count = {}
    MAX_LOOP = 500
    step_count = 0

    try:
        while current_node:
            node_id = current_node['id']
            raw_data = current_node.get('data', {})
            
            # Resolve biến trước khi truyền vào action
            data = resolve_variables(raw_data, variables)
            # Quan trọng: Gán ID để loop_handler nhận diện counter
            data["id"] = node_id

            action_id = data.get('originalId', '')
            label = data.get('label', action_id)

            # Loop detection
            visited_count[node_id] = visited_count.get(node_id, 0) + 1
            if visited_count[node_id] > MAX_LOOP:
                log(f"[SESSION][ERROR] Phát hiện vòng lặp vô hạn tại: {label}")
                break

            step_count += 1
            
            is_start = data.get('isStart')
            is_end = data.get('isEnd')

            branch_result = None
            if not is_start and not is_end:
                action_fn = ACTION_REGISTRY.get(action_id)
                if action_fn:
                    log(f"[SESSION] [{step_count}] Thực thi: {label}")
                    
                    # Chạy action và truyền bộ nhớ biến vào
                    import inspect
                    sig = inspect.signature(action_fn)
                    if 'variables' in sig.parameters:
                        branch_result = action_fn(driver, wait, data, variables)
                    else:
                        branch_result = action_fn(driver, wait, data)
                else:
                    log(f"[SESSION][WARN] [{step_count}] Không tìm thấy handler: '{action_id}'")
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

        log("[SESSION] ✅ Kịch bản hoàn tất thành công!")

    except Exception as e:
        log(f"[SESSION][ERROR] Lỗi khi thực thi: {str(e)}")
        # In thêm traceback để dễ debug
        import traceback
        traceback.print_exc()
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
