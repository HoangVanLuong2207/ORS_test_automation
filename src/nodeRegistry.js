export const NODE_CATEGORIES = {
    BROWSER: {
        label: '🌐 Trình duyệt',
        color: '#3B82F6',
        nodes: [
            {
                id: 'mouse-click', label: '🖱️ Mouse Click', type: 'mindMapNode',
                props: [
                    { name: 'method', label: 'Phương thức tìm', type: 'select', options: ['CSS Selector', 'ID', 'Class Name', 'XPath', 'Image (Hình ảnh)'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm / Đường dẫn ảnh', type: 'text', placeholder: 'Nhập selector hoặc tên file ảnh...' }
                ]
            },
            {
                id: 'type-text', label: '⌨️ Type Text', type: 'mindMapNode',
                props: [
                    { name: 'method', label: 'Phương thức tìm input', type: 'select', options: ['CSS Selector', 'ID', 'Class Name', 'XPath'] },
                    { name: 'selector', label: 'Giá trị tìm kiếm', type: 'text', placeholder: '#input-id' },
                    { name: 'text', label: 'Nội dung nhập', type: 'text', placeholder: 'Hello World' }
                ]
            },
            {
                id: 'open-url', label: '🌍 Open URL', type: 'mindMapNode',
                props: [{ name: 'url', label: 'Địa chỉ URL', type: 'text', placeholder: 'https://google.com' }]
            },
            {
                id: 'scroll', label: '🖱️ Scroll Page', type: 'mindMapNode',
                props: [
                    { name: 'direction', label: 'Hướng', type: 'select', options: ['Down', 'Up'] },
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
                id: 'if-condition', label: '🔀 If Condition', type: 'mindMapNode', isLogic: true, isBranching: true,
                props: [
                    { name: 'variable', label: 'Tên biến / Selector', type: 'text' },
                    { name: 'operator', label: 'Toán tử', type: 'select', options: ['Equals', 'Contains', 'Exists', 'Matches'] },
                    { name: 'value', label: 'Giá trị so sánh', type: 'text' }
                ]
            },
            {
                id: 'wait', label: '⏱️ Wait', type: 'mindMapNode',
                props: [{ name: 'duration', label: 'Thời gian chờ (ms)', type: 'number', placeholder: '1000' }]
            },
            {
                id: 'loop', label: '🔄 Vòng lặp', type: 'mindMapNode', isLogic: true,
                props: [{ name: 'count', label: 'Số lần lặp', type: 'number', placeholder: '5' }]
            },
        ]
    },
    UTILITY: {
        label: '🛠️ Tiện ích',
        color: '#10B981',
        nodes: [
            {
                id: 'set-variable', label: '📦 Set Variable', type: 'mindMapNode',
                props: [
                    { name: 'name', label: 'Tên biến', type: 'text' },
                    { name: 'value', label: 'Giá trị', type: 'text' }
                ]
            },
            {
                id: 'ai-summary', label: '✨ AI Summarize', type: 'mindMapNode',
                props: [{ name: 'prompt', label: 'Yêu cầu AI', type: 'text', placeholder: 'Tóm tắt nội dung...' }]
            },
            {
                id: 'screenshot', label: '📸 Chụp ảnh màn hình', type: 'mindMapNode',
                props: [{ name: 'filename', label: 'Tên file (tùy chọn)', type: 'text' }]
            },
            { id: 'end-flow', label: '🏁 Kết thúc', type: 'mindMapNode', isEnd: true },
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
