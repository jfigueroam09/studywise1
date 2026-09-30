const apiKey = process.env.GEMINI_API_KEY || '';

const model = 'gemini-3.5-flash-lite';

export const aiConfigured = Boolean(apiKey);

export async function openAI(input, instructions, format) {
  if (!aiConfigured) {
    throw new Error(
      'La IA real no está configurada. Añade GEMINI_API_KEY en Vercel.'
    );
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${instructions}\n\nDatos de StudyWise:\n${input}`
          }
        ]
      }
    ]
  };

  if (format?.type === 'json_schema') {
    body.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: format.schema
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Gemini HTTP ${response.status}`
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('') || '';

  if (!text) {
    throw new Error('Gemini no devolvió ningún texto.');
  }

  return {
    output_text: text
  };
}

export function outputText(data) {
  return data?.output_text || '';
}
