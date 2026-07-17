// Vercel Serverless Function - Gemini 맞춤법 검사 + hanspell 폴백
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
    const input = text.slice(0, 3000);
    const result = process.env.GEMINI_API_KEY
      ? await checkSpellingWithGemini(input)
      : await checkSpellingWithHanspell(input);
    res.json(result);
  } catch (err) {
    try {
      const fallback = await checkSpellingWithHanspell(text.slice(0, 500));
      res.json({
        ...fallback,
        warning: err.message
      });
    } catch (fallbackErr) {
      res.status(500).json({
        error: err.message || fallbackErr.message,
        corrected: text,
        errors: [],
        changed: false,
        errorCount: 0
      });
    }
  }
};

async function checkSpellingWithGemini(text) {
  const model = process.env.GEMINI_SPELL_MODEL || 'gemini-3.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: [
              '너는 한국어 맞춤법, 띄어쓰기, 문장 교정 API다.',
              '원문 의미와 말투를 유지하고 명백한 오류만 고친다.',
              '각 수정 항목에는 학생이 이해할 수 있는 짧은 한국어 설명을 붙인다.',
              '반드시 순수 JSON만 반환한다. 마크다운 코드블록은 쓰지 않는다.',
              '형식: {"corrected":"교정문","errors":[{"original":"원문 오류","suggestion":"교정","info":"설명"}]}'
            ].join('\n')
          }]
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `다음 글을 교정해줘.\n\n${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini spell API failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const outputText = extractGeminiText(data);
  const parsed = parseModelJson(outputText);
  const corrected = typeof parsed.corrected === 'string' ? parsed.corrected : text;
  const errors = normalizeErrors(parsed.errors);

  return {
    corrected,
    errors,
    changed: corrected !== text,
    errorCount: errors.length,
    provider: 'gemini'
  };
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map(part => part.text || '').join('').trim();
  if (text) return text;
  throw new Error('Gemini 응답에서 교정 결과를 찾을 수 없습니다.');
}

function parseModelJson(outputText) {
  const trimmed = String(outputText || '').trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(withoutFence);
}

function normalizeErrors(errors) {
  if (!Array.isArray(errors)) return [];
  return errors
    .filter(item => item && (item.original || item.suggestion || item.info))
    .map(item => ({
      original: String(item.original || ''),
      suggestion: String(item.suggestion || ''),
      info: String(item.info || '')
    }));
}

function checkSpellingWithHanspell(text) {
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
          errorCount: errors.length,
          provider: 'hanspell'
        });
      },
      (err) => {
        reject(err || new Error('맞춤법 검사 실패'));
      }
    );
  });
}
