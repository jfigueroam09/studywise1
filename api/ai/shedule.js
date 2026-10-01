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
          title: {
            type: 'string'
          },
          subject: {
            type: 'string'
          },
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
          startTime: {
            type: 'string'
          },
          endTime: {
            type: 'string'
          },
          type: {
            type: 'string',
            enum: [
              'class',
              'exam',
              'study',
              'personal'
            ]
          },
          notes: {
            type: 'string'
          }
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
      error: 'Método no permitido'
    });
  }

  try {

    const apiKey =
      process.env.GEMINI_API_KEY || '';

    if (!apiKey || !aiConfigured) {
      return res.status(503).json({
        error:
          'La IA no está configurada. Añade GEMINI_API_KEY en Vercel.'
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
              text: `
Analiza esta fotografía de un horario escolar.

Convierte únicamente la información visible del horario en una lista estructurada de clases.

REGLAS IMPORTANTES:

- Lee únicamente lo que aparece en la imagen.
- No inventes asignaturas.
- No inventes horas.
- No inventes profesores.
- No inventes aulas.
- Identifica los días de lunes a viernes.
- Identifica la hora inicial y final de cada actividad.
- Identifica el nombre de la asignatura.
- Si aparece un profesor, aula u otra información útil, puedes ponerla en notes.
- Si una celda está vacía, no crees ninguna actividad.
- Si una asignatura ocupa varias horas consecutivas, crea una sola actividad.
- Usa SIEMPRE el formato HH:MM para las horas.
- Usa exactamente estos valores para day:
  monday
  tuesday
  wednesday
  thursday
  friday
- Una clase normal debe tener type="class".
- Responde exclusivamente con el JSON solicitado.
              `.trim()
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


    const data =
      await response.json();


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
        'La IA no devolvió datos del horario.'
      );
    }


    const result =
      JSON.parse(text);


    function normalizeTime(value) {

      const raw =
        String(value ?? '').trim();


      if (!raw) {
        return '';
      }


      let match =
        raw.match(
          /^(?:[01]?\d|2[0-3]):([0-5]\d)$/
        );


      if (match) {

        const [
          hour,
          minute
        ] =
          raw.split(':');


        return (
          `${hour.padStart(2, '0')}:${minute}`
        );
      }


      const compact =
        raw
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[.,h]/g, ':');


      match =
        compact.match(
          /^(\d{1,2}):(\d{2})$/
        );


      if (match) {

        const hour =
          Number(match[1]);

        const minute =
          Number(match[2]);


        if (
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59
        ) {

          return (
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
          );
        }
      }


      return '';
    }


    const allowedDays =
      new Set([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday'
      ]);


    const allowedTypes =
      new Set([
        'class',
        'exam',
        'study',
        'personal'
      ]);


    const events =
      Array.isArray(result.events)

        ? result.events
            .map(event => ({

              title:
                String(
                  event?.title || ''
                ).trim(),

              subject:
                String(
                  event?.subject || ''
                ).trim(),

              day:
                allowedDays.has(event?.day)
                  ? event.day
                  : '',

              startTime:
                normalizeTime(
                  event?.startTime
                ),

              endTime:
                normalizeTime(
                  event?.endTime
                ),

              type:
                allowedTypes.has(event?.type)
                  ? event.type
                  : 'class',

              notes:
                String(
                  event?.notes || ''
                ).trim()

            }))

            .filter(event => {

              if (!event.title) {
                return false;
              }

              if (!event.day) {
                return false;
              }

              if (!event.startTime) {
                return false;
              }

              if (!event.endTime) {
                return false;
              }

              if (
                event.endTime <=
                event.startTime
              ) {
                return false;
              }

              return true;
            })

        : [];


    return res.status(200).json({
      events
    });


  } catch (error) {

    console.error(
      'TRIA schedule error:',
      error
    );


    return res.status(500).json({
      error:
        error?.message ||
        'No se pudo analizar el horario.'
    });
  }
}
