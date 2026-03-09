import React from 'react';
import { X, Code, Settings2 } from 'lucide-react';
import { getNodeMetadata } from '../nodeRegistry';

const PropertyPanel = ({ selectedNode, onUpdateNode, onClose }) => {
    if (!selectedNode) return null;

    const metadata = getNodeMetadata(selectedNode.data.originalId || selectedNode.id.split('_')[0]);
    const nodeData = selectedNode.data || {};

    const handleInputChange = (name, value) => {
        onUpdateNode(selectedNode.id, {
            ...nodeData,
            [name]: value
        });
    };

    const generatePythonPreview = (node) => {
        const type = node.data.originalId;
        const props = node.data;
        const method = props.method || 'CSS Selector';
        const selector = props.selector || '...';

        const getSelector = (m, s) => {
            switch (m) {
                case 'ID': return `(By.ID, "${s}")`;
                case 'Class Name': return `(By.CLASS_NAME, "${s}")`;
                case 'XPath': return `(By.XPATH, "${s}")`;
                case 'Image (Hình ảnh)': return `image_path="${s}"`;
                default: return `(By.CSS_SELECTOR, "${s}")`;
            }
        };

        switch (type) {
            case 'open-url':
                return `driver.get("${props.url || 'https://...'}")`;
            case 'mouse-click':
                if (method === 'Image (Hình ảnh)') {
                    return `click_by_image("${selector}")`;
                }
                return `driver.find_element(*${getSelector(method, selector)}).click()`;
            case 'type-text':
                return `element = driver.find_element(*${getSelector(method, selector)})\ntype_like_human(element, "${props.text || '...'}")`;
            case 'if-condition':
                return `if check_condition("${props.variable || '...'}", "${props.operator || '=='}", "${props.value || '...'}"):`;
            case 'wait':
                return `time.sleep(${(props.duration || 1000) / 1000})`;
            case 'set-variable':
                return `variables["${props.name || 'var'}"] = "${props.value || ''}"`;
            case 'screenshot':
                return `driver.save_screenshot("${props.filename || 'screenshot.png'}")`;
            default:
                return `# Code cho ${node.data.label} sẽ ở đây`;
        }
    };

    return (
        <div className="property-panel shadow-2xl transition-all duration-300">
            <div className="panel-header flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Settings2 size={18} className="text-blue-500" />
                    <h2 className="text-lg font-bold text-slate-800">Cấu hình Node</h2>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200 transition-all">
                    <X size={20} />
                </button>
            </div>

            <div className="panel-content p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-250px)]">
                <div className="node-info bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">Loại Node</p>
                    <p className="text-sm font-semibold text-slate-800">{nodeData.label}</p>
                </div>

                {metadata?.props && (
                    <div className="form-sections space-y-4">
                        {metadata.props.map((prop) => (
                            <div key={prop.name} className="form-group flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-tight ml-1">
                                    {prop.label}
                                </label>

                                {prop.type === 'select' ? (
                                    <select
                                        className="custom-input"
                                        value={nodeData[prop.name] || ''}
                                        onChange={(e) => handleInputChange(prop.name, e.target.value)}
                                    >
                                        <option value="">Chọn một giá trị...</option>
                                        {prop.options.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={prop.type}
                                        className="custom-input"
                                        placeholder={prop.placeholder}
                                        value={nodeData[prop.name] || ''}
                                        onChange={(e) => handleInputChange(prop.name, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="panel-footer p-4 border-t bg-slate-50/50 rounded-b-2xl">
                <p className="text-[10px] text-slate-400 text-center font-medium">
                    Dữ liệu được tự động đồng bộ với sơ đồ
                </p>
            </div>
        </div>
    );
};

export default PropertyPanel;
