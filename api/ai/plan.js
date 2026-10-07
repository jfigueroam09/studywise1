import { aiConfigured, cleanJson, gemini, outputText } from '../../ai.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  try {
    const tasks = safeArray(req.body?.tasks);
    const exams = safeArray(req.body?.exams);

    if (!tasks.length && !exams.length) {
      return res.status(400).json({
        error: 'Afegeix almenys una tasca o un examen abans de crear el pla.'
      });
    }

    if (!aiConfigured) {
      return res.status(200).json({
        summary: 'No hi ha cap clau d’IA configurada. Pots continuar organitzant les teves tasques manualment.',
        sessions: []
      });
    }

    const prompt = `Ets el planificador d'estudi de TRIA.

Crea un pla d'estudi realista a partir de les dades proporcionades.
Prioritza, per aquest ordre general:
1. Exàmens propers.
2. Tasques amb data de lliurament propera.
3. Tasques difícils o llargues.
4. Evita sobrecarregar un únic dia.

No inventis tasques ni exàmens.
Cada sessió ha d'estar vinculada a un targetId existent.
Respon NOMÉS JSON vàlid.

FORMAT:
{
  "summary": "resum curt del criteri de priorització",
  "sessions": [
    {
      "date": "YYYY-MM-DD",
      "title": "què estudiar o fer",
      "minutes": 30,
      "targetType": "task" | "exam",
      "targetId": "id existent",
      "reason": "motiu curt"
    }
  ]
}

TASQUES:
${JSON.stringify(tasks, null, 2)}

EXÀMENS:
${JSON.stringify(exams, null, 2)}`;

    const data = await gemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: 'application/json'
      }
    });

    const text = outputText(data);
    const parsed = JSON.parse(cleanJson(text));

    const taskIds = new Set(tasks.map(task => String(task.id)));
    const examIds = new Set(exams.map(exam => String(exam.id)));

    const sessions = safeArray(parsed.sessions)
      .map(session => ({
        date: String(session?.date || '').trim(),
        title: String(session?.title || '').trim(),
        minutes: Math.max(10, Number(session?.minutes) || 30),
        targetType: session?.targetType === 'exam' ? 'exam' : 'task',
        targetId: String(session?.targetId || '').trim(),
        reason: String(session?.reason || '').trim()
      }))
      .filter(session => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date)) return false;
        if (!session.title || !session.targetId) return false;
        return session.targetType === 'task'
          ? taskIds.has(session.targetId)
          : examIds.has(session.targetId);
      })
      .slice(0, 30);

    return res.status(200).json({
      summary: String(parsed.summary || '').trim(),
      sessions
    });
  } catch (error) {
    console.error('TRIA plan:', error);
    return res.status(500).json({
      error: error?.message || 'No s’ha pogut crear el pla.'
    });
  }
}
