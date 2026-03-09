import React, { useState, useEffect } from 'react';
import { Play, FileJson, Clock, RefreshCw, Layers, Globe, Square, Pencil, Trash2 } from 'lucide-react';

const ExecutionDashboard = ({ onBack, onEditFlow }) => {
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFlow, setSelectedFlow] = useState(null);
    const [logs, setLogs] = useState(["He thong da san sang...", "Cho khoi tao trinh duyet..."]);
    const [browserRunning, setBrowserRunning] = useState(false);
    const [browserLoading, setBrowserLoading] = useState(false);
    const [runningFlow, setRunningFlow] = useState(false);

    const ts = () => new Date().toLocaleTimeString();

    const fetchFlows = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/flows');
            const result = await response.json();
            if (result.success) {
                setFlows(result.flows);
            }
        } catch (err) {
            console.error("Loi khi lay danh sach kich ban:", err);
        } finally {
            setLoading(false);
        }
    };

    const deleteFlow = async (flow) => {
        if (!window.confirm(`Ban co chac chan muon xoa kich ban "${flow.filename}"?`)) return;

        try {
            const response = await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: flow.filename })
            });

            const result = await response.json();
            if (result.success) {
                setLogs(prev => [`[${ts()}] Da xoa kich ban: ${flow.filename}`, ...prev]);
                if (selectedFlow?.filename === flow.filename) setSelectedFlow(null);
                fetchFlows();
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            setLogs(prev => [`[LOI] Khong the xoa: ${err.message}`, ...prev]);
        }
    };


    // Check session status on mount
    const checkSession = async () => {
        try {
            const res = await fetch('/api/session/status');
            const data = await res.json();
            setBrowserRunning(data.running);
        } catch (e) { }
    };

    useEffect(() => {
        fetchFlows();
        checkSession();
    }, []);

    // --- Start Browser ---
    const startBrowser = async () => {
        setBrowserLoading(true);
        setLogs([`[${ts()}] Dang khoi tao trinh duyet Chrome...`]);

        try {
            const response = await fetch('/api/session/start', { method: 'POST' });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                chunk.split('\n').forEach(line => {
                    if (line.startsWith('data: ')) {
                        const msg = line.replace('data: ', '').trim();
                        if (msg) {
                            setLogs(prev => [`[${ts()}] ${msg}`, ...prev]);
                            if (msg.includes('READY')) {
                                setBrowserRunning(true);
                                setBrowserLoading(false);
                            }
                        }
                    }
                });
            }
        } catch (err) {
            setLogs(prev => [`[LOI] ${err.message}`, ...prev]);
            setBrowserLoading(false);
        }
    };

    // --- Stop Browser ---
    const stopBrowser = async () => {
        try {
            await fetch('/api/session/stop', { method: 'POST' });
            setBrowserRunning(false);
            setLogs(prev => [`[${ts()}] Trinh duyet da dong.`, ...prev]);
        } catch (err) {
            setLogs(prev => [`[LOI] ${err.message}`, ...prev]);
        }
    };

    // --- Run Flow ---
    const runFlow = async (flow) => {
        if (!browserRunning) {
            setLogs(prev => [`[${ts()}] [WARN] Can khoi tao trinh duyet truoc khi chay kich ban!`, ...prev]);
            return;
        }

        setSelectedFlow(flow);
        setRunningFlow(true);
        setLogs(prev => [`[${ts()}] Dang chay kich ban: ${flow.filename}...`, ...prev]);

        try {
            const response = await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flowName: flow.filename })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Khong the khoi chay');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                chunk.split('\n').forEach(line => {
                    if (line.startsWith('data: ')) {
                        const msg = line.replace('data: ', '').trim();
                        if (msg) {
                            setLogs(prev => [`[${ts()}] ${msg}`, ...prev]);
                        }
                    }
                });
            }
        } catch (err) {
            setLogs(prev => [`[LOI] ${err.message}`, ...prev]);
        } finally {
            setRunningFlow(false);
        }
    };


    return (
        <div className="execution-dashboard">
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="icon-box" style={{ background: '#3B82F6', color: 'white' }}>
                        <Play size={22} fill="currentColor" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>Trinh chay kich ban</h1>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Khoi tao trinh duyet, chon flow va thuc thi</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Browser control buttons */}
                    {!browserRunning ? (
                        <button
                            onClick={startBrowser}
                            disabled={browserLoading}
                            style={{
                                background: browserLoading ? '#94A3B8' : '#22C55E',
                                color: 'white', border: 'none', padding: '12px 24px',
                                borderRadius: '16px', fontWeight: 700, cursor: browserLoading ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                            }}
                        >
                            <Globe size={18} />
                            {browserLoading ? 'Dang khoi tao...' : 'Khoi tao trinh duyet'}
                        </button>
                    ) : (
                        <button
                            onClick={stopBrowser}
                            style={{
                                background: '#EF4444', color: 'white', border: 'none',
                                padding: '12px 24px', borderRadius: '16px', fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <Square size={16} fill="currentColor" />
                            Dong trinh duyet
                        </button>
                    )}

                    <button onClick={onBack} className="btn-secondary">
                        <Layers size={18} />
                        Mind-Map Builder
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                {/* Flow list */}
                <div className="flow-list-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 5px' }}>
                        <h2 style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '2px' }}>Kich ban cua ban</h2>
                        <button onClick={fetchFlows} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flow-card" style={{ opacity: 0.5, borderStyle: 'dashed' }}>
                                    <div style={{ width: '100px', height: '15px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                </div>
                            ))
                        ) : flows.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '24px', border: '2px dashed #E2E8F0' }}>
                                <FileJson size={40} style={{ color: '#E2E8F0', marginBottom: '10px' }} />
                                <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}>Chua co kich ban Workflow</p>
                            </div>
                        ) : (
                            flows.map((flow) => (
                                <div
                                    key={flow.filename}
                                    onClick={() => setSelectedFlow(flow)}
                                    className={`flow-card ${selectedFlow?.filename === flow.filename ? 'active' : ''}`}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div className="icon-box" style={{
                                            background: selectedFlow?.filename === flow.filename ? 'rgba(255,255,255,0.2)' : '#EFF6FF',
                                            color: selectedFlow?.filename === flow.filename ? 'white' : '#3B82F6'
                                        }}>
                                            <FileJson size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700 }}>{flow.filename}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.7, fontSize: '10px', fontWeight: 600 }}>
                                                <Clock size={12} />
                                                <span>{new Date(flow.mtime).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditFlow && onEditFlow(flow.filename); }}
                                            title="Chinh sua flow"
                                            style={{
                                                border: 'none',
                                                background: selectedFlow?.filename === flow.filename ? 'rgba(255,255,255,0.15)' : '#F1F5F9',
                                                color: selectedFlow?.filename === flow.filename ? 'white' : '#64748B',
                                                width: '32px', height: '32px', borderRadius: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: 'all 0.2s', padding: '0'
                                            }}
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteFlow(flow); }}
                                            disabled={runningFlow && selectedFlow?.filename === flow.filename}
                                            title="Xoa flow"
                                            style={{
                                                border: 'none',
                                                background: selectedFlow?.filename === flow.filename ? 'rgba(255,255,255,0.15)' : '#FFE4E6',
                                                color: selectedFlow?.filename === flow.filename ? 'white' : '#EF4444',
                                                width: '32px', height: '32px', borderRadius: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: 'all 0.2s', padding: '0'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); runFlow(flow); }}
                                            disabled={!browserRunning || runningFlow}
                                            style={{
                                                border: 'none',
                                                background: !browserRunning ? '#94A3B8' :
                                                    selectedFlow?.filename === flow.filename ? 'white' : '#3B82F6',
                                                color: selectedFlow?.filename === flow.filename ? '#3B82F6' : 'white',
                                                width: '32px', height: '32px', borderRadius: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: !browserRunning ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s', padding: '0',
                                                opacity: !browserRunning ? 0.5 : 1
                                            }}
                                        >
                                            <Play size={16} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Console Logs */}
                <div className="log-container">
                    <div className="log-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: browserRunning ? '#22C55E' : '#EF4444',
                                boxShadow: browserRunning ? '0 0 10px #22C55E' : '0 0 10px #EF4444'
                            }}></div>
                            <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {browserRunning ? 'BROWSER ACTIVE' : 'BROWSER OFFLINE'}
                            </span>
                        </div>
                        <button onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>XOA LOG</button>
                    </div>

                    <div className="log-body custom-scrollbar">
                        {logs.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.05 }}>
                                <Play size={120} color="white" fill="white" />
                            </div>
                        ) : (
                            logs.map((log, i) => {
                                let logClass = '';
                                const lowerLog = log.toLowerCase();
                                if (lowerLog.includes('thanh cong') || lowerLog.includes('ket thuc') || lowerLog.includes('hoan tat')) {
                                    logClass = 'success';
                                } else if (log.includes('ERROR') || log.includes('LOI')) {
                                    logClass = 'error';
                                } else if (log.includes('READY')) {
                                    logClass = 'info';
                                }

                                return (
                                    <div key={i} className={`log-entry ${logClass}`}>
                                        {log}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div style={{ padding: '16px 28px', background: '#020617', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569', fontSize: '11px', fontWeight: 600 }}>SCRIPT: {selectedFlow?.filename || 'Chua chon'}</span>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <span style={{ color: browserRunning ? '#22C55E' : '#475569', fontSize: '10px', fontWeight: 800 }}>
                                {browserRunning ? '● CHROME READY' : '○ CHROME OFFLINE'}
                            </span>
                            <span style={{ color: '#334155', fontSize: '10px', fontWeight: 800 }}>SELENIUM ENGINE</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecutionDashboard;
