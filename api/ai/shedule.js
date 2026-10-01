import { aiConfigured } from '../../ai.js';

const model = 'gemini-3.5-flash-lite';

const schema = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          subject: { type: 'string' },
          day: {
            type: 'string',
            enum: [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday'
            ]
          },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          type: {
            type: 'string',
            enum: [
              'class',
              'exam',
              'study',
              'personal'
            ]
          },
          notes: { type: 'string' }
        },
        required: [
          'title',
          'subject',
          'day',
          'startTime',
          'endTime',
          'type',
          'notes'
        ]
      }
    }
  },
  required: ['events']
};

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'MÃ©todo no permitido'
    });
  }

  try {

    const apiKey =
      process.env.GEMINI_API_KEY || '';

    if (!apiKey || !aiConfigured) {
      return res.status(503).json({
        error:
          'La IA no estÃ¡ configurada. AÃ±ade GEMINI_API_KEY en Vercel.'
      });
    }

    const {
      image = '',
      mimeType = 'image/jpeg'
    } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: 'No se ha recibido ninguna imagen.'
      });
    }

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: image
              }
            },
            {
              text: `Analiza esta fotografÃ­a de un horario escolar.

Tu trabajo es convertir el horario visual en una lista estructurada de clases.

Reglas:
- Lee Ãºnicamente lo que aparezca en la imagen.
- Identifica los dÃ­as de lunes a viernes.
- Identifica las horas de inicio y finalizaciÃ³n.
- Identifica la asignatura o actividad.
- Si aparece un profesor, aula o informaciÃ³n adicional Ãºtil, puedes ponerla en notes.
- No inventes clases que no se vean.
- Si una celda estÃ¡ vacÃ­a, no la conviertas en una actividad.
- Si una asignatura ocupa varias horas consecutivas, crea una sola actividad con la hora inicial y final.
- Usa siempre horas en formato HH:MM.
- Usa estos valores para day:
  monday, tuesday, wednesday, thursday, friday.
- Para una clase normal usa type="class".
- Responde exclusivamente con el JSON solicitado.`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    };

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
        data?.error?.message ||
        `Gemini HTTP ${response.status}`
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('') || '';

    if (!text) {
      throw new Error(
        'La IA no devolviÃ³ datos del horario.'
      );
    }

    const result = JSON.parse(text);

    return res.status(200).json({
      events: Array.isArray(result.events)
        ? result.events
        : []
    });

  } catch (error) {

    return res.status(500).json({
      error: error.message
    });
  }
}
