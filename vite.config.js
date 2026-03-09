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
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
            const filePath = path.join(targetDir, `${filename}.json`);
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
          const files = fs.readdirSync(targetDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
              filename: file.replace('.json', ''),
              path: path.join(targetDir, file),
              mtime: fs.statSync(path.join(targetDir, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, flows: files }));
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

      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), fileSavePlugin()],
})
