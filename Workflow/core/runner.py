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




def execute_flow(flow_path, profile_path=None):
    """
    Hàm chính: Đọc flow -> Khởi tạo driver -> Duyệt và thực thi linh hoạt (Runtime Branching).
    """
    print(f"[RUNNER] Đang tải kịch bản: {flow_path}", flush=True)
    flow_data = load_flow(flow_path)
    
    nodes = {n['id']: n for n in flow_data.get('nodes', [])}
    edges = flow_data.get('edges', [])
    
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
                print(f"[RUNNER][ERROR] Phát hiện vòng lặp vô hạn tại node: {label}", flush=True)
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
                    # Chạy action và lấy kết quả rẽ nhánh (nếu có)
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
        print(f"[RUNNER][ERROR] Lỗi khi thực thi: {str(e)}", flush=True)

    finally:
        # Giữ trình duyệt mở để người dùng kiểm tra
        # Nếu muốn tự đóng, bỏ comment dòng dưới:
        # driver.quit()
        print("[RUNNER] Kịch bản đã kết thúc. Trình duyệt vẫn mở để kiểm tra.", flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Cách dùng: python runner.py <flow.json> [profile_path]", flush=True)
        sys.exit(1)

    flow_file = sys.argv[1]
    profile = sys.argv[2] if len(sys.argv) > 2 else None
    execute_flow(flow_file, profile_path=profile)
