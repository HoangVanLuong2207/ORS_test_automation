def loop_handler(driver, wait, data, variables):
    """
    Xử lý vòng lặp: Theo số lần cố định hoặc lặp qua mảng.
    Trả về 'true' để tiếp tục lặp, 'false' để kết thúc.
    """
    node_id = data.get("id")
    use_array = data.get("use_array") == "Có"
    array_name = data.get("array_name", "").strip()
    
    counter_key = f"__loop_counter_{node_id}"
    current_index = variables.get(counter_key, 0)

    if use_array:
        # Chế độ lặp qua mảng
        if not array_name or array_name not in variables:
            print(f"[LOOP][ERROR] Không tìm thấy mảng '{array_name}' để lặp.", flush=True)
            return "false"
        
        target_array = variables[array_name]
        if not isinstance(target_array, list):
            print(f"[LOOP][ERROR] Biến '{array_name}' không phải là một danh sách (mảng).", flush=True)
            return "false"
            
        total_items = len(target_array)
        if current_index < total_items:
            # Gán giá trị hiện tại vào biến loop_item để các node sau sử dụng
            variables["loop_item"] = target_array[current_index]
            variables["loop_index"] = current_index
            variables[counter_key] = current_index + 1
            print(f"[LOOP-ARRAY] Lượt {current_index + 1}/{total_items}: Đang xử lý phần tử '{variables['loop_item']}'", flush=True)
            return "true"
        else:
            variables[counter_key] = 0
            print(f"[LOOP-ARRAY] Đã hoàn thành duyệt mảng {total_items} phần tử.", flush=True)
            return "false"
    else:
        # Chế độ lặp số lần cố định (Cũ)
        max_count = int(data.get("count", 0))
        if current_index < max_count:
            variables[counter_key] = current_index + 1
            variables["loop_index"] = current_index
            print(f"[LOOP-COUNT] Lượt {current_index + 1}/{max_count} -> Tiếp tục.", flush=True)
            return "true"
        else:
            variables[counter_key] = 0
            print(f"[LOOP-COUNT] Đã hoàn thành {max_count} lượt.", flush=True)
            return "false"
