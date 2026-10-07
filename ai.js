export const aiConfigured = Boolean(process.env.GEMINI_API_KEY);

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function gemini(body) {
  if (!aiConfigured) {
    throw new Error('La IA no està configurada.');
  }

  const response = await fetch(
    `${API_URL}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message || 'Gemini no ha pogut processar la petició.'
    );
  }

  return data;
}

export function outputText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map(part => part?.text || '')
    .join('')
    .trim() || '';
}

export function cleanJson(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
