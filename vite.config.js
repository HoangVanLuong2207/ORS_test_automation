import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import readline from 'readline'

// --- Browser Session Manager ---
let sessionProcess = null;
let sessionReady = false;

function startSession() {
  if (sessionProcess) return true; // already running

  const targetDir = path.resolve(process.cwd(), 'Workflow');
  const sessionPath = path.join(targetDir, 'core', 'session.py');

  console.log(`[Session] Starting: ${sessionPath}`);
  sessionProcess = spawn('python', [sessionPath], {
    cwd: targetDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  sessionReady = false;

  sessionProcess.on('close', (code) => {
    console.log(`[Session] Process exited with code: ${code}`);
    sessionProcess = null;
    sessionReady = false;
  });

  return true;
}

function stopSession() {
  if (!sessionProcess) return;
  try {
    sessionProcess.stdin.write(JSON.stringify({ command: 'quit' }) + '\n');
  } catch (e) {
    sessionProcess.kill();
  }
  sessionProcess = null;
  sessionReady = false;
}

// Middleware
const fileSavePlugin = () => ({
  name: 'file-save-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // --- Save Flow ---
      if (req.method === 'POST' && req.url === '/api/save') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { filename, data } = JSON.parse(body);
            const targetDir = path.resolve(process.cwd(), 'Workflow');
            const filePath = path.join(targetDir, `${filename}.json`);
            const parentDir = path.dirname(filePath);

            if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, path: filePath }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });

        // --- Start Browser Session ---
      } else if (req.method === 'POST' && req.url === '/api/session/start') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (sessionProcess) {
          res.write('data: [SESSION] Trinh duyet da dang chay.\n\n');
          res.write('data: [SESSION] READY\n\n');
          res.end();
          return;
        }

        try {
          startSession();

          sessionProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => {
              res.write(`data: ${line}\n\n`);
              if (line.includes('READY')) {
                sessionReady = true;
                res.end();
              }
            });
          });

          sessionProcess.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => {
              res.write(`data: [ERROR] ${line}\n\n`);
            });
          });

          sessionProcess.on('close', () => {
            res.write('data: [SESSION] Trinh duyet da dong.\n\n');
            try { res.end(); } catch (e) { }
          });

        } catch (err) {
          res.write(`data: [ERROR] ${err.message}\n\n`);
          res.end();
        }

        // --- Stop Browser Session ---
      } else if (req.method === 'POST' && req.url === '/api/session/stop') {
        stopSession();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));

        // --- Session Status ---
      } else if (req.method === 'GET' && req.url === '/api/session/status') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ running: !!sessionProcess, ready: sessionReady }));

        // --- Run Flow (on persistent session) ---
      } else if (req.method === 'POST' && req.url === '/api/run') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { flowName } = JSON.parse(body);

            if (!sessionProcess) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Trinh duyet chua duoc khoi tao. Nhan nut "Khoi tao trinh duyet" truoc.' }));
              return;
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Create temporary listener for this run
            const onData = (data) => {
              const lines = data.toString().split('\n').filter(l => l.trim());
              lines.forEach(line => {
                // Check if it's a JSON status line
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.status === 'done' || parsed.status === 'error') {
                    res.write(`data: [SYSTEM] Kich ban ket thuc (${parsed.status})\n\n`);
                    sessionProcess.stdout.removeListener('data', onData);
                    sessionProcess.stderr.removeListener('data', onErr);
                    res.end();
                    return;
                  }
                } catch (e) {
                  // Not JSON, it's a log line
                }
                res.write(`data: ${line}\n\n`);
              });
            };

            const onErr = (data) => {
              const lines = data.toString().split('\n').filter(l => l.trim());
              lines.forEach(line => {
                res.write(`data: [ERROR] ${line}\n\n`);
              });
            };

            sessionProcess.stdout.on('data', onData);
            sessionProcess.stderr.on('data', onErr);

            // Send run command to session
            const cmd = JSON.stringify({ command: 'run', flow_path: `${flowName}.json` });
            sessionProcess.stdin.write(cmd + '\n');

          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });

        // --- List Flows ---
      } else if (req.method === 'GET' && req.url === '/api/flows') {
        const targetDir = path.resolve(process.cwd(), 'Workflow');
        try {
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

          const getFlowsRecursively = (dir, baseDir = '') => {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
              const filePath = path.join(dir, file);
              const stat = fs.statSync(filePath);
              if (stat && stat.isDirectory()) {
                // Skip core and actions
                if (file !== 'core' && file !== 'actions' && file !== '__pycache__') {
                  results = results.concat(getFlowsRecursively(filePath, path.join(baseDir, file)));
                }
              } else if (file.endsWith('.json')) {
                results.push({
                  filename: path.join(baseDir, file.replace('.json', '')).replace(/\\/g, '/'),
                  group: baseDir.replace(/\\/g, '/') || 'Chung',
                  mtime: stat.mtime
                });
              }
            });
            return results;
          };

          const flows = getFlowsRecursively(targetDir).sort((a, b) => b.mtime - a.mtime);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, flows }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message }));
        }

        // --- Get Flow Content ---
      } else if (req.url.startsWith('/api/flow-content')) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const name = url.searchParams.get('name');
        const targetDir = path.resolve(process.cwd(), 'Workflow');
        const filePath = path.join(targetDir, `${name}.json`);

        try {
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(content);
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: 'File not found' }));
          }
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message }));
        }

      } else if (req.method === 'POST' && req.url === '/api/delete') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { filename } = JSON.parse(body);
            const targetDir = path.resolve(process.cwd(), 'Workflow');
            const filePath = path.join(targetDir, `${filename}.json`);

            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, error: 'File not found' }));
            }
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });

      } else if (req.method === 'POST' && req.url === '/api/ai-summary') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            console.log("[AI-Summary] Received request");
            if (!body) {
              console.error("[AI-Summary] Empty body");
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Empty request body' }));
              return;
            }
            const payload = JSON.parse(body);
            const { nodes, edges } = payload || {};

            if (!Array.isArray(nodes)) {
              console.error("[AI-Summary] Invalid nodes", nodes);
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Dữ liệu kịch bản không hợp lệ (thiếu nodes).' }));
              return;
            }

            // Build adjacency list for traversal
            const adj = {};
            (edges || []).forEach(edge => {
              if (!adj[edge.source]) adj[edge.source] = [];
              adj[edge.source].push(edge.target);
            });

            // Find start node
            const startNode = nodes.find(n => n.data?.isStart || n.data?.originalId === 'start-flow' || n.id === 'start-node');
            console.log("[AI-Summary] Start node detected:", startNode?.id);

            if (!startNode) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Không tìm thấy nút "Bắt đầu" trong kịch bản.' }));
              return;
            }

            // --- Narrative AI Summary Builder (Full Branch Exploration) ---
            const buildNarrative = () => {
              let stepCounter = 1;
              const nodeStepMap = {};

              const describeNode = (nodeId, depth = 0, pathVisited = new Set()) => {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) return "";

                const data = node.data || {};
                const label = data.label || "";
                const note = data.note || "";

                // 1. Recursive Loop Detection (True cycle within the SAME path)
                if (pathVisited.has(nodeId)) {
                  const targetStep = nodeStepMap[nodeId] ? `bước ${nodeStepMap[nodeId]}` : `"${label || 'trước đó'}"`;
                  return `(Lặp lại từ ${targetStep})`;
                }

                const currentPathVisited = new Set(pathVisited);
                currentPathVisited.add(nodeId);

                // Assign step number only if not already assigned (keep the first occurrence as reference)
                if (!nodeStepMap[nodeId]) {
                  nodeStepMap[nodeId] = stepCounter++;
                }

                const currentStep = nodeStepMap[nodeId];
                const mainDesc = note ? `${note}` : `${label}`;

                // If depth > 0, we don't increment global step counter for sub-steps to keep things clean,
                // but we display them as a list.
                const prefix = depth === 0 ? `${currentStep}. ` : "   - ";

                let description = "";

                switch (data.originalId) {
                  case 'open-url':
                    description = `${prefix}Truy cập: ${mainDesc}.`;
                    break;
                  case 'mouse-click':
                    description = `${prefix}Thao tác: ${mainDesc}.`;
                    break;
                  case 'type-text':
                    description = `${prefix}Nhập liệu: ${mainDesc}.`;
                    break;
                  case 'press-key':
                    description = `${prefix}Phím tắt: Nhấn phím ${data.key || 'Enter'}${data.count > 1 ? ` (${data.count} lần)` : ''} (${mainDesc || 'Bàn phím'}).`;
                    break;
                  case 'key-combination':
                    description = `${prefix}Tổ hợp: Nhấn ${data.modifier || 'Ctrl'} + ${data.key || '...'}${data.count > 1 ? ` (${data.count} lần)` : ''} (${mainDesc || 'Tổ hợp phím'}).`;
                    break;
                  case 'wait-time':
                    description = `${prefix}Chờ đợi: ${mainDesc || `Chờ ${data.seconds || 0} giây`}.`;
                    break;
                  case 'if-condition':
                    const trueBranch = edges.find(e => e.source === nodeId && e.sourceHandle === 'true');
                    const falseBranch = edges.find(e => e.source === nodeId && e.sourceHandle === 'false');
                    description = `${prefix}Kiểm tra: ${mainDesc}.\n`;
                    if (trueBranch) {
                      description += `     + Nếu ĐÚNG: ${describeNode(trueBranch.target, depth + 1, currentPathVisited)}\n`;
                    }
                    if (falseBranch) {
                      description += `     + Nếu SAI: ${describeNode(falseBranch.target, depth + 1, currentPathVisited)}`;
                    }
                    return description;
                  case 'loop':
                    const loopBranch = edges.find(e => e.source === nodeId && e.sourceHandle === 'true');
                    const exitBranch = edges.find(e => e.source === nodeId && e.sourceHandle === 'false');
                    description = `${prefix}Vòng lặp: ${mainDesc || `Lặp lại ${data.count || 0} lần.`}\n`;
                    if (loopBranch) {
                      description += `     + Nội dung lặp: ${describeNode(loopBranch.target, depth + 1, currentPathVisited)}\n`;
                    }
                    if (exitBranch) {
                      description += `     + Sau khi lặp: ${describeNode(exitBranch.target, depth + 1, currentPathVisited)}`;
                    }
                    return description;
                  default:
                    if (data.isStart) return describeNext(nodeId, depth, currentPathVisited);
                    if (data.isEnd || nodeId === 'end-node') return `${prefix}🏁 Kết thúc quy trình.`;
                    description = `${prefix}${mainDesc}.`;
                }

                const nextDescription = describeNext(nodeId, depth, currentPathVisited);
                return nextDescription ? `${description}\n${nextDescription}` : description;
              };

              const describeNext = (nodeId, depth, pathVisited) => {
                const neighbors = (edges || []).filter(e => e.source === nodeId && !e.sourceHandle);
                if (neighbors.length > 0) {
                  return describeNode(neighbors[0].target, depth, pathVisited);
                }
                const specificNeighbors = (edges || []).filter(e => e.source === nodeId && e.sourceHandle);
                if (specificNeighbors.length === 1) {
                  return describeNode(specificNeighbors[0].target, depth, pathVisited);
                }
                return "";
              };

              return describeNode(startNode.id);
            };

            const narrative = buildNarrative();
            console.log("[AI-Summary] Narrative built");

            let summaryText = narrative
              ? "Dưới đây là tóm tắt kịch bản theo các bước chính:\n\n" + narrative
              : "Kịch bản của bạn chưa có các bước thực thi cụ thể sau nút Bắt đầu.";

            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(JSON.stringify({ success: true, summary: summaryText }));
          } catch (err) {
            console.error("[AI-Summary] Error:", err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });

      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), fileSavePlugin()],
})
