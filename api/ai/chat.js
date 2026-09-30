import { aiConfigured, openAI, outputText } from '../../ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message = '', tasks = [], exams = [] } = req.body || {};

    if (!message.trim()) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    if (!aiConfigured) {
      const pending = tasks
        .filter(t => t.status !== 'completed')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

      return res.status(200).json({
        answer: pending
          ? `Con tus datos actuales, empezaría por «${pending.title}», porque su fecha de entrega es ${pending.dueDate}.`
          : 'Primero añade tus tareas y exámenes para poder ayudarte a priorizarlos.',
        mode: 'demo'
      });
    }

    const data = await openAI(
      JSON.stringify({ studentQuestion: message, tasks, exams }),
      `Eres el orientador de estudio de TRIA, una aplicación para organizar el estudio de estudiantes de Bachillerato.

IMPORTANTE:
- El nombre de la aplicación es TRIA.
- Nunca menciones ni uses el nombre "StudyWise".
- Cuando te refieras a la aplicación, di siempre "TRIA".
- Ayuda a organizar el tiempo y priorizar.
- No hagas tareas ni des respuestas para copiar.
- Responde en español.
- Usa los datos académicos proporcionados.
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
