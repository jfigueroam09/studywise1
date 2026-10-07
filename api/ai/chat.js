import { aiConfigured, gemini, outputText } from '../../ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  try {
    const { message = '', tasks = [], exams = [] } = req.body || {};
    const cleanMessage = String(message).trim();

    if (!cleanMessage) {
      return res.status(400).json({ error: 'Missatge buit.' });
    }

    if (!aiConfigured) {
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
- Utilitza les dades reals de tasques i exàmens que repàs a continuació.
- Si una dada no existeix, digues-ho clarament.
- Sigues concret i útil; evita frases buides.

PREGUNTA DE L'ESTUDIANT:
${cleanMessage}

TASQUES:
${JSON.stringify(Array.isArray(tasks) ? tasks : [], null, 2)}

EXÀMENS:
${JSON.stringify(Array.isArray(exams) ? exams : [], null, 2)}`
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
