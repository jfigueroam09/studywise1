import { aiConfigured, openAI, outputText } from '../../ai.js';

const daysUntil = date =>
  Math.ceil(
    (new Date(`${date}T23:59:59`) - Date.now()) / 86400000
  );

const clamp = (n, a, b) =>
  Math.max(a, Math.min(b, n));

function demoPlan(tasks = [], exams = []) {
  const items = [
    ...tasks
      .filter(t => t.status !== 'completed')
      .map(t => ({
        targetType: 'task',
        targetId: t.id,
        title: t.title,
        subject: t.subject,
        date: t.dueDate,
        minutes: Number(t.minutes || 30),
        difficulty: Number(t.difficulty || 3)
      })),

    ...exams.map(e => ({
      targetType: 'exam',
      targetId: e.id,
      title: e.subject,
      subject: e.subject,
      date: e.date,
      minutes: Number(e.availableMinutes || 60),
      difficulty: Number(e.difficulty || 3)
    }))
  ];

  const priorities = items
    .map(item => {
      const days = daysUntil(item.date);

      const urgency = clamp(
        10 - Math.max(days, 0) * 0.9,
        0,
        10
      );

      const difficulty = item.difficulty * 2;

      const effort = clamp(
        item.minutes / 30,
        1,
        10
      );

      const score =
        urgency * 0.5 +
        difficulty * 0.2 +
        effort * 0.15 +
        (item.targetType === 'exam' ? 2 : 0);

      return {
        ...item,
        priority: clamp(Math.round(score), 1, 10)
      };
    })
    .sort((a, b) => b.priority - a.priority);

  const sessions = priorities.slice(0, 7).map((item, index) => ({
    targetType: item.targetType,
    targetId: item.targetId,
    dayOffset: index,
    minutes: Math.min(60, item.minutes),
    reason:
      item.targetType === 'exam'
        ? `Preparació de l'examen de ${item.subject}.`
        : 'Combina urgència, dificultat i temps necessari.'
  }));

  return {
    summary:
      'Pla basat en dates, dificultat, esforç, tasques i exàmens pròxims.',
    priorities: priorities.map(item => ({
      targetType: item.targetType,
      targetId: item.targetId,
      priority: item.priority,
      reason:
        item.targetType === 'exam'
          ? `L'examen de ${item.subject} és pròxim.`
          : 'Combina urgència, dificultat i temps necessari.'
    })),
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
          targetType: {
            type: 'string',
            enum: ['task', 'exam']
          },
          targetId: {
            type: 'string'
          },
          priority: {
            type: 'integer'
          },
          reason: {
            type: 'string'
          }
        },
        required: [
          'targetType',
          'targetId',
          'priority',
          'reason'
        ]
      }
    },

    sessions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetType: {
            type: 'string',
            enum: ['task', 'exam']
          },
          targetId: {
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
        required: [
          'targetType',
          'targetId',
          'dayOffset',
          'minutes',
          'reason'
        ]
      }
    }
  },

  required: [
    'summary',
    'priorities',
    'sessions'
  ]
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Mètode no permès'
    });
  }

  try {
    const {
      tasks = [],
      exams = []
    } = req.body || {};

    if (!aiConfigured) {
      return res.status(200).json(
        demoPlan(tasks, exams)
      );
    }

    const data = await openAI(
      JSON.stringify({
        tasks,
        exams
      }),

      `Ets un assistent d'organització acadèmica per a estudiants de Batxillerat.

La teva funció és crear un pla d'estudi.

Pots planificar tant:
- tasques,
- com exàmens.

IMPORTANT:
- Una sessió pot estar relacionada amb una tasca o amb un examen.
- Si és una tasca, utilitza targetType="task".
- Si és un examen, utilitza targetType="exam".
- targetId HA DE ser exactament l'id de la tasca o examen proporcionat.
- NO inventis ids.
- Per a un examen, targetId ha de ser l'id de l'examen.
- Per a una tasca, targetId ha de ser l'id de la tasca.

Prioritza segons:
- data d'entrega o data de l'examen,
- dificultat,
- temps necessari,
- proximitat de l'examen.

NO facis deures, exercicis ni exàmens.
NO donis respostes per copiar.

Utilitza únicament les dades proporcionades per TRIA.`,

      {
        type: 'json_schema',
        name: 'study_plan',
        strict: true,
        schema
      }
    );

    const result = JSON.parse(
      outputText(data)
    );

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
