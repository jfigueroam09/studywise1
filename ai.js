const model = process.env.OPENAI_MODEL || '';
const apiKey = process.env.OPENAI_API_KEY || '';

export const aiConfigured = Boolean(apiKey && model);

export async function openAI(input, instructions, format) {
  if (!aiConfigured) throw new Error('La IA real no está configurada. Añade OPENAI_API_KEY y OPENAI_MODEL en Vercel.');
  const body = { model, instructions, input };
  if (format) body.text = { format };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
  return data;
}

export function outputText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  return data.output?.flatMap(x => x.content || []).find(c => c.type === 'output_text')?.text || '';
}
