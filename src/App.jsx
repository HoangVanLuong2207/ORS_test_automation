import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  updateEdge,
  Background,
  Controls,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  Panel,
  getSmoothStepPath,
  EdgeLabelRenderer,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './index.css';
import { NODE_CATEGORIES, getNodeMetadata } from './nodeRegistry';
import { Search, ChevronDown, ChevronRight, Settings2, Code, X, Download, Upload, Play, Sparkles, BrainCircuit, RotateCcw, RotateCw, Copy, ClipboardPaste, Layers } from 'lucide-react';
import PropertyPanel from './components/PropertyPanel';
import ExecutionDashboard from './components/ExecutionDashboard';

const nodeWidth = 250;
const nodeHeight = 80;

const getLayoutedElements = (originalNodes, originalEdges, direction = 'LR', nodeIds = null) => {
  const isHorizontal = direction === 'LR';

  // Filter nodes and edges if nodeIds is provided
  const nodesToLayout = nodeIds
    ? originalNodes.filter(n => nodeIds.includes(n.id))
    : originalNodes;

  const nodeIdsSet = new Set(nodesToLayout.map(n => n.id));
  const edgesToLayout = nodeIds
    ? originalEdges.filter(e => nodeIdsSet.has(e.source) && nodeIdsSet.has(e.target))
    : originalEdges;

  // Build adjacency: parent -> children with handle info
  const childrenMap = {};
  const parentSet = new Set();
  edgesToLayout.forEach((edge) => {
    if (!childrenMap[edge.source]) childrenMap[edge.source] = [];
    childrenMap[edge.source].push({
      id: edge.target,
      handleId: edge.sourceHandle || null
    });
    parentSet.add(edge.target);
  });

  // Sort branching children: "true" handle first (top), "false" second (bottom)
  Object.keys(childrenMap).forEach((parentId) => {
    const children = childrenMap[parentId];
    if (children.length === 2 && children.some(c => c.handleId === 'true')) {
      children.sort((a, b) => {
        if (a.handleId === 'true') return -1;
        if (b.handleId === 'true') return 1;
        return 0;
      });
    }
  });

  // Find root nodes
  const roots = nodesToLayout.filter(n => !parentSet.has(n.id));
  if (roots.length === 0 && nodesToLayout.length > 0) {
    roots.push(nodesToLayout[0]);
  }

  // Layout constants
  const hGap = 180;             // horizontal gap for normal nodes
  const hGapBranching = 320;    // wider gap for branching (labels extend 115px right)
  const vGap = 50;              // vertical gap between sibling branches
  const branchMinSeparation = 200; // minimum vertical space between True/False branches

  const positions = {};
  const placed = new Set();
  const nodeMap = {};
  nodesToLayout.forEach(n => { nodeMap[n.id] = n; });

  // Compute subtree height recursively
  const heightCache = {};
  const getSubtreeHeight = (nodeId, visited = new Set()) => {
    if (visited.has(nodeId)) return nodeHeight;
    if (heightCache[nodeId] !== undefined) return heightCache[nodeId];
    visited.add(nodeId);

    const children = childrenMap[nodeId] || [];
    if (children.length === 0) {
      heightCache[nodeId] = nodeHeight;
      return nodeHeight;
    }

    const node = nodeMap[nodeId];
    const isBranching = node?.data?.isBranching;
    const gap = isBranching ? Math.max(vGap, branchMinSeparation) : vGap;

    let totalHeight = 0;
    children.forEach((child, i) => {
      if (i > 0) totalHeight += gap;
      totalHeight += getSubtreeHeight(child.id, new Set(visited));
    });

    // For branching, ensure minimum height so True/False branches don't stack too close
    if (isBranching && children.length >= 2) {
      totalHeight = Math.max(totalHeight, branchMinSeparation + nodeHeight);
    }

    heightCache[nodeId] = Math.max(nodeHeight, totalHeight);
    return heightCache[nodeId];
  };

  // Place subtree recursively
  const placeSubtree = (nodeId, x, bandTop, bandHeight) => {
    if (placed.has(nodeId)) return;
    placed.add(nodeId);

    // Center node in its vertical band
    const nodeY = bandTop + (bandHeight - nodeHeight) / 2;
    positions[nodeId] = { x, y: nodeY };

    const children = childrenMap[nodeId] || [];
    if (children.length === 0) return;

    const node = nodeMap[nodeId];
    const isBranching = node?.data?.isBranching;

    // Use wider horizontal gap for branching nodes (handle labels protrude)
    const thisHGap = isBranching ? hGapBranching : hGap;
    const childX = x + nodeWidth + thisHGap;

    const gap = isBranching ? Math.max(vGap, branchMinSeparation) : vGap;

    // Calculate child subtree heights
    const childHeights = children.map(c => getSubtreeHeight(c.id));
    let totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0)
      + (children.length - 1) * gap;

    // For branching with 2 children, enforce minimum separation
    if (isBranching && children.length >= 2) {
      totalChildrenHeight = Math.max(totalChildrenHeight, branchMinSeparation + nodeHeight);
    }

    // Center children band around parent center
    const parentCenterY = nodeY + nodeHeight / 2;
    let childBandTop = parentCenterY - totalChildrenHeight / 2;

    children.forEach((child, i) => {
      if (i > 0) childBandTop += gap;
      const thisChildHeight = childHeights[i];
      placeSubtree(child.id, childX, childBandTop, thisChildHeight);
      childBandTop += thisChildHeight;
    });
  };

  // Layout each root, stacking separate subgraphs
  let currentY = 50;
  roots.forEach((root) => {
    if (placed.has(root.id)) return;
    const height = getSubtreeHeight(root.id);
    placeSubtree(root.id, 50, currentY, height);
    currentY += height + vGap * 3;
  });

  // Place remaining unplaced nodes (cycles/isolated)
  nodesToLayout.forEach((node) => {
    if (!placed.has(node.id)) {
      positions[node.id] = { x: 50, y: currentY };
      currentY += nodeHeight + vGap;
    }
  });

  // Build final node array
  const newNodes = originalNodes.map((node) => {
    if (!positions[node.id]) return node;

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: positions[node.id],
    };
  });

  const newEdges = originalEdges.map((edge) => {
    const isLayouted = !nodeIds || (nodeIdsSet.has(edge.source) && nodeIdsSet.has(edge.target));
    return {
      ...edge,
      type: isLayouted ? 'adjustable' : edge.type || 'adjustable',
    };
  });

  return { nodes: newNodes, edges: newEdges };
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

      <div className="flex flex-col items-center justify-center gap-1">
        <span className={`text-sm tracking-tight ${isStart ? 'font-bold text-blue-600' : 'font-semibold text-[#1E293B]'}`}>
          {data.label}
        </span>
        {/* Sub-info display for quick view */}
        {!isStart && !isEnd && (
          <div className="text-[10px] text-slate-500 font-medium opacity-80 max-w-[140px] truncate text-center">
            {data.originalId === 'press-key' && data.key && (
              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                {data.key}{data.count > 1 ? ` x${data.count}` : ''}
              </span>
            )}
            {data.originalId === 'key-combination' && (data.modifier || data.key) && (
              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                {data.modifier} + {data.key || '?'}{data.count > 1 ? ` x${data.count}` : ''}
              </span>
            )}
            {data.originalId === 'open-url' && data.url && (
              <span className="text-blue-500 italic">{data.url}</span>
            )}
            {data.originalId === 'type-text' && data.text && (
              <span className="text-slate-400 italic">"{data.text}"</span>
            )}
            {!['press-key', 'key-combination', 'open-url', 'type-text'].includes(data.originalId) && data.note && (
              <span className="text-slate-400 truncate w-full block">({data.note})</span>
            )}
          </div>
        )}
      </div>

      {!isEnd && !data.isBranching && (
        <Handle type="source" position={Position.Right} className="custom-handle output-handle" />
      )}

      {data.isBranching && (
        <>
          <div className="absolute right-[-85px] top-[25%] flex items-center justify-end w-[80px] gap-2">
            <span className="text-[10px] font-extrabold text-emerald-600 whitespace-nowrap bg-emerald-50/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-emerald-200 shadow-sm">
              {data.originalId === 'loop' ? 'LẶP LẠI' : 'ĐÚNG'}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className="custom-handle output-handle true-handle"
              style={{ position: 'static', transform: 'none' }}
            />
          </div>
          <div className="absolute right-[-115px] top-[75%] flex items-center justify-end w-[110px] gap-2">
            <span className="text-[10px] font-extrabold text-rose-600 whitespace-nowrap bg-rose-50/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-rose-200 shadow-sm">
              {data.originalId === 'loop' ? 'XONG (Tiếp tục)' : 'SAI'}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className="custom-handle output-handle false-handle"
              style={{ position: 'static', transform: 'none' }}
            />
          </div>
        </>
      )}
    </div>
  );
};

// --- Custom Adjustable Edge ---
const AdjustableEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const pathRef = useRef(null);
  const [edgeArrows, setEdgeArrows] = useState([]);

  // Calculate mid-path arrows
  React.useLayoutEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      if (length > 40) { // Only show mid-arrows if path is long enough
        // Define points at 33% and 66%
        const points = [0.33, 0.66].map(percent => {
          const point = pathRef.current.getPointAtLength(length * percent);
          // Get a point slightly further to calculate rotation
          const nextPoint = pathRef.current.getPointAtLength(Math.min(length * percent + 1, length));
          const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);
          return { x: point.x, y: point.y, angle };
        });
        setEdgeArrows(points);
      } else {
        setEdgeArrows([]);
      }
    }
  }, [sourceX, sourceY, targetX, targetY, data?.pathPoints]);

  // Mảng các điểm neo (Waypoints)
  const pathPoints = data?.pathPoints || [];

  // Tạo chuỗi tọa độ cho đường đi SVG (M source L p1 L p2 ... L target)
  const generatePath = () => {
    let d = `M ${sourceX},${sourceY}`;
    pathPoints.forEach(p => {
      d += ` L ${p.x},${p.y}`;
    });
    d += ` L ${targetX},${targetY}`;
    return d;
  };

  // Nếu không có điểm neo nào, dùng đường SmoothStep mặc định
  const [defaultPath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const finalPath = pathPoints.length > 0 ? generatePath() : defaultPath;

  // Thêm điểm neo mới khi ALT + CLICK vào dây
  const onPathClick = (event) => {
    // Nếu không nhấn ALT, để sự kiện trôi đi (bubble) để React Flow chọn dây
    if (!event.altKey) return;

    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;

    const CTM = svg.getScreenCTM();
    if (!CTM) return;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const flowPoint = point.matrixTransform(CTM.inverse());

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          const currentPoints = edge.data?.pathPoints || [];
          return {
            ...edge,
            data: {
              ...edge.data,
              pathPoints: [...currentPoints, { x: flowPoint.x, y: flowPoint.y }]
            }
          };
        }
        return edge;
      })
    );
  };

  const updatePoint = (index, newX, newY) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          const newPoints = [...(edge.data?.pathPoints || [])];
          newPoints[index] = { x: newX, y: newY };
          return { ...edge, data: { ...edge.data, pathPoints: newPoints } };
        }
        return edge;
      })
    );
  };

  const removePoint = (index) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          const newPoints = (edge.data?.pathPoints || []).filter((_, i) => i !== index);
          return { ...edge, data: { ...edge.data, pathPoints: newPoints } };
        }
        return edge;
      })
    );
  };

  return (
    <>
      <path
        id={id}
        ref={pathRef}
        style={{ ...style }}
        className="react-flow__edge-path"
        d={finalPath}
        markerEnd={markerEnd}
      />

      {/* Interaction path - much wider to make ALT+CLICK easy */}
      <path
        className="react-flow__edge-interaction"
        d={finalPath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'copy', pointerEvents: 'all' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onPathClick}
      />

      {/* Renders small arrows along the path */}
      {edgeArrows.map((arrow, i) => (
        <path
          key={`${id}-mid-${i}`}
          d="M -4 -3 L 2 0 L -4 3 Z" // Smaller, sleek arrow head
          fill={markerEnd?.color || '#94a3b8'}
          style={{
            transform: `translate(${arrow.x}px, ${arrow.y}px) rotate(${arrow.angle}deg)`,
            pointerEvents: 'none',
            opacity: 1,
            transition: 'opacity 0.2s',
          }}
        />
      ))}

      {(selected || hovered || pathPoints.length > 0) && (
        <EdgeLabelRenderer>
          {pathPoints.map((p, index) => (
            <div
              key={`${id}-p-${index}`}
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${p.x}px,${p.y}px)`,
                pointerEvents: 'all',
              }}
              className="nodrag nopan"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <div
                className="edge-waypoint"
                onMouseDown={(event) => {
                  event.stopPropagation();
                  
                  // Delete on ALT + Click
                  if (event.altKey) {
                    removePoint(index);
                    return;
                  }

                  const startX = event.clientX;
                  const startY = event.clientY;
                  const initialX = p.x;
                  const initialY = p.y;

                  const onMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    updatePoint(index, initialX + dx, initialY + dy);
                  };

                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };

                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  removePoint(index);
                }}
                title="ALT + Click để xóa, Kéo để chỉnh hướng"
              />
            </div>
          ))}
        </EdgeLabelRenderer>
      )}
    </>
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
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [viewMode, setViewMode] = useState('builder'); // 'builder' or 'runner'
  const [activeFlowName, setActiveFlowName] = useState(null);
  const { screenToFlowPosition, getNodes, getEdges, getViewport, setViewport } = useReactFlow();
  const edgeUpdateSuccessful = useRef(true);

  // --- Một lần nâng cấp (Migrate) dây nối sang loại 'adjustable' ---
  useEffect(() => {
    setEdges(eds => {
      const needsUpdate = eds.some(e => e.type !== 'adjustable');
      if (needsUpdate) {
        return eds.map(e => ({ ...e, type: 'adjustable' }));
      }
      return eds;
    });
  }, [setEdges]);

  // --- Selection Auto-pan ---
  const autoPanTimer = useRef(null);
  const velocityRef = useRef({ dx: 0, dy: 0 });
  const lastMouseScreenPos = useRef(null);
  // Track the selection anchor and whether auto-pan is actively selecting
  const selectionAnchorRef = useRef(null); // flow-space start point
  const isAutoPanSelecting = useRef(false);

  // Store the IDs of nodes selected by our custom auto-pan logic
  const autoPanSelectedIdsRef = useRef(null);

  const stopAutoPan = useCallback(() => {
    if (autoPanTimer.current) {
      clearInterval(autoPanTimer.current);
      autoPanTimer.current = null;
    }
    isAutoPanSelecting.current = false;
    selectionAnchorRef.current = null;
    lastMouseScreenPos.current = null;
  }, []);

  // Helper: select all nodes whose bounding box intersects the given flow-space rect
  const selectNodesInRect = useCallback((flowRect) => {
    const minX = Math.min(flowRect.x1, flowRect.x2);
    const maxX = Math.max(flowRect.x1, flowRect.x2);
    const minY = Math.min(flowRect.y1, flowRect.y2);
    const maxY = Math.max(flowRect.y1, flowRect.y2);

    setNodes((nds) => {
      const selectedIds = [];
      const updated = nds.map((node) => {
        const nw = node.width || nodeWidth;
        const nh = node.height || nodeHeight;
        const nodeMinX = node.position.x;
        const nodeMaxX = node.position.x + nw;
        const nodeMinY = node.position.y;
        const nodeMaxY = node.position.y + nh;

        // Partial intersection check (selectionMode="partial")
        const intersects =
          nodeMinX < maxX && nodeMaxX > minX &&
          nodeMinY < maxY && nodeMaxY > minY;

        if (intersects) selectedIds.push(node.id);
        return { ...node, selected: intersects };
      });

      // Remember which nodes we selected so we can restore after mouseup
      autoPanSelectedIdsRef.current = selectedIds;
      return updated;
    });
  }, [setNodes]);

  const handlePointerMove = useCallback((e) => {
    if (e.shiftKey && e.buttons === 1 && reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const screenX = e.clientX;
      const screenY = e.clientY;

      // Record the anchor on first drag move
      if (!selectionAnchorRef.current) {
        selectionAnchorRef.current = screenToFlowPosition({ x: screenX, y: screenY });
      }

      lastMouseScreenPos.current = { x: screenX, y: screenY };

      const x = screenX - bounds.left;
      const y = screenY - bounds.top;
      const threshold = 100;
      const maxSpeed = 25;

      let dx = 0;
      let dy = 0;

      if (x < threshold) dx = Math.pow((threshold - x) / threshold, 2) * maxSpeed;
      else if (x > bounds.width - threshold) dx = -Math.pow((x - (bounds.width - threshold)) / threshold, 2) * maxSpeed;

      if (y < threshold) dy = Math.pow((threshold - y) / threshold, 2) * maxSpeed;
      else if (y > bounds.height - threshold) dy = -Math.pow((y - (bounds.height - threshold)) / threshold, 2) * maxSpeed;

      velocityRef.current = { dx, dy };

      if ((dx !== 0 || dy !== 0) && !autoPanTimer.current) {
        isAutoPanSelecting.current = true;
        autoPanTimer.current = setInterval(() => {
          const { x: vx, y: vy, zoom } = getViewport();
          const newVp = {
            x: vx + velocityRef.current.dx,
            y: vy + velocityRef.current.dy,
            zoom
          };
          setViewport(newVp, { duration: 0 });

          // Recompute the current mouse position in flow-space after viewport shift
          if (lastMouseScreenPos.current && selectionAnchorRef.current) {
            // Manual conversion: flowPos = (screenPos - viewportOffset) / zoom
            const currentFlowPos = {
              x: (lastMouseScreenPos.current.x - reactFlowWrapper.current.getBoundingClientRect().left - newVp.x) / newVp.zoom,
              y: (lastMouseScreenPos.current.y - reactFlowWrapper.current.getBoundingClientRect().top - newVp.y) / newVp.zoom
            };

            selectNodesInRect({
              x1: selectionAnchorRef.current.x,
              y1: selectionAnchorRef.current.y,
              x2: currentFlowPos.x,
              y2: currentFlowPos.y
            });
          }
        }, 16);
      } else if (dx === 0 && dy === 0) {
        // Mouse is inside the safe zone – stop auto-pan but keep anchor alive
        if (autoPanTimer.current) {
          clearInterval(autoPanTimer.current);
          autoPanTimer.current = null;
        }
      }
    } else {
      stopAutoPan();
    }
  }, [getViewport, setViewport, stopAutoPan, screenToFlowPosition, selectNodesInRect]);

  // On mouseup: if auto-pan selection was active, prevent ReactFlow from
  // overwriting our selection and restore the correct selected state.
  useEffect(() => {
    const wrapper = reactFlowWrapper.current;

    const handleMouseUp = (e) => {
      const wasSelecting = isAutoPanSelecting.current;
      const savedIds = autoPanSelectedIdsRef.current;

      stopAutoPan();

      if (wasSelecting && savedIds && savedIds.length > 0) {
        // Stop this mouseup from reaching ReactFlow so it doesn't
        // recalculate selection in screen-space and wipe ours out
        e.stopPropagation();
        e.preventDefault();

        // Re-apply our selection in a microtask to survive any
        // remaining React state flushes from the interval
        const idsToRestore = new Set(savedIds);
        queueMicrotask(() => {
          setNodes((nds) =>
            nds.map((n) => ({ ...n, selected: idsToRestore.has(n.id) }))
          );
        });

        autoPanSelectedIdsRef.current = null;
      }
    };

    if (wrapper) {
      // Use capture phase so we intercept before ReactFlow's handler
      wrapper.addEventListener('mouseup', handleMouseUp, true);
    }
    // Fallback: always clear timers on any mouseup
    const handleGlobalMouseUp = () => {
      if (!isAutoPanSelecting.current) stopAutoPan();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      if (wrapper) wrapper.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      stopAutoPan();
    };
  }, [stopAutoPan, setNodes]);

  // --- Undo/Redo History ---
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const takeSnapshot = useCallback(() => {
    setHistory(prev => [...prev, { nodes, edges }]);
    setRedoStack([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [{ nodes, edges }, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [history, nodes, edges]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory(prev => [...prev, { nodes, edges }]);
    setRedoStack(prev => prev.slice(1));
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [redoStack, nodes, edges]);

  // --- Copy/Paste ---
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const selectedEdges = edges.filter(e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));

    if (selectedNodes.length > 0) {
      const copyData = { nodes: selectedNodes, edges: selectedEdges };
      localStorage.setItem('ors_flow_clipboard', JSON.stringify(copyData));
    }
  }, [nodes, edges]);

  const handlePaste = useCallback(() => {
    const rawData = localStorage.getItem('ors_flow_clipboard');
    if (!rawData) return;

    try {
      const { nodes: copiedNodes, edges: copiedEdges } = JSON.parse(rawData);
      takeSnapshot();

      const idMap = {};
      const newNodes = copiedNodes.map(node => {
        const newId = getId();
        idMap[node.id] = newId;
        return {
          ...node,
          id: newId,
          position: { x: node.position.x + 50, y: node.position.y + 50 },
          selected: true
        };
      });

      // Deselect existing
      setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(newNodes));

      const newEdges = copiedEdges.map(edge => ({
        ...edge,
        id: `e_${Date.now()}_${Math.random()}`,
        source: idMap[edge.source],
        target: idMap[edge.target],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#94a3b8',
        }
      }));

      setEdges(eds => eds.concat(newEdges));
    } catch (err) {
      console.error("Paste error:", err);
    }
  }, [takeSnapshot, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
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

  const onUpdateEdge = useCallback((edgeId, newType) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, type: newType };
        }
        return edge;
      })
    );
    setSelectedEdge(prev => prev && prev.id === edgeId ? { ...prev, type: newType } : prev);
  }, [setEdges]);

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

  const edgeTypes = useMemo(() => ({
    adjustable: AdjustableEdge,
  }), []);

  const defaultEdgeOptions = useMemo(() => ({
    type: 'adjustable',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: '#94a3b8',
    },
  }), []);

  const onNodesChange = useCallback(
    (changes) => {
      // Record history if it's a "meaningful" change (removal or connect, etc.)
      const isMeaningful = changes.some(c => c.type === 'remove');
      if (isMeaningful) takeSnapshot();
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [takeSnapshot]
  );
  const onEdgesChange = useCallback(
    (changes) => {
      if (changes.some(c => c.type === 'remove')) takeSnapshot();
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [takeSnapshot]
  );
  const onConnect = useCallback(
    (params) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ 
        ...params, 
        type: 'adjustable',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#94a3b8',
        }
      }, eds));
    },
    [takeSnapshot, setEdges]
  );
  const onEdgeUpdateStart = useCallback((event) => {
    edgeUpdateSuccessful.current = false;
    // Lưu lại vị trí bắt đầu để kiểm tra xem có phải chỉ là click không
    window._edgeUpdateStartPos = { x: event.clientX, y: event.clientY };
  }, []);

  const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
    edgeUpdateSuccessful.current = true;
    setEdges((els) => updateEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const onEdgeUpdateEnd = useCallback((event, edge) => {
    const startPos = window._edgeUpdateStartPos;
    const endPos = { x: event.clientX, y: event.clientY };
    const distance = startPos ? Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)) : 0;

    // Chỉ xóa nếu:
    // 1. Thao tác update không thành công (kéo ra ngoài)
    // 2. Và người dùng thực sự đã kéo đi một đoạn (tránh trường hợp chỉ click vào đầu dây)
    if (!edgeUpdateSuccessful.current && distance > 10) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      takeSnapshot();
    }

    edgeUpdateSuccessful.current = true;
    window._edgeUpdateStartPos = null;
  }, [setEdges, takeSnapshot]);

  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

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
      takeSnapshot();
    },
    [screenToFlowPosition, takeSnapshot]
  );

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveModalData, setSaveModalData] = useState({ name: '', folder: '' });
  const [existingFolders, setExistingFolders] = useState([]);

  const fetchExistingFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/flows');
      const result = await response.json();
      if (result.success) {
        const folders = [...new Set(result.flows.map(f => f.group).filter(g => g !== 'Chung'))];
        setExistingFolders(folders);
      }
    } catch (err) {
      console.error("Lỗi khi lấy danh sách thư mục:", err);
    }
  }, []);

  const exportToJson = useCallback(async () => {
    await fetchExistingFolders();
    const initialName = activeFlowName ? activeFlowName.split('/').pop() : `script_${Date.now()}`;
    const initialFolder = activeFlowName && activeFlowName.includes('/')
      ? activeFlowName.split('/').slice(0, -1).join('/')
      : '';

    setSaveModalData({ name: initialName, folder: initialFolder });
    setIsSaveModalOpen(true);
  }, [activeFlowName, fetchExistingFolders]);

  const handleConfirmSave = async () => {
    let { name, folder } = saveModalData;
    if (!name.trim()) {
      alert("Vui lòng nhập tên kịch bản!");
      return;
    }

    const filename = folder.trim() ? `${folder.trim()}/${name.trim()}` : name.trim();

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
        setActiveFlowName(filename);
        setIsSaveModalOpen(false);
        alert(`Đã lưu kịch bản vào thư mục Workflow/${filename}.json`);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Lỗi khi lưu vào server:", err);
      // Fallback
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flow, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${name}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      alert("Đã tải xuống file vào thư mục mặc định của trình duyệt.");
      setIsSaveModalOpen(false);
    }
  };

  const onLayout = useCallback(() => {
    const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR',
    );

    setNodes([...layoutedNodes]);
    setEdges(layoutedEdges.map(e => ({ 
      ...e, 
      type: 'adjustable',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: '#94a3b8',
      }
    })));

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
          setEdges((flow.edges || []).map(e => ({ 
            ...e, 
            type: 'adjustable',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: '#94a3b8',
            }
          })));
          // Set active name if it's a file from disk (optional, based on filename)
          const fileName = event.target.files[0].name.replace('.json', '');
          setActiveFlowName(fileName);
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
        setEdges((flowData.edges || []).map(e => ({ 
          ...e, 
          type: 'adjustable',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: '#94a3b8',
          }
        })));
        setActiveFlowName(flowName);
        setViewMode('builder');
        // Clear history on load
        setHistory([]);
        setRedoStack([]);
      }
    } catch (err) {
      console.error('Loi khi tai flow:', err);
    }
  }, [setNodes, setEdges, setActiveFlowName]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        } else if (e.key === 'c') {
          // Copy handled by ReactFlow usually but we can force it
          handleCopy();
        } else if (e.key === 'v') {
          e.preventDefault();
          handlePaste();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleCopy, handlePaste]);

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
      <main
        ref={reactFlowWrapper}
        style={{ flex: 1, position: 'relative' }}
        onMouseMove={handlePointerMove}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          edgesUpdatable={true}
          edgesFocusable={true}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStart}
          edgeUpdaterRadius={25}
          snapToGrid={true}
          snapGrid={[10, 10]}
          selectionMode="partial"
          panOnScroll={true}
          panOnDrag={true}
          selectionOnDrag={true}
          selectionKeyCode="Shift"
          fitView
        >
          <Background color="#1e293b" gap={20} variant="dots" />
          <Controls />
        </ReactFlow>

        {/* Save Flow Modal */}
        {isSaveModalOpen && (
          <div className="ai-modal-overlay">
            <div className="save-modal-content glass-panel">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-xl text-white">
                    <Download size={20} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Lưu kịch bản</h2>
                </div>
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Thư mục nhóm</label>
                  <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto mb-3 custom-scrollbar pr-1">
                    <button
                      onClick={() => setSaveModalData(prev => ({ ...prev, folder: '' }))}
                      className={`folder-chip ${saveModalData.folder === '' ? 'active' : ''}`}
                    >
                      <Layers size={14} />
                      Chung
                    </button>
                    {existingFolders.map(f => (
                      <button
                        key={f}
                        onClick={() => setSaveModalData(prev => ({ ...prev, folder: f }))}
                        className={`folder-chip ${saveModalData.folder === f ? 'active' : ''}`}
                      >
                        <Layers size={14} />
                        {f}
                      </button>
                    ))}
                  </div>

                  <div className="relative mt-4">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Settings2 size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Hoặc tạo thư mục mới..."
                      value={saveModalData.folder}
                      onChange={(e) => setSaveModalData(prev => ({ ...prev, folder: e.target.value }))}
                      className="custom-input pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Tên kịch bản</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Code size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="VD: TaoYeuCau_SanXuat"
                      value={saveModalData.name}
                      onChange={(e) => setSaveModalData(prev => ({ ...prev, name: e.target.value }))}
                      className="custom-input pl-11"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setIsSaveModalOpen(false)}
                    className="btn-save-cancel"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    className="btn-save-confirm"
                  >
                    Lưu kịch bản
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button Group - Bottom Right */}
        <Panel position="bottom-right" style={{ margin: '0 24px 24px 0' }}>
          <div className="action-panel-container">
            {/* Undo/Redo Mini Group */}
            <div className="flex gap-1 mr-2">
              <button
                onClick={undo}
                disabled={history.length === 0}
                className={`p-2 rounded-xl border transition-all ${history.length === 0 ? 'bg-slate-50 text-slate-300' : 'bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md'}`}
                title="Hoàn tác (Ctrl+Z)"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={redo}
                disabled={redoStack.length === 0}
                className={`p-2 rounded-xl border transition-all ${redoStack.length === 0 ? 'bg-slate-50 text-slate-300' : 'bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md'}`}
                title="Làm lại (Ctrl+Y)"
              >
                <RotateCw size={18} />
              </button>
            </div>

            <div className="separator-v"></div>

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

        {(selectedNode || selectedEdge) && (
          <PropertyPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onUpdateNode={onUpdateNode}
            onUpdateEdge={onUpdateEdge}
            onClose={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
            }}
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
