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


def build_execution_order(flow_data):
    """
    Duyệt graph từ Start Node theo thứ tự edges.
    Trả về danh sách nodes theo thứ tự thực thi.
    """
    nodes = {n['id']: n for n in flow_data.get('nodes', [])}
    edges = flow_data.get('edges', [])

    # Tạo adjacency map: source -> [target_ids]
    adj = {}
    for edge in edges:
        src = edge['source']
        tgt = edge['target']
        if src not in adj:
            adj[src] = []
        adj[src].append(tgt)

    # Tìm Start Node
    start_node = None
    for node in flow_data.get('nodes', []):
        if node.get('data', {}).get('isStart'):
            start_node = node
            break

    if not start_node:
        print("[RUNNER][ERROR] Không tìm thấy Start Node!", flush=True)
        return []

    # Duyệt tuyến tính
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


def execute_flow(flow_path, profile_path=None):
    """
    Hàm chính: Đọc flow -> Khởi tạo driver -> Thực thi từng bước.
    """
    print(f"[RUNNER] Đang tải kịch bản: {flow_path}", flush=True)
    flow_data = load_flow(flow_path)

    execution_order = build_execution_order(flow_data)
    total_steps = len(execution_order)

    if total_steps == 0:
        print("[RUNNER][ERROR] Kịch bản trống hoặc không hợp lệ.", flush=True)
        return

    print(f"[RUNNER] Tổng số bước: {total_steps}", flush=True)

    # Khởi tạo driver
    print("[RUNNER] Đang khởi tạo trình duyệt...", flush=True)
    driver = create_driver(profile_path=profile_path)
    wait = create_wait(driver, timeout=15)

    try:
        for i, node in enumerate(execution_order):
            data = node.get('data', {})
            action_id = data.get('originalId', '')
            label = data.get('label', action_id)

            # Skip Start/End nodes (they are structural, not actionable)
            if data.get('isStart') or data.get('isEnd'):
                print(f"[RUNNER] [{i+1}/{total_steps}] {label} (bỏ qua)", flush=True)
                continue

            # Tìm action handler trong registry
            action_fn = ACTION_REGISTRY.get(action_id)
            if action_fn:
                print(f"[RUNNER] [{i+1}/{total_steps}] Thực thi: {label}", flush=True)
                action_fn(driver, wait, data)
            else:
                print(f"[RUNNER][WARN] [{i+1}/{total_steps}] Không tìm thấy action handler cho: '{action_id}'", flush=True)

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
