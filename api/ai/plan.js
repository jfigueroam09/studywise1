import { aiConfigured, cleanJson, gemini, outputText } from '../../ai.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

const WEEKDAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday'
];

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function minutesFromTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function weekdayForDate(value) {
  if (!validDate(value)) return '';
  return WEEKDAYS[new Date(`${value}T12:00:00Z`).getUTCDay()];
}

function overlapsClass(session, scheduleEvents) {
  const sessionStart = minutesFromTime(session.startTime);
  const sessionEnd = sessionStart + session.minutes;
  if (sessionStart === null || sessionEnd > 24 * 60) return true;

  const sessionDay = weekdayForDate(session.date);

  return scheduleEvents.some(event => {
    const sameDate = event?.date
      ? String(event.date) === session.date
      : String(event?.day || '').toLowerCase() === sessionDay;
    if (!sameDate) return false;

    const classStart = minutesFromTime(event?.startTime);
    if (classStart === null) return false;

    const parsedEnd = minutesFromTime(event?.endTime);
    const classEnd = parsedEnd !== null && parsedEnd > classStart
      ? parsedEnd
      : classStart + 60;

    return sessionStart < classEnd && sessionEnd > classStart;
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  try {
    const tasks = safeArray(req.body?.tasks);
    const exams = safeArray(req.body?.exams);
    const scheduleEvents = safeArray(req.body?.scheduleEvents);

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
Cada sessió ha de tenir una hora d'inici en format HH:MM.
L'horari escolar és recurrent per dia de la setmana quan no té una data concreta.
No programis cap sessió durant una classe. Si una classe no té hora de finalització, considera-la d'una hora.
Si no hi ha horari escolar, proposa hores d'estudi raonables a la tarda.
Respon NOMÉS JSON vàlid.

FORMAT:
{
  "summary": "resum curt del criteri de priorització",
  "sessions": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "17:00",
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
${JSON.stringify(exams, null, 2)}

HORARI ESCOLAR:
${JSON.stringify(scheduleEvents, null, 2)}`;

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

    const proposedSessions = safeArray(parsed.sessions);
    const validSessions = proposedSessions
      .map(session => ({
        date: String(session?.date || '').trim(),
        startTime: String(session?.startTime || '').trim(),
        title: String(session?.title || '').trim(),
        minutes: Math.max(10, Number(session?.minutes) || 30),
        targetType: session?.targetType === 'exam' ? 'exam' : 'task',
        targetId: String(session?.targetId || '').trim(),
        reason: String(session?.reason || '').trim()
      }))
      .filter(session => {
        if (!validDate(session.date)) return false;
        if (minutesFromTime(session.startTime) === null) return false;
        if (!session.title || !session.targetId) return false;
        return session.targetType === 'task'
          ? taskIds.has(session.targetId)
          : examIds.has(session.targetId);
      })
      .slice(0, 30);

    const sessions = validSessions.filter(session =>
      !overlapsClass(session, scheduleEvents)
    );

    const conflictCount = validSessions.length - sessions.length;
    const invalidCount = proposedSessions.length - validSessions.length;
    const summary = String(parsed.summary || '').trim();
    const notes = [];

    if (invalidCount) {
      notes.push(`${invalidCount} sessió/s s’han descartat perquè faltaven dades vàlides.`);
    }
    if (conflictCount) {
      notes.push(`${conflictCount} sessió/s s’han omès perquè coincidien amb classes.`);
    }
    if (!sessions.length && !notes.length) {
      notes.push('No s’ha pogut generar cap sessió; revisa que les tasques i els exàmens tinguin dates.');
    }

    return res.status(200).json({
      summary: [summary, ...notes].filter(Boolean).join(' '),
      sessions
    });
  } catch (error) {
    console.error('TRIA plan:', error);
    return res.status(500).json({
      error: error?.message || 'No s’ha pogut crear el pla.'
    });
  }
}
