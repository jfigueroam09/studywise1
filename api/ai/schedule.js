import { aiConfigured, cleanJson, gemini, outputText } from '../../ai.js';

const DAYS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  try {
    const image = String(req.body?.image || '').trim();
    const mimeType = String(req.body?.mimeType || 'image/jpeg').trim();

    if (!image) {
      return res.status(400).json({ error: 'No s’ha rebut cap imatge.' });
    }

    if (!aiConfigured) {
      return res.status(503).json({ error: 'La IA no està configurada.' });
    }

    const data = await gemini({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analitza aquesta imatge d'un horari escolar.

Converteix només les classes visibles de dilluns a divendres en JSON.
No inventis classes.
Utilitza exactament aquests noms de dia: monday, tuesday, wednesday, thursday, friday.
Les hores han de tenir format HH:MM.
Si una cel·la no es pot llegir amb prou confiança, omet-la.

Respon NOMÉS:
{
  "events": [
    {
      "day": "monday",
      "startTime": "08:00",
      "endTime": "09:00",
      "title": "Matemàtiques",
      "subject": "Matemàtiques"
    }
  ]
}`
            },
            {
              inlineData: {
                mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
                data: image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(cleanJson(outputText(data)));
    const events = Array.isArray(parsed.events) ? parsed.events : [];

    const cleanEvents = events
      .map(event => ({
        day: String(event?.day || '').toLowerCase().trim(),
        startTime: String(event?.startTime || '').trim(),
        endTime: String(event?.endTime || '').trim(),
        title: String(event?.title || event?.subject || 'Classe').trim(),
        subject: String(event?.subject || event?.title || '').trim()
      }))
      .filter(event =>
        DAYS.has(event.day) &&
        validTime(event.startTime) &&
        (!event.endTime || validTime(event.endTime)) &&
        event.title
      );

    return res.status(200).json({ events: cleanEvents.slice(0, 100) });
  } catch (error) {
    console.error('TRIA schedule:', error);
    return res.status(500).json({
      error: error?.message || 'No s’ha pogut analitzar l’horari.'
    });
  }
}
