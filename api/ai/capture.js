export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Mètode no permès'
    });
  }

  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'La IA no està configurada.'
    });
  }

  const message =
    String(req.body?.message || '').trim();

  const today =
    String(req.body?.today || '').trim();

  if (!message) {
    return res.status(400).json({
      error: 'Escriu què tens pendent.'
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return res.status(400).json({
      error: 'La data actual no és vàlida.'
    });
  }

  const model =
    'gemini-3.5-flash-lite';

  const prompt = `
Ets el sistema d'entrada acadèmica de TRIA.

La persona està escrivint de manera natural què té per fer.
Has de convertir el text en elements acadèmics que TRIA pugui guardar.

DATA D'AVUI:
${today}

TEXT DE L'ESTUDIANT:
${message}

REGLAMENT:
- Respon NOMÉS amb JSON vàlid.
- Detecta tots els elements independents que hi hagi.
- Cada element ha de ser "task" o "exam".
- Una tasca necessita una data de lliurament.
- Un examen necessita una data d'examen.
- Interpreta "demà", "divendres", "dilluns que ve", etc. respecte de la DATA D'AVUI.
- No inventis una data si el text no permet determinar-la.
- Si falta una dada imprescindible per poder guardar un element, no el guardis.
- En aquest cas usa "needsClarification": true i formula una pregunta curta en català.
- Si hi ha diversos elements i només un és ambigu, guarda els que siguin clars i pregunta només per l'ambigu.
- "subject" és l'assignatura si es pot identificar.
- En una tasca, "estimatedMinutes" és una estimació raonable.
- "difficulty" és un enter de l'1 al 5.
- En un examen, "syllabus" és el temari indicat pel text.
- No converteixis una frase que només és una pregunta general en una tasca.
- No facis cap resposta explicativa fora del JSON.

FORMAT:
{
  "needsClarification": false,
  "question": "",
  "items": [
    {
      "type": "task",
      "title": "",
      "subject": "",
      "description": "",
      "date": "YYYY-MM-DD",
      "estimatedMinutes": 30,
      "difficulty": 3,
      "syllabus": "",
      "availableMinutes": 0
    }
  ]
}
`;

  try {
    const response =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        }
      );

    const data =
      await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        'Gemini no ha pogut interpretar la informació.'
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part?.text || '')
        .join('')
        .trim() || '';

    if (!text) {
      throw new Error(
        'La IA no ha retornat cap resultat.'
      );
    }

    const clean =
      text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    const parsed =
      JSON.parse(clean);

    const items =
      Array.isArray(parsed.items)
        ? parsed.items
            .map(item => ({
              type:
                item?.type === 'exam'
                  ? 'exam'
                  : 'task',
              title:
                String(item?.title || '').trim(),
              subject:
                String(item?.subject || '').trim(),
              description:
                String(item?.description || '').trim(),
              date:
                String(item?.date || '').trim(),
              estimatedMinutes:
                Math.max(
                  0,
                  Number(item?.estimatedMinutes) || 30
                ),
              difficulty:
                Math.min(
                  5,
                  Math.max(
                    1,
                    Number(item?.difficulty) || 3
                  )
                ),
              syllabus:
                String(item?.syllabus || '').trim(),
              availableMinutes:
                Math.max(
                  0,
                  Number(item?.availableMinutes) || 0
                )
            }))
            .filter(item =>
              item.title &&
              /^\d{4}-\d{2}-\d{2}$/.test(item.date)
            )
        : [];

    return res.status(200).json({
      needsClarification:
        Boolean(parsed.needsClarification) &&
        items.length === 0,
      question:
        String(parsed.question || '').trim(),
      items
    });

  } catch (error) {
    console.error('TRIA capture:', error);

    return res.status(500).json({
      error:
        error?.message ||
        'No s’ha pogut processar la informació.'
    });
  }
}
