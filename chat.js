import { aiConfigured, openAI, outputText } from '../../lib/ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const { message = '', tasks = [], exams = [] } = req.body || {};
    if (!message.trim()) return res.status(400).json({ error: 'Mensaje vacío' });
    if (!aiConfigured) {
      const pending = tasks.filter(t => t.status !== 'completed').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      return res.status(200).json({
        answer: pending ? `Con tus datos actuales, empezaría por «${pending.title}», porque su fecha de entrega es ${pending.dueDate}. Si me dices cuánto tiempo tienes hoy, puedo ayudarte a repartirlo por bloques.` : 'Primero añade tus tareas y exámenes; así podré ayudarte a priorizarlos.',
        mode: 'demo'
      });
    }
    const data = await openAI(JSON.stringify({ studentQuestion: message, tasks, exams }),
      'Eres un orientador de estudio para estudiantes de Bachillerato. Ayuda a organizar el tiempo y priorizar. No hagas tareas ni des respuestas para copiar. Responde en español y usa los datos académicos suministrados. Si faltan datos, dilo claramente.',
      null);
    return res.status(200).json({ answer: outputText(data), mode: 'ai' });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
