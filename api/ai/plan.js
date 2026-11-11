import { balancedPlan } from '../../planner.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Mètode no permès'});
  const { tasks = [], exams = [], scheduleEvents = [], preferences = {} } = req.body || {};
  if (![tasks, exams, scheduleEvents].every(list => Array.isArray(list) && list.every(item => item && typeof item === 'object'))) {
    return res.status(400).json({error:'Dades del pla no vàlides.'});
  }
  const settings = {
    maxDailyMinutes: Math.max(30, Math.min(720, Number(preferences?.maxDailyMinutes) || 240)),
    unavailableDays: Array.isArray(preferences?.unavailableDays) ? preferences.unavailableDays.map(Number) : []
  };
  const now = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(preferences?.today)) {
    const date = new Date(preferences.today + 'T00:00:00');
    if (!Number.isNaN(date.getTime())) date.setHours(now.getHours(),now.getMinutes()), now.setTime(date.getTime());
  }
  const { summary, sessions } = balancedPlan({tasks, exams, scheduleEvents}, settings, now);
  return res.status(200).json({summary, sessions});
}
