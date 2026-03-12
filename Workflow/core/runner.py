"""
runner.py - Bộ điều phối (Orchestrator)
========================================
Đọc file JSON flow, duyệt qua các node theo thứ tự edge,
và gọi hàm action tương ứng từ actions/ registry.

Cách sử dụng:
    python runner.py <path_to_flow.json>
"""
import sys
import json
import os

# Fix encoding cho Windows (tránh lỗi UnicodeEncodeError với tiếng Việt)
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
WORKFLOW_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, WORKFLOW_DIR)

from core.driver import create_driver, create_wait
from actions import ACTION_REGISTRY


def load_flow(flow_path):
    """Đọc file JSON flow."""
    with open(flow_path, 'r', encoding='utf-8') as f:
        return json.load(f)




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


def execute_flow(flow_path, profile_path=None):
    """
    Hàm chính: Đọc flow -> Khởi tạo driver -> Duyệt và thực thi linh hoạt (Runtime Branching).
    """
    print(f"[RUNNER] Đang tải kịch bản: {flow_path}", flush=True)
    flow_data = load_flow(flow_path)
    
    nodes = {n['id']: n for n in flow_data.get('nodes', [])}
    edges = flow_data.get('edges', [])
    
    # Bộ nhớ biến dùng chung cho toàn bộ quá trình chạy
    variables = {}

    # Map source -> [edges]
    adj = {}
    for edge in edges:
        src = edge['source']
        if src not in adj:
            adj[src] = []
        adj[src].append(edge)

    # Tìm Start Node
    current_node = None
    for node in flow_data.get('nodes', []):
        if node.get('data', {}).get('isStart'):
            current_node = node
            break

    if not current_node:
        print("[RUNNER][ERROR] Không tìm thấy Start Node!", flush=True)
        return

    # Khởi tạo driver
    print("[RUNNER] Đang khởi tạo trình duyệt...", flush=True)
    driver = create_driver(profile_path=profile_path)
    wait = create_wait(driver, timeout=15)

    visited_count = {}
    MAX_LOOP = 500  # Nâng giới hạn cho phép lặp mảng lớn hơn
    step_count = 0

    try:
        while current_node:
            node_id = current_node['id']
            # Lấy data gốc và resolve biến trước khi truyền vào action
            raw_data = current_node.get('data', {})
            data = resolve_variables(raw_data, variables)
            # Luôn giữ ID node để loop_handler nhận diện counter
            data["id"] = node_id

            action_id = data.get('originalId', '')
            label = data.get('label', action_id)

            # Loop detection
            visited_count[node_id] = visited_count.get(node_id, 0) + 1
            if visited_count[node_id] > MAX_LOOP:
                print(f"[RUNNER][ERROR] Phát hiện vòng lặp vô hạn hoặc vượt quá giới hạn ({MAX_LOOP}) tại node: {label}", flush=True)
                break

            step_count += 1
            
            # Skip Start nodes (structural)
            is_start = data.get('isStart')
            is_end = data.get('isEnd')

            branch_result = None
            if not is_start and not is_end:
                action_fn = ACTION_REGISTRY.get(action_id)
                if action_fn:
                    print(f"[RUNNER] [{step_count}] Thực thi: {label}", flush=True)
                    # Chạy action và truyền bộ nhớ biến vào
                    import inspect
                    # Kiểm tra xem hàm action có nhận tham số variables không
                    sig = inspect.signature(action_fn)
                    if 'variables' in sig.parameters:
                        branch_result = action_fn(driver, wait, data, variables)
                    else:
                        branch_result = action_fn(driver, wait, data)
                else:
                    print(f"[RUNNER][WARN] [{step_count}] Không tìm thấy action handler cho: '{action_id}'", flush=True)
            else:
                print(f"[RUNNER] [{step_count}] {label} (structural)", flush=True)

            if is_end:
                break

            # Tìm node tiếp theo
            outgoing_edges = adj.get(node_id, [])
            if not outgoing_edges:
                current_node = None
                continue

            next_node_id = None
            
            # 1. Nếu có kết quả rẽ nhánh (ví dụ: 'true', 'false'), tìm edge khớp handle
            if branch_result:
                for edge in outgoing_edges:
                    if edge.get('sourceHandle') == branch_result:
                        next_node_id = edge['target']
                        break
            
            # 2. Nếu không tìm thấy hoặc action không trả về branch, lấy edge mặc định (first edge không có handle hoặc edge đầu tiên)
            if not next_node_id:
                # Ưu tiên edge không có sourceHandle hoặc index 0
                next_node_id = outgoing_edges[0]['target']

            current_node = nodes.get(next_node_id)

        print("[RUNNER] ✅ Kịch bản hoàn tất thành công!", flush=True)

    except Exception as e:
        import traceback
        print(f"[RUNNER][ERROR] Lỗi khi thực thi: {str(e)}", flush=True)
        traceback.print_exc()

    finally:
        # driver.quit()
        print("[RUNNER] Kịch bản đã kết thúc. Trình duyệt vẫn mở để kiểm tra.", flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Cách dùng: python runner.py <flow.json> [profile_path]", flush=True)
        sys.exit(1)

    flow_file = sys.argv[1]
    profile = sys.argv[2] if len(sys.argv) > 2 else None
    execute_flow(flow_file, profile_path=profile)
