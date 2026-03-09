import React, { useState, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import './index.css';
import { NODE_CATEGORIES, getNodeMetadata } from './nodeRegistry';
import { Search, ChevronDown, ChevronRight, Settings2, Code, X, Download, Upload, Play, Sparkles, BrainCircuit } from 'lucide-react';
import dagre from 'dagre';
import PropertyPanel from './components/PropertyPanel';
import ExecutionDashboard from './components/ExecutionDashboard';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 80;

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 50,  // Reduced horizontal distance
    nodesep: 20   // Reduced vertical distance
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';

    // Shift coordinates so node's center aligns correctly 
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};

// Custom Soft X Icon Component (Extra rounded)
const SoftXIcon = ({ size = 8 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="4.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="M6 6 18 18" />
  </svg>
);

// Custom Node Component with Deluxe Delete Button
const MindMapNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();

  const onDelete = (e) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
  };

  const isStart = data.isStart;
  const isEnd = data.isEnd;

  // Custom styling based on node purpose
  let nodeStyle = {
    background: data.color ? `${data.color}14` : (data.isLogic ? 'rgba(139, 92, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)'),
    borderColor: data.color || (data.isLogic ? '#8B5CF6' : '#10B981'),
    boxShadow: selected ? `0 0 0 2px ${data.color || '#3B82F6'}` : '0 4px 15px rgba(0,0,0,0.05)',
  };

  if (isStart) {
    nodeStyle = {
      background: 'rgba(59, 130, 246, 0.08)',
      borderColor: '#3B82F6',
      boxShadow: selected ? '0 0 0 3px #3B82F6, 0 8px 20px rgba(59, 130, 246, 0.3)' : '0 8px 20px rgba(59, 130, 246, 0.15)',
    };
  } else if (isEnd) {
    nodeStyle = {
      background: 'rgba(15, 23, 42, 0.04)',
      borderColor: '#1E293B',
      boxShadow: selected ? '0 0 0 2px #1E293B' : '0 4px 15px rgba(0,0,0,0.05)',
    };
  }

  return (
    <div
      className={`mind-map-node group relative min-w-[160px] transition-all duration-300 ${selected ? 'selected' : ''} ${isStart ? 'start-node' : ''} ${isEnd ? 'end-node' : ''}`}
      style={{
        ...nodeStyle,
        borderWidth: '1.5px',
        borderStyle: 'solid',
        borderRadius: '16px',
        padding: '14px',
      }}>

      {/* Hide delete for start node potentially, or keep for others */}
      {!isStart && (
        <button
          onClick={onDelete}
          className="delete-node-btn"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transform: 'translate(50%, -50%)',
            background: '#EF4444',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            color: 'white',
            padding: 0,
            lineHeight: 1,
            cursor: 'pointer',
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
          }}
          title="Xóa node"
        >
          <SoftXIcon size={7} />
        </button>
      )}

      {!isStart && <Handle type="target" position={Position.Left} className="custom-handle input-handle" />}

      <div className="flex items-center justify-center">
        <span className={`text-sm tracking-tight ${isStart ? 'font-bold text-blue-600' : 'font-semibold text-[#1E293B]'}`}>
          {data.label}
        </span>
      </div>

      {!isEnd && !data.isBranching && (
        <Handle type="source" position={Position.Right} className="custom-handle output-handle" />
      )}

      {data.isBranching && (
        <>
          <div className="absolute right-[-24px] top-[25%] flex items-center gap-1 group/true">
            <span className="text-[10px] font-bold text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">ĐÚNG</span>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className="custom-handle output-handle true-handle"
              style={{ top: '25%', right: '-5px' }}
            />
          </div>
          <div className="absolute right-[-24px] top-[75%] flex items-center gap-1 group/false">
            <span className="text-[10px] font-bold text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">SAI</span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className="custom-handle output-handle false-handle"
              style={{ top: '75%', right: '-5px' }}
            />
          </div>
        </>
      )}
    </div>
  );
};

// Initial nodes for the mind-map
const initialNodes = [
  {
    id: 'start-node',
    type: 'mindMapNode',
    data: { label: '🚀 Bắt đầu kịch bản', isStart: true },
    position: { x: 50, y: 150 },
  },
];

let id = 0;
const getId = () => `node_${Date.now()}_${id++}`;

const initialEdges = [];

const Flow = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState(() =>
    Object.keys(NODE_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  const [selectedNode, setSelectedNode] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [viewMode, setViewMode] = useState('builder'); // 'builder' or 'runner'
  const { screenToFlowPosition } = useReactFlow();

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onUpdateNode = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
    // Cập nhật selectedNode nếu nó đang được chọn để Panel hiển thị data mới
    setSelectedNode(prev => prev && prev.id === nodeId ? { ...prev, data: newData } : prev);
  }, [setNodes]);

  const toggleCategory = (key) => {
    setCollapsedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return NODE_CATEGORIES;
    const filtered = {};
    Object.entries(NODE_CATEGORIES).forEach(([key, category]) => {
      const nodes = category.nodes.filter(n =>
        n.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (nodes.length > 0) {
        filtered[key] = { ...category, nodes };
      }
    });
    return filtered;
  }, [searchTerm]);

  const nodeTypes = useMemo(() => ({
    mindMapNode: MindMapNode,
  }), []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const nodeId = event.dataTransfer.getData('application/reactflow');
      const nodeMetadata = getNodeMetadata(nodeId);

      if (!nodeMetadata) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Tìm category color
      let categoryColor = '#10B981';
      for (const cat of Object.values(NODE_CATEGORIES)) {
        if (cat.nodes.some(n => n.id === nodeMetadata.id)) {
          categoryColor = cat.color;
          break;
        }
      }

      const newNode = {
        id: getId(),
        type: 'mindMapNode',
        position,
        data: {
          label: nodeMetadata.label,
          description: nodeMetadata.description,
          isLogic: nodeMetadata.isLogic,
          isStart: nodeMetadata.isStart,
          isEnd: nodeMetadata.isEnd,
          isBranching: nodeMetadata.isBranching,
          originalId: nodeMetadata.id,
          color: categoryColor
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNode(newNode);
    },
    [screenToFlowPosition]
  );

  const exportToJson = useCallback(async () => {
    const filename = prompt("Nhập tên kịch bản:", `script_${Date.now()}`);
    if (!filename) return;

    const flow = {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 }
    };

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename, data: flow }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`Đã lưu kịch bản vào thư mục Workflow/${filename}.json`);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Lỗi khi lưu vào server:", err);
      // Fallback: Tải về trình duyệt nếu server không hỗ trợ (ví dụ khi không chạy dev server)
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flow, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${filename}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      alert("Đã tải xuống file vào thư mục mặc định của trình duyệt.");
    }
  }, [nodes, edges]);

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR' // Left to Right workflow looks best
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    // Fit view automatically after a small delay to let React render the positions
    setTimeout(() => {
      document.querySelector('.react-flow__controls-fitview')?.click();
    }, 50);
  }, [nodes, edges, setNodes, setEdges]);

  const importFromJson = useCallback((event) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const flow = JSON.parse(e.target.result);
        if (flow) {
          setNodes(flow.nodes || []);
          setEdges(flow.edges || []);
        }
      } catch (err) {
        console.error("Lỗi khi đọc file JSON:", err);
        alert("File không đúng định dạng!");
      }
    };
    if (event.target.files[0]) {
      fileReader.readAsText(event.target.files[0]);
    }
  }, [setNodes, setEdges]);

  const onDragStart = (event, nodeId) => {
    setSelectedNode(null); // Clear selection when starting to drag a new node
    event.dataTransfer.setData('application/reactflow', nodeId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onEditFlow = useCallback(async (flowName) => {
    try {
      const res = await fetch(`/api/flow-content?name=${flowName}`);
      const flowData = await res.json();
      if (flowData.nodes) {
        setNodes(flowData.nodes);
        setEdges(flowData.edges || []);
        setViewMode('builder');
      }
    } catch (err) {
      console.error('Loi khi tai flow:', err);
    }
  }, [setNodes, setEdges]);

  if (viewMode === 'runner') {
    return <ExecutionDashboard onBack={() => setViewMode('builder')} onEditFlow={onEditFlow} />;
  }

  const handleAISummary = async () => {
    console.log("Triggering AI Summary...");
    setIsSummarizing(true);
    try {
      console.log("Nodes:", nodes);
      console.log("Edges:", edges);
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      if (data.success) {
        setSummary(data.summary);
      } else {
        alert("Lỗi khi tóm tắt: " + data.error);
      }
    } catch (err) {
      console.error("AI Summary Error:", err);
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* Sidebar - Drag from here */}
      <aside className="sidebar-container">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="sidebar-title">Thư viện</h2>
            <button
              onClick={() => setViewMode('runner')}
              className="btn-run-mode"
            >
              <Play size={12} fill="currentColor" />
              <span>Chạy Flow</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="search-box">
            <div className="search-icon-wrapper">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {Object.entries(filteredCategories).map(([key, category]) => {
            const isCollapsed = collapsedCategories[key];
            return (
              <div key={key} className="category-group">
                <button
                  onClick={() => toggleCategory(key)}
                  className="category-toggle-btn"
                >
                  <h3 className="category-label" style={{ color: category.color }}>{category.label}</h3>
                  <ChevronRight size={16} className={`chevron-icon ${!isCollapsed ? 'rotated' : ''}`} style={{ color: category.color }} />
                </button>

                <div className={`category-nodes-wrapper ${!isCollapsed ? 'expanded' : ''}`}>
                  <div className="category-nodes-content">
                    {category.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="sidebar-node-item"
                        style={{ borderLeft: `5px solid ${category.color}` }}
                        onDragStart={(event) => onDragStart(event, node.id)}
                        draggable
                      >
                        {node.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Canvas */}
      <main ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
        >
          <Background color="#1e293b" gap={20} variant="dots" />
          <Controls />
        </ReactFlow>

        {/* Action Button Group - Bottom Right */}
        <Panel position="bottom-right" style={{ margin: '0 24px 24px 0' }}>
          <div className="action-panel-container">
            <button
              onClick={onLayout}
              className="action-btn btn-purple"
              title="Sắp xếp sơ đồ tự động"
            >
              <Sparkles size={18} fill="currentColor" />
              <span>Làm đẹp Flow</span>
            </button>

            <button
              onClick={handleAISummary}
              disabled={isSummarizing}
              className="action-btn btn-white"
              title="Phân tích kịch bản bằng AI"
            >
              <BrainCircuit size={18} className={`${isSummarizing ? 'animate-pulse' : ''}`} />
              <span>{isSummarizing ? 'Đang tóm tắt...' : 'Tóm tắt AI'}</span>
            </button>

            <div className="separator-v"></div>

            <input
              type="file"
              id="import-flow"
              style={{ display: 'none' }}
              accept=".json"
              onChange={importFromJson}
            />

            <button
              onClick={() => document.getElementById('import-flow').click()}
              className="action-btn btn-white"
            >
              <Upload size={18} />
              <span>Tải kịch bản</span>
            </button>

            <button
              onClick={exportToJson}
              className="action-btn btn-blue"
            >
              <Download size={18} />
              <span>Lưu kịch bản</span>
            </button>
          </div>
        </Panel>

        {selectedNode && (
          <PropertyPanel
            selectedNode={selectedNode}
            onUpdateNode={onUpdateNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
        {summary && (
          <div className="ai-modal-overlay">
            <div className="ai-modal-container">
              <div className="ai-modal-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-xl shadow-lg">
                    <BrainCircuit size={20} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Tóm tắt kịch bản AI</h3>
                </div>
                <button
                  onClick={() => setSummary(null)}
                  className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all border-none cursor-pointer bg-transparent"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="ai-modal-body">
                <div className="ai-summary-content">
                  <pre className="ai-summary-text">
                    {summary}
                  </pre>
                </div>
              </div>
              <div className="ai-modal-footer">
                <button
                  onClick={() => setSummary(null)}
                  className="btn-close-modal"
                >
                  Đóng tóm tắt
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const App = () => (
  <ReactFlowProvider>
    <Flow />
  </ReactFlowProvider>
);

export default App;
