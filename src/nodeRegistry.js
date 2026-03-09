export const NODE_CATEGORIES = {
    BROWSER: {
        label: '🌐 Trình duyệt',
        color: '#3B82F6',
        nodes: [
            {
                id: 'mouse-click', label: '🖱️ Click chuột', type: 'mindMapNode',
                description: 'Click chuột vào một phần tử trên trang web bằng Selector hoặc hình ảnh.',
                props: [
                    { name: 'method', label: 'Phương thức tìm', type: 'select', options: ['CSS Selector', 'ID', 'Class Name', 'XPath', 'Image (Hình ảnh)'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm / Đường dẫn ảnh', type: 'text', placeholder: 'Nhập selector hoặc tên file ảnh...' }
                ]
            },
            {
                id: 'type-text', label: '⌨️ Nhập văn bản', type: 'mindMapNode',
                description: 'Nhập văn bản vào một ô input hoặc textarea.',
                props: [
                    { name: 'method', label: 'Phương thức tìm input', type: 'select', options: ['CSS Selector', 'ID', 'Class Name', 'XPath'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm', type: 'text', placeholder: '#input-id' },
                    { name: 'text', label: 'Nội dung nhập', type: 'text', placeholder: 'Nhập văn bản...' }
                ]
            },
            {
                id: 'open-url', label: '🌍 Mở URL', type: 'mindMapNode',
                description: 'Mở một địa chỉ trang web (URL) cụ thể.',
                props: [{ name: 'url', label: 'Địa chỉ URL', type: 'text', placeholder: 'https://google.com' }]
            },
            {
                id: 'hover-element', label: '🖱️ Rê chuột', type: 'mindMapNode',
                description: 'Di chuyển chuột lên trên một phần tử (hover) mà không click.',
                props: [
                    { name: 'method', label: 'Phương thức tìm', type: 'select', options: ['XPath', 'CSS Selector', 'ID', 'Class Name'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm', type: 'text', placeholder: '//*[@id="menu"]' }
                ]
            },
            {
                id: 'scroll', label: '🖱️ Cuộn trang', type: 'mindMapNode',
                description: 'Cuộn trang web lên hoặc xuống theo số lượng pixel nhất định.',
                props: [
                    { name: 'direction', label: 'Hướng', type: 'select', options: ['Xuống', 'Lên'] },
                    { name: 'amount', label: 'Số lượng pixel', type: 'number', placeholder: '500' }
                ]
            },
        ]
    },
    LOGIC: {
        label: '🔀 Logic & Nhánh',
        color: '#8B5CF6',
        nodes: [
            {
                id: 'if-condition', label: '🔀 Điều kiện (If)', type: 'mindMapNode', isLogic: true, isBranching: true,
                description: 'Kiểm tra một điều kiện (văn bản hoặc sự tồn tại của element) để rẽ nhánh kịch bản.',
                props: [
                    { name: 'method', label: 'Phương thức tìm', type: 'select', options: ['XPath', 'CSS Selector', 'ID', 'Class Name'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm / Selector', type: 'text', placeholder: '//*[@id="check"]' },
                    { name: 'operator', label: 'Toán tử', type: 'select', options: ['Bằng', 'Chứa', 'Tồn tại', 'Khớp (Regex)'] },
                    { name: 'value', label: 'Giá trị so sánh', type: 'text', placeholder: 'Nội dung cần so khớp' }
                ]
            },
            {
                id: 'wait-time', label: '⏱️ Chờ (Giây)', type: 'mindMapNode',
                description: 'Tạm dừng kịch bản trong một khoảng thời gian nhất định (giây).',
                props: [{ name: 'seconds', label: 'Thời gian chờ (giây)', type: 'number', placeholder: '1' }]
            },
            {
                id: 'wait-element', label: '⏳ Chờ phần tử', type: 'mindMapNode',
                description: 'Chờ cho đến khi một phần tử xuất hiện, biến mất hoặc có mặt trong DOM.',
                props: [
                    { name: 'method', label: 'Phương thức tìm', type: 'select', options: ['XPath', 'CSS Selector', 'ID', 'Class Name'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm', type: 'text' },
                    { name: 'condition', label: 'Điều kiện', type: 'select', options: ['Hiển thị', 'Ẩn', 'Có mặt (DOM)'] },
                    { name: 'timeout', label: 'Timeout (giây)', type: 'number', placeholder: '10' }
                ]
            },
            {
                id: 'loop', label: '🔄 Vòng lặp', type: 'mindMapNode', isLogic: true,
                description: 'Lặp lại một nhóm các hành động trong một số lần nhất định.',
                props: [{ name: 'count', label: 'Số lần lặp', type: 'number', placeholder: '5' }]
            },
        ]
    },
    ASSERTIONS: {
        label: '✅ Kiểm chứng',
        color: '#EE8033',
        nodes: [
            {
                id: 'verify-text', label: '🔍 Kiểm tra văn bản', type: 'mindMapNode',
                description: 'Kiểm tra xem văn bản của một phần tử có khớp với mong đợi không (Dừng kịch bản nếu sai).',
                props: [
                    { name: 'method', label: 'Phương thức tìm', type: 'select', options: ['XPath', 'CSS Selector', 'ID', 'Class Name'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm', type: 'text' },
                    { name: 'text', label: 'Văn bản mong đợi', type: 'text', placeholder: 'Thành công' }
                ]
            },
            {
                id: 'verify-visibility', label: '👁️ Kiểm tra hiển thị', type: 'mindMapNode',
                description: 'Kiểm tra xem một phần tử đang hiển thị hay đang ẩn (Dừng kịch bản nếu sai).',
                props: [
                    { name: 'method', label: 'Phương thức tìm', type: 'select', options: ['XPath', 'CSS Selector', 'ID', 'Class Name'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm', type: 'text' },
                    { name: 'visible', label: 'Mong đợi hiển thị', type: 'select', options: ['Có', 'Không'] }
                ]
            },
        ]
    },
    UTILITY: {
        label: '🛠️ Tiện ích',
        color: '#10B981',
        nodes: [
            {
                id: 'variable-manager', label: '📦 Quản lý Biến', type: 'mindMapNode',
                description: 'Lấy dữ liệu từ Web hoặc gán giá trị cố định vào một biến.',
                props: [
                    { name: 'type', label: 'Loại hành động', type: 'select', options: ['Lấy văn bản (Web)', 'Lấy thuộc tính (Web)', 'Gán giá trị cố định'] },
                    { name: 'variable', label: 'Tên biến lưu trữ', type: 'text', placeholder: 'username, otp_code...' },
                    { name: 'method', label: 'Phương thức tìm (nếu lấy từ Web)', type: 'select', options: ['XPath', 'CSS Selector', 'ID', 'Class Name'] },
                    { name: 'selector', label: 'Selector (nếu lấy từ Web)', type: 'text' },
                    { name: 'attribute', label: 'Tên thuộc tính (nếu lấy thuộc tính)', type: 'text', placeholder: 'href, value, src...' },
                    { name: 'value', label: 'Giá trị cố định (nếu gán tĩnh)', type: 'text' }
                ]
            },
            {
                id: 'take-screenshot', label: '📸 Chụp màn hình', type: 'mindMapNode',
                description: 'Chụp ảnh màn hình trình duyệt hiện tại.',
                props: [{ name: 'filename', label: 'Tên file (tùy chọn)', type: 'text', placeholder: 'login_success.png' }]
            },
            {
                id: 'ai-summary', label: '✨ Phân tích AI', type: 'mindMapNode',
                description: 'Sử dụng AI để tóm tắt hoặc phân tích nội dung trang web hiện tại.',
                props: [{ name: 'prompt', label: 'Yêu cầu AI', type: 'text', placeholder: 'Tóm tắt nội dung...' }]
            },
            { id: 'end-flow', label: '🏁 Kết thúc', type: 'mindMapNode', isEnd: true, description: 'Đánh dấu điểm kết thúc của một luồng xử lý.' },
        ]
    }
};

export const getNodeMetadata = (id) => {
    for (const cat of Object.values(NODE_CATEGORIES)) {
        const node = cat.nodes.find(n => n.id === id);
        if (node) return node;
    }
    return null;
};
