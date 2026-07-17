const http = require('http');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const spellHandler = require('../api/spell');

const PORT = Number(process.env.SPELL_API_PORT || 3001);

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('invalid json body'));
      }
    });
    req.on('error', reject);
  });
}

function adaptResponse(res) {
  return {
    setHeader: (name, value) => res.setHeader(name, value),
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(value) {
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(value));
    },
    end: (value) => res.end(value)
  };
}

const server = http.createServer(async (req, res) => {
  if (req.url !== '/api/spell') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  try {
    req.body = await readJsonBody(req);
    await spellHandler(req, adaptResponse(res));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: err.message || 'spell api failed' }));
  }
});

server.listen(PORT, () => {
  const keyState = process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY loaded' : 'GEMINI_API_KEY missing';
  console.log(`BookNote spell API listening on http://127.0.0.1:${PORT} (${keyState})`);
});
