def loop_handler(driver, wait, data, variables):
    """
    Xử lý vòng lặp dựa trên biến trạng thái.
    Trả về 'true' để tiếp tục lặp, 'false' để kết thúc.
    """
    node_id = data.get("id") # ID duy nhất của node này trong flow
    max_count = int(data.get("count", 0))
    
    # Sử dụng biến nội bộ để theo dõi số lần lặp
    counter_key = f"__loop_counter_{node_id}"
    
    current_count = variables.get(counter_key, 0)
    
    if current_count < max_count:
        variables[counter_key] = current_count + 1
        print(f"[LOOP] Lượt {variables[counter_key]}/{max_count} -> Tiếp tục vòng lặp.", flush=True)
        return "true"
    else:
        # Reset counter khi hoàn tất để có thể chạy lại lần sau nếu cần
        variables[counter_key] = 0
        print(f"[LOOP] Đã hoàn thành {max_count} lượt -> Kết thúc vòng lặp.", flush=True)
        return "false"
