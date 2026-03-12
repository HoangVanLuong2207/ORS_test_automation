import React from 'react';
import { X, Code, Settings2 } from 'lucide-react';
import { getNodeMetadata } from '../nodeRegistry';
import DataTableEditor from './DataTableEditor';

const PropertyPanel = ({ selectedNode, selectedEdge, onUpdateNode, onUpdateEdge, onClose }) => {
    if (!selectedNode && !selectedEdge) return null;

    const metadata = selectedNode ? getNodeMetadata(selectedNode.data.originalId || selectedNode.id.split('_')[0]) : null;
    const nodeData = selectedNode ? selectedNode.data : {};

    const handleInputChange = (name, value) => {
        if (selectedNode) {
            onUpdateNode(selectedNode.id, {
                ...nodeData,
                [name]: value
            });
        }
    };

    const handleEdgeTypeChange = (type) => {
        if (selectedEdge) {
            onUpdateEdge(selectedEdge.id, type);
        }
    };

    return (
        <div className="property-panel shadow-xl transition-all duration-300">
            <div className="panel-header flex items-center justify-between p-5 border-b bg-gradient-header">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-200">
                        <Settings2 size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none">
                            {selectedEdge ? 'Cấu hình đường nối' : 'Cấu hình'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                            {selectedEdge ? 'Edge Settings' : 'Sự kiện kích bản'}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100">
                    <X size={20} />
                </button>
            </div>

            <div className="panel-content p-4 space-y-6 overflow-y-auto max-h-panel">
                {selectedNode ? (
                    <>
                        <div className="node-info bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Hành động</p>
                            </div>
                            <p className="text-base font-bold text-slate-800">{nodeData.label}</p>
                        </div>

                        <div className="form-sections space-y-4">
                            {metadata?.props && metadata.props.map((prop) => (
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
                                    ) : prop.name === 'data_table' ? (
                                        <DataTableEditor
                                            value={nodeData[prop.name] || ''}
                                            onChange={(val) => handleInputChange(prop.name, val)}
                                        />
                                    ) : prop.type === 'textarea' ? (
                                        <textarea
                                            className="custom-input min-h-[80px] py-2"
                                            placeholder={prop.placeholder}
                                            value={nodeData[prop.name] || ''}
                                            onChange={(e) => handleInputChange(prop.name, e.target.value)}
                                        />
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

                            <div style={{ width: '100%', height: '1px', background: '#F1F5F9', marginTop: '8px' }}></div>

                            {/* Universal Note Field for AI Summarization */}
                            <div className="form-group flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-blue-500 uppercase tracking-tight ml-1">
                                    📝 Mô tả bước này (Cho AI)
                                </label>
                                <textarea
                                    className="custom-input min-h-[80px] py-2 resize-none"
                                    placeholder="Ví dụ: Click vào nút Đăng ký để mở form..."
                                    value={nodeData.note || ''}
                                    onChange={(e) => handleInputChange('note', e.target.value)}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="form-sections space-y-4">
                        <div className="form-group flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-tight ml-1">
                                Kiểu đường nối
                            </label>
                            <select
                                className="custom-input"
                                value={selectedEdge.type || 'smoothstep'}
                                onChange={(e) => handleEdgeTypeChange(e.target.value)}
                            >
                                <option value="smoothstep">Bo góc (SmoothStep)</option>
                                <option value="step">Vuông góc (Step)</option>
                                <option value="default">Đường cong (Bezier)</option>
                                <option value="straight">Đường thẳng (Straight)</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1 italic px-1">
                                Chọn "Vuông góc" hoặc "Đường cong" để tránh dây đè lên các hành động khác.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="panel-footer p-4 border-t bg-slate-50/50 rounded-b-2xl">
                <p className="text-[10px] text-slate-400 text-center font-medium">
                    Dữ liệu được tự động đồng bộ với sơ đồ
                </p>
            </div>
        </div >
    );
};

export default PropertyPanel;
