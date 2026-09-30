import { aiConfigured } from '../lib/ai.js';

export default function handler(req, res) {
  res.status(200).json({ ok: true, aiConfigured });
}
