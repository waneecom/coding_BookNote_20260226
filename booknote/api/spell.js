// Vercel Serverless Function - 카카오(다음) 맞춤법 검사기 프록시
const hanspell = require('hanspell');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const text = req.body?.text;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const result = await checkSpelling(text.slice(0, 500));
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      corrected: text,
      errors: [],
      changed: false,
      errorCount: 0
    });
  }
};

function checkSpelling(text) {
  return new Promise((resolve, reject) => {
    const errors = [];

    hanspell.spellCheckByDAUM(
      text,
      8000,
      (data) => {
        if (data && Array.isArray(data)) {
          data.forEach(item => {
            if (item.token && item.suggestions && item.suggestions.length > 0) {
              errors.push({
                original: item.token,
                suggestion: item.suggestions[0],
                info: item.info || ''
              });
            }
          });
        }
      },
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        // 교정 적용
        let corrected = text;
        for (const e of errors) {
          const escaped = e.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          corrected = corrected.replace(new RegExp(escaped, 'g'), e.suggestion);
        }
        resolve({
          corrected,
          errors,
          changed: corrected !== text,
          errorCount: errors.length
        });
      },
      (err) => {
        reject(err || new Error('맞춤법 검사 실패'));
      }
    );
  });
}
