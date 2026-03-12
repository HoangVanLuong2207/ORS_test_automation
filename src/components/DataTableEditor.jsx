import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ClipboardPaste, LayoutGrid } from 'lucide-react';

const DataTableEditor = ({ value, onChange }) => {
    const [grid, setGrid] = useState([['header1', 'header2'], ['', '']]);
    const scrollContainerRef = useRef(null);

    // Sync grid with initial value or incoming changes
    useEffect(() => {
        if (!value) return;

        try {
            const rows = value.split('\n').filter(r => r.trim());
            const parsedGrid = rows.map(r => r.split(',').map(c => c.trim()));
            if (parsedGrid.length > 0) {
                const currentCsv = grid.map(row => row.join(', ')).join('\n');
                if (value.trim() !== currentCsv.trim()) {
                    setGrid(parsedGrid);
                }
            }
        } catch (e) {
            console.error("Failed to parse CSV", e);
        }
    }, [value]);

    const updateValue = (newGrid) => {
        setGrid(newGrid);
        const csv = newGrid.map(row => row.join(', ')).join('\n');
        onChange(csv);
    };

    const handleCellChange = (rowIndex, colIndex, newVal) => {
        const newGrid = grid.map((row, rIdx) => {
            if (rIdx === rowIndex) {
                const newRow = [...row];
                newRow[colIndex] = newVal;
                return newRow;
            }
            return row;
        });
        updateValue(newGrid);
    };

    const addRow = () => {
        const numCols = grid[0]?.length || 2;
        const newRow = new Array(numCols).fill('');
        updateValue([...grid, newRow]);
    };

    const addColumn = () => {
        const newGrid = grid.map((row, idx) => {
            const newColVal = idx === 0 ? `Col ${row.length + 1}` : '';
            return [...row, newColVal];
        });
        updateValue(newGrid);

        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
            }
        }, 50);
    };

    const removeRow = (index) => {
        if (grid.length <= 2 && index === 0) return;
        const newGrid = grid.filter((_, i) => i !== index);
        updateValue(newGrid);
    };

    const removeColumn = (index) => {
        if (grid[0].length <= 1) return;
        const newGrid = grid.map(row => row.filter((_, i) => i !== index));
        updateValue(newGrid);
    };

    const handlePaste = (e) => {
        const pasteData = e.clipboardData.getData('text');
        if (!pasteData) return;

        const rows = pasteData.split(/\r?\n/).filter(r => r.trim());
        let newGrid = [];

        if (pasteData.includes('\t')) {
            newGrid = rows.map(r => r.split('\t').map(c => c.trim()));
        } else if (pasteData.includes(',')) {
            newGrid = rows.map(r => r.split(',').map(c => c.trim()));
        } else {
            newGrid = rows.map(r => [r.trim()]);
        }

        if (newGrid.length > 0) {
            updateValue(newGrid);
            e.preventDefault();
        }
    };

    return (
        <div className="data-table-container flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-1 mb-4">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500 rounded-lg shadow-sm">
                        <LayoutGrid size={12} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 uppercase">Excel Data</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={addColumn}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95"
                    >
                        <Plus size={12} /> CỘT
                    </button>
                    <button
                        onClick={addRow}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-green-600 hover:border-green-400 hover:bg-green-50 transition-all active:scale-95"
                    >
                        <Plus size={12} /> DÒNG
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="overflow-x-auto overflow-y-hidden custom-scrollbar max-h-[300px] overflow-y-auto"
                onPaste={handlePaste}
            >
                <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-100/50">
                            {grid[0]?.map((colName, i) => (
                                <th key={i} className="group relative border-r border-b border-slate-100 p-0 min-w-[120px]">
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between px-2 py-1 bg-slate-200/30">
                                            <span className="text-[9px] font-black text-slate-400">VAR {i + 1}</span>
                                            <button
                                                onClick={() => removeColumn(i)}
                                                className="p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={colName}
                                            onChange={(e) => handleCellChange(0, i, e.target.value)}
                                            className="w-full px-2 py-1.5 text-[11px] font-bold text-indigo-600 bg-transparent border-none outline-none text-center"
                                            placeholder="Header..."
                                        />
                                    </div>
                                </th>
                            ))}
                            <th className="w-10 border-b border-slate-100"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {grid.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex} className="group hover:bg-slate-50">
                                {row.map((cell, colIndex) => (
                                    <td key={colIndex} className="border-r border-b border-slate-50 p-0">
                                        <input
                                            type="text"
                                            value={cell}
                                            onChange={(e) => handleCellChange(rowIndex + 1, colIndex, e.target.value)}
                                            className="w-full px-2 py-2 text-[11px] text-slate-600 bg-transparent border-none outline-none focus:bg-white"
                                            placeholder="..."
                                        />
                                    </td>
                                ))}
                                <td className="w-10 border-b border-slate-50 px-2 text-center">
                                    <button
                                        onClick={() => removeRow(rowIndex + 1)}
                                        className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 opacity-50">
                    <ClipboardPaste size={10} />
                    <span className="text-[9px] font-bold">Paste from Excel supported</span>
                </div>
                <div className="text-[9px] font-bold text-slate-300 uppercase">
                    {grid.length - 1} Rows • {grid[0]?.length} Cols
                </div>
            </div>
        </div>
    );
};

export default DataTableEditor;
