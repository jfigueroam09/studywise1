import { aiConfigured, gemini, outputText } from '../../ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  try {
    const {
      message = '',
      tasks = [],
      exams = [],
      scheduleEvents = [],
      history = []
    } = req.body || {};
    const cleanMessage = String(message).trim();

    if (!cleanMessage) {
      return res.status(400).json({ error: 'Missatge buit.' });
    }

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeExams = Array.isArray(exams) ? exams : [];
    const safeScheduleEvents = Array.isArray(scheduleEvents)
      ? scheduleEvents
      : [];
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .filter(item =>
            ['user', 'assistant'].includes(item?.role) &&
            String(item?.text || '').trim()
          )
          .map(item => ({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(item.text).slice(0, 2000) }]
          }))
      : [];

    if (!aiConfigured) {
      const dayAliases = {
        monday: ['dilluns', 'lunes'],
        tuesday: ['dimarts', 'martes'],
        wednesday: ['dimecres', 'miércoles', 'miercoles'],
        thursday: ['dijous', 'jueves'],
        friday: ['divendres', 'viernes'],
        saturday: ['dissabte', 'sábado', 'sabado'],
        sunday: ['diumenge', 'domingo']
      };
      const requestedDay = Object.entries(dayAliases).find(([, aliases]) =>
        aliases.some(alias => cleanMessage.toLocaleLowerCase().includes(alias))
      );

      if (requestedDay) {
        const [day, aliases] = requestedDay;
        const dayName = aliases[0];
        const classes = safeScheduleEvents
          .filter(event => String(event?.day || '').toLowerCase() === day)
          .sort((a, b) => String(a?.startTime || '').localeCompare(String(b?.startTime || '')));
        const classSummary = classes.length
          ? classes.map(event => {
              const time = event.endTime
                ? `${event.startTime}–${event.endTime}`
                : event.startTime;
              return `${time ? `${time} ` : ''}${event.title || event.subject || 'Classe'}`;
            }).join('; ')
          : `no hi ha cap classe registrada per ${dayName}`;

        return res.status(200).json({
          answer: `Segons l’horari guardat, per ${dayName} tens: ${classSummary}. Les tasques i els exàmens són una altra informació; només els puc indicar si també estan registrats a TRIA.`,
          mode: 'fallback'
        });
      }

      const pending = Array.isArray(tasks)
        ? tasks
            .filter(task => task?.status !== 'completed')
            .sort((a, b) => String(a?.dueDate || '').localeCompare(String(b?.dueDate || '')))[0]
        : null;

      return res.status(200).json({
        answer: pending
          ? `Amb les dades actuals, començaria per «${pending.title}», perquè és la tasca pendent amb la data més propera.`
          : 'Afegeix tasques o exàmens i podré ajudar-te a prioritzar-los.',
        mode: 'fallback'
      });
    }

    const data = await gemini({
      contents: [
        ...safeHistory,
        {
          role: 'user',
          parts: [
            {
              text: `Ets l'orientador d'estudi de TRIA, una aplicació per organitzar l'estudi de Batxillerat.

IMPORTANT:
- L'aplicació es diu TRIA.
- Respon en català.
- No facis la feina de l'estudiant ni donis respostes per copiar.
- Ajuda a entendre, practicar, prioritzar i planificar.
- Utilitza les dades reals de tasques, exàmens i horari que reps a continuació.
- Si pregunta què té un dia concret, consulta l'horari i indica les classes d'aquell dia. Després diferencia-les de les tasques o els exàmens amb data.
- L'horari conté classes recurrents; no les presentis com a tasques pendents.
- Si no hi ha cap classe registrada aquell dia, digues-ho clarament i no inventis informació.
- Si una dada no existeix, digues-ho clarament.
- Sigues concret i útil; evita frases buides.

PREGUNTA DE L'ESTUDIANT:
${cleanMessage}

TASQUES:
${JSON.stringify(safeTasks, null, 2)}

EXÀMENS:
${JSON.stringify(safeExams, null, 2)}

HORARI SETMANAL:
${JSON.stringify(safeScheduleEvents, null, 2)}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.25
      }
    });

    const answer = outputText(data);

    if (!answer) {
      throw new Error('Gemini no ha retornat cap resposta.');
    }

    return res.status(200).json({ answer, mode: 'ai' });
  } catch (error) {
    console.error('TRIA chat:', error);
    return res.status(500).json({
      error: error?.message || 'No s’ha pogut connectar amb la IA.'
    });
  }
}
