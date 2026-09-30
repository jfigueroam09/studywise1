import { aiConfigured, openAI, outputText } from '../../ai.js';

const daysUntil = date =>
  Math.ceil((new Date(`${date}T23:59:59`) - Date.now()) / 86400000);

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function demoPlan(tasks = [], exams = []) {
  const boosts = new Map(
    exams.map(e => [e.subject, Math.max(0, 10 - daysUntil(e.date))])
  );

  const priorities = tasks
    .filter(t => t.status !== 'completed')
    .map(t => {
      const days = daysUntil(t.dueDate);
      const urgency = clamp(10 - Math.max(days, 0) * 0.9, 0, 10);
      const difficulty = Number(t.difficulty || 3) * 2;
      const effort = clamp(Number(t.minutes || 30) / 30, 1, 10);
      const exam = boosts.get(t.subject) || 0;

      const score =
        urgency * 0.42 +
        difficulty * 0.2 +
        effort * 0.13 +
        exam * 0.25;

      return {
        taskId: t.id,
        priority: clamp(Math.round(score), 1, 10),
        reason:
          exam > 4
            ? `Tienes un examen próximo de ${t.subject}.`
            : days <= 2
              ? 'La fecha de entrega está muy cerca.'
              : 'Combina urgencia, dificultad y tiempo necesario.'
      };
    })
    .sort((a, b) => b.priority - a.priority);

  const sessions = priorities.slice(0, 7).map((p, index) => ({
    taskId: p.taskId,
    dayOffset: index,
    minutes: Math.min(
      60,
      tasks.find(t => t.id === p.taskId)?.minutes || 30
    ),
    reason: p.reason
  }));

  return {
    summary:
      'Plan basado en fechas, dificultad, esfuerzo y exámenes próximos.',
    priorities,
    sessions,
    mode: 'demo'
  };
}

const schema = {
  type: 'object',
  properties: {
    summary: {
      type: 'string'
    },
    priorities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string'
          },
          priority: {
            type: 'integer'
          },
          reason: {
            type: 'string'
          }
        },
        required: ['taskId', 'priority', 'reason']
      }
    },
    sessions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string'
          },
          dayOffset: {
            type: 'integer'
          },
          minutes: {
            type: 'integer'
          },
          reason: {
            type: 'string'
          }
        },
        required: ['taskId', 'dayOffset', 'minutes', 'reason']
      }
    }
  },
  required: ['summary', 'priorities', 'sessions']
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido'
    });
  }

  try {
    const { tasks = [], exams = [] } = req.body || {};

    if (!aiConfigured) {
      return res.status(200).json(demoPlan(tasks, exams));
    }

    const data = await openAI(
      JSON.stringify({ tasks, exams }),
      `Eres un asistente de organización académica para estudiantes de Bachillerato.

NO hagas deberes, ejercicios ni exámenes.
NO des respuestas para copiar.

Tu función es:
- Priorizar las tareas.
- Tener en cuenta las fechas de entrega.
- Tener en cuenta la dificultad.
- Tener en cuenta el tiempo necesario.
- Tener en cuenta los exámenes próximos.
- Proponer sesiones de estudio realistas.
- Explicar brevemente por qué recomiendas cada tarea.

Usa únicamente los datos proporcionados por StudyWise.`,
      {
        type: 'json_schema',
        name: 'study_plan',
        strict: true,
        schema
      }
    );

    const result = JSON.parse(outputText(data));

    return res.status(200).json({
      ...result,
      mode: 'ai'
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}
