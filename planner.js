function isoDay(d) {
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}

export function balancedPlan(state, preferences, now = new Date()) {

  const today = isoDay(now);
  const clock = now.getHours() * 60 + now.getMinutes() + 1;
  const minutes = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const format = n => [Math.floor(n / 60), n % 60].map(x => String(x).padStart(2, '0')).join(':');
  const past = (state.plan?.sessions || []).filter(s => s.date < today ||
    (s.date === today && s.startTime && minutes(s.startTime) < clock));
  const sessions = past.slice();
  const days = new Map();
  const unmet = [];
  const targets = [
    ...state.tasks.filter(t => t.status !== 'completed').map(t => ({item:t, kind:'task', due:t.dueDate, budget:t.estimatedMinutes})),
    ...state.exams.map(t => ({item:t, kind:'exam', due:t.date, budget:t.studyMinutes ?? t.availableMinutes}))
  ].filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t.due) && t.due >= today && Number.isFinite(Number(t.budget)) && t.budget > 0).sort((a,b) => a.due.localeCompare(b.due));

  function getDay(date) {
    const key = isoDay(date);
    if (days.has(key)) return days.get(key);
    const weekday = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];
    const busy = state.scheduleEvents.filter(e => e.date ? e.date === key : e.day?.toLowerCase() === weekday)
      .filter(e => e.startTime).map(e => [minutes(e.startTime), e.endTime ? minutes(e.endTime) : minutes(e.startTime)+60]);
    const earlier = past.filter(s => s.date === key);
    for (const s of earlier) busy.push([minutes(s.startTime), minutes(s.startTime) + Number(s.minutes)]);
    let start = Math.max(15*60, key === today ? clock : 0);
    const gaps = [];
    for (const [from,to] of busy.sort((a,b)=>a[0]-b[0])) {
      if (from > start && start < 22*60) gaps.push([start, Math.min(from,22*60)]);
      start = Math.max(start,to);
    }
    if (start < 22*60) gaps.push([start,22*60]);
    const day = {key,gaps,used:earlier.reduce((n,s)=>n+Number(s.minutes),0)};
    days.set(key,day);
    return day;
  }

  for (const {item,kind,due,budget} of targets) {
    const spent = past.filter(s=>s.targetType===kind && String(s.targetId)===String(item.id)).reduce((n,s)=>n+Number(s.minutes),0);
    let left = Math.max(0,Math.round(budget-spent));
    const options = [];
    for (const d=new Date(now); isoDay(d)<due; d.setDate(d.getDate()+1)) {
      if (preferences.unavailableDays.includes(d.getDay())) continue;
      const day = getDay(d);
      const capacity = Math.min(preferences.maxDailyMinutes-day.used, day.gaps.reduce((n,[a,b])=>n+b-a,0));
      if (capacity>0) options.push({day,capacity,assigned:0});
    }
    // Share the budget equally; redistribute a full day's share over the remaining days.
    let active = options;
    while (left && active.length) {
      const share = Math.max(1,Math.floor(left/active.length));
      for (const o of active) {
        const add = Math.min(left,share,o.capacity-o.assigned);
        o.assigned += add; left -= add;
      }
      active = active.filter(o=>o.assigned<o.capacity);
    }
    for (const {day,assigned} of options) {
      let amount = assigned;
      day.used += amount;
      for (const gap of day.gaps) {
        const count = Math.min(amount,gap[1]-gap[0]);
        if (!count) continue;
        sessions.push({date:day.key,startTime:format(gap[0]),minutes:count,title:item.title || item.subject,targetType:kind,targetId:String(item.id)});
        gap[0]+=count; amount-=count;
      }
    }
    if (left) unmet.push((item.title || item.subject) + ': ' + left + ' min pendents');
  }
  sessions.sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
  return {preferences,sessions,summary:unmet.length ? 'Temps que no cap abans del termini: '+unmet.join(' · ') : 'Estudi repartit entre els dies disponibles abans de cada termini.'};
}

