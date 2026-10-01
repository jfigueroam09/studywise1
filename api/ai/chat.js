import { aiConfigured, openAI, outputText } from '../../ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'MÃ©todo no permitido' });
  }

  try {
    const {
      message = '',
      tasks = [],
      exams = [],
      scheduleEvents = []
    } = req.body || {};

    if (!message.trim()) {
      return res.status(400).json({ error: 'Mensaje vacÃ­o' });
    }

    if (!aiConfigured) {
      const pending = tasks
        .filter(t => t.status !== 'completed')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

      return res.status(200).json({
        answer: pending
          ? `Con tus datos actuales, empezarÃ­a por Â«${pending.title}Â», porque su fecha de entrega es ${pending.dueDate}.`
          : 'Primero aÃ±ade tus tareas y exÃ¡menes para poder ayudarte a priorizarlos.',
        mode: 'demo'
      });
    }

    const data = await openAI(
      JSON.stringify({
        studentQuestion: message,
        tasks,
        exams,
        scheduleEvents
      }),
      `Eres el orientador de estudio de TRIA, una aplicaciÃ³n para organizar el estudio de estudiantes de Bachillerato.

IMPORTANTE:
- El nombre de la aplicaciÃ³n es TRIA.
- Nunca menciones ni uses el nombre "StudyWise".
- Cuando te refieras a la aplicaciÃ³n, di siempre "TRIA".
- Ayuda a organizar el tiempo y priorizar.
- Ten en cuenta el horario semanal del estudiante cuando recomiendes momentos de estudio.
- No propongas estudiar durante clases u otras actividades registradas.
- No hagas tareas ni des respuestas para copiar.
- Responde en espaÃ±ol.
- Usa los datos acadÃ©micos proporcionados.
- Si faltan datos, dilo claramente.`,
      null
    );

    return res.status(200).json({
      answer: outputText(data),
      mode: 'ai'
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
