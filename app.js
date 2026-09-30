from pathlib import Path

app_js = r"""const KEY = 'tria';

const defaultState = {
  tasks: [],
  exams: [],
  plan: null,
  chat: [],
  settings: {
    aiEnabled: true
  }
};

let state = loadState();
let currentPage = 'dashboard';
let modalMode = null;
let editingId = null;

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...JSON.parse(raw)
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('ca-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

function daysUntil(value) {
  if (!value) return 999;
  const target = new Date(`${value}T23:59:59`);
  return Math.ceil((target - Date.now()) / 86400000);
}

function statusLabel(status) {
  return {
    pending: 'Pendent',
    inprogress: 'En curs',
    completed: 'Completada'
  }[status] || 'Pendent';
}

function difficultyLabel(value) {
  return {
    1: 'Baixa',
    2: 'Baixa',
    3: 'Mitjana',
    4: 'Alta',
    5: 'Alta'
  }[Number(value)] || 'Mitjana';
}

function icon(name, size = 18) {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    tasks: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    exams: '<path d="M4 4h16v16H4z"/><path d="M8 2v4M16 2v4M8 11h8M8 15h5"/>',
    planner: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.8 9.8 0 0 1-4-.8L3 21l1.8-4A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"/>',
    progress: '<path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1A1.7 1.7 0 0 0 7.2 15a1.7 1.7 0 0 0-1.5-1H5v-3h.7a1.7 1.7 0 0 0 1.5-1A1.7 1.7 0 0 0 7 8.1l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h3v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.7v3h-.7a1.7 1.7 0 0 0-1.5 1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    sparkles: '<path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2Z"/><path d="m19 16-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6Z"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    refresh: '<path d="M20 11a8.1 8.1 0 0 0-14.7-4L3 10"/><path d="M3 4v6h6"/><path d="M4 13a8.1 8.1 0 0 0 14.7 4L21 14"/><path d="M21 20v-6h-6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'
  };

  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkles}</svg>`;
}

function navItems() {
  return [
    ['dashboard', 'Tauler', 'dashboard'],
    ['tasks', 'Tasques', 'tasks'],
    ['exams', 'Exàmens', 'exams'],
    ['planner', 'Planificador', 'planner'],
    ['chat', "IA d'estudi", 'chat'],
    ['progress', 'Progrés', 'progress'],
    ['settings', 'Avaluació', 'settings']
  ];
}

function pageTitle() {
  return navItems().find(item => item[0] === currentPage)?.[1] || 'Tauler';
}

function layout() {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">${icon('sparkles', 22)}</div>
          <div class="brand-copy">
            <strong>TRIA</strong>
            <span>Fet per Freddy Figueroa</span>
          </div>
          <img class="school-logo" src="/logo-institut.png" alt="Logo de l'institut">
        </div>

        <nav class="nav">
          ${navItems().map(([id, label, ico]) => `
            <button class="nav-item ${currentPage === id ? 'active' : ''}" data-page="${id}">
              ${icon(ico)}
              <span>${label}</span>
            </button>
          `).join('')}
        </nav>

        <div class="sidebar-bottom">
          <div class="ai-status">
            <span class="status-dot"></span>
            <div>
              <strong>IA preparada</strong>
              <small>Gemini connectat</small>
            </div>
          </div>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <p class="eyebrow">Organització acadèmica</p>
            <h1>${pageTitle()}</h1>
          </div>
          <div class="top-actions">
            ${currentPage === 'tasks' ? `<button class="btn primary" data-action="new-task">${icon('plus', 17)} Nova tasca</button>` : ''}
            ${currentPage === 'exams' ? `<button class="btn primary" data-action="new-exam">${icon('plus', 17)} Nou examen</button>` : ''}
          </div>
        </header>

        <section id="content"></section>
      </main>

      ${buildModalHtml()}
    </div>
  `;
}

function buildModalHtml() {
  return `
    <div id="modal" class="modal-backdrop hidden">
      <div class="modal">
        <div class="modal-head">
          <div>
            <p class="eyebrow" id="modal-eyebrow">TRIA</p>
            <h2 id="modal-title">Nova tasca</h2>
          </div>
          <button class="icon-btn" data-action="close-modal" aria-label="Tancar">${icon('close')}</button>
        </div>
        <form id="modal-form"></form>
      </div>
    </div>
  `;
}

function statCard(label, value, note, ico) {
  return `
    <div class="stat-card">
      <div class="stat-icon">${icon(ico, 20)}</div>
      <div>
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${note}</small>
      </div>
    </div>
  `;
}

function taskCard(task) {
  const days = daysUntil(task.dueDate);
  const urgent = task.status !== 'completed' && days <= 2;

  return `
    <article class="task-card">
      <div class="task-main">
        <div class="task-check ${task.status === 'completed' ? 'done' : ''}" data-action="toggle-task" data-id="${task.id}">
          ${task.status === 'completed' ? icon('check', 16) : ''}
        </div>
        <div class="task-info">
          <div class="task-title-row">
            <h3>${esc(task.title)}</h3>
            <span class="badge">${esc(task.subject || 'General')}</span>
          </div>
          <p>${esc(task.description || 'Sense descripció')}</p>
          <div class="task-meta">
            <span>${icon('calendar', 14)} ${formatDate(task.dueDate)}</span>
            <span>${icon('clock', 14)} ${Number(task.minutes || 30)} min</span>
            <span>Dificultat: ${difficultyLabel(task.difficulty)}</span>
            ${urgent ? '<span class="danger-text">Urgent</span>' : ''}
          </div>
        </div>
      </div>
      <div class="task-actions">
        <span class="status ${task.status}">${statusLabel(task.status)}</span>
        <button class="icon-btn" data-action="edit-task" data-id="${task.id}" title="Editar">${icon('edit', 16)}</button>
        <button class="icon-btn danger" data-action="delete-task" data-id="${task.id}" title="Eliminar">${icon('trash', 16)}</button>
      </div>
    </article>
  `;
}

function dashboardView() {
  const pending = state.tasks.filter(t => t.status !== 'completed');
  const completed = state.tasks.filter(t => t.status === 'completed');
  const urgent = pending.filter(t => daysUntil(t.dueDate) <= 2).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const upcomingExams = [...state.exams].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const totalMinutes = state.tasks.reduce((sum, t) => sum + Number(t.minutes || 0), 0);
  const completedMinutes = completed.reduce((sum, t) => sum + Number(t.minutes || 0), 0);
  const percent = state.tasks.length ? Math.round((completed.length / state.tasks.length) * 100) : 0;

  return `
    <div class="page">
      <div class="hero">
        <div>
          <p class="eyebrow">Bon dia</p>
          <h2>Organitza el teu estudi amb TRIA.</h2>
          <p>Consulta les tasques, prepara els exàmens i deixa que la IA t'ajudi a ordenar les prioritats.</p>
        </div>
        <button class="btn primary" data-action="recalculate">${icon('sparkles', 17)} Recalcular amb IA</button>
      </div>

      <div class="stats-grid">
        ${statCard('Tasques pendents', pending.length, `${completed.length} completades`, 'tasks')}
        ${statCard('Exàmens propers', upcomingExams.length, 'Següents dates', 'exams')}
        ${statCard('Progrés', `${percent}%`, `${completedMinutes} / ${totalMinutes || 0} min`, 'progress')}
        ${statCard('Urgents', urgent.length, 'En els pròxims 2 dies', 'clock')}
      </div>

      <div class="two-col">
        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Prioritats</p>
              <h2>Què hauries de fer ara?</h2>
            </div>
            <button class="text-btn" data-page="tasks">Veure tasques ${icon('arrow', 15)}</button>
          </div>

          <div class="list">
            ${(urgent.length ? urgent.slice(0, 4) : pending.slice(0, 4)).map(taskCard).join('') ||
              `<div class="empty">No tens tasques pendents. Afegeix-ne una per començar.</div>`}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Calendari acadèmic</p>
              <h2>Pròxims exàmens</h2>
            </div>
            <button class="text-btn" data-page="exams">Veure exàmens ${icon('arrow', 15)}</button>
          </div>
          <div class="exam-list">
            ${upcomingExams.map(exam => `
              <div class="exam-row">
                <div class="date-box">
                  <strong>${new Date(`${exam.date}T12:00:00`).getDate()}</strong>
                  <span>${new Intl.DateTimeFormat('ca-ES', {month: 'short'}).format(new Date(`${exam.date}T12:00:00`))}</span>
                </div>
                <div>
                  <strong>${esc(exam.subject)}</strong>
                  <span>${esc(exam.syllabus || 'Sense temari')}</span>
                </div>
                <span class="badge">${difficultyLabel(exam.difficulty)}</span>
              </div>
            `).join('') || `<div class="empty">No hi ha exàmens registrats.</div>`}
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Pla actual</p>
            <h2>${state.plan?.summary ? 'Recomanació de la IA' : 'Encara no tens un pla generat'}</h2>
          </div>
          <button class="btn secondary" data-action="recalculate">${icon('refresh', 16)} Recalcular</button>
        </div>
        <p class="plan-summary">${esc(state.plan?.summary || 'Afegeix tasques i exàmens i prem «Recalcular amb IA» per generar una proposta.')}</p>
      </section>
    </div>
  `;
}

function tasksView() {
  const tasks = [...state.tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return `
    <div class="page">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Gestió</p>
          <h2>Totes les tasques</h2>
        </div>
        <button class="btn primary" data-action="new-task">${icon('plus', 17)} Nova tasca</button>
      </div>
      <div class="task-list">
        ${tasks.map(taskCard).join('') || `<div class="empty large">Encara no tens tasques. Crea la primera amb el botó «Nova tasca».</div>`}
      </div>
    </div>
  `;
}

function examsView() {
  const exams = [...state.exams].sort((a, b) => a.date.localeCompare(b.date));
  return `
    <div class="page">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Calendari</p>
          <h2>Exàmens</h2>
        </div>
        <button class="btn primary" data-action="new-exam">${icon('plus', 17)} Nou examen</button>
      </div>
      <div class="exam-grid">
        ${exams.map(exam => `
          <article class="exam-card">
            <div class="exam-card-top">
              <span class="badge">${esc(exam.subject)}</span>
              <span class="status pending">${formatDate(exam.date)}</span>
            </div>
            <h3>${esc(exam.subject)}</h3>
            <p>${esc(exam.syllabus || 'Sense temari definit.')}</p>
            <div class="exam-details">
              <span>Dificultat: ${difficultyLabel(exam.difficulty)}</span>
              <span>Temps disponible: ${Number(exam.availableMinutes || 0)} min</span>
            </div>
            <div class="card-actions">
              <button class="btn secondary" data-action="edit-exam" data-id="${exam.id}">${icon('edit', 15)} Editar</button>
              <button class="btn ghost danger-btn" data-action="delete-exam" data-id="${exam.id}">${icon('trash', 15)} Eliminar</button>
            </div>
          </article>
        `).join('') || `<div class="empty large">No hi ha exàmens registrats.</div>`}
      </div>
    </div>
  `;
}

function plannerView() {
  const days = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    days.push({ date: iso, label: new Intl.DateTimeFormat('ca-ES', { weekday: 'short' }).format(d), day: d.getDate() });
  }

  return `
    <div class="page">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Setmana</p>
          <h2>Planificador</h2>
        </div>
        <button class="btn primary" data-action="recalculate">${icon('sparkles', 17)} Generar pla amb IA</button>
      </div>

      <div class="planner">
        ${days.map(day => {
          const dayTasks = state.tasks.filter(t => t.dueDate === day.date && t.status !== 'completed');
          const sessions = state.plan?.sessions?.filter(s => {
            const base = new Date();
            base.setHours(12, 0, 0, 0);
            base.setDate(base.getDate() + Number(s.dayOffset || 0));
            const iso = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
            return iso === day.date;
          }) || [];

          return `
            <div class="day-column">
              <div class="day-head">
                <span>${day.label}</span>
                <strong>${day.day}</strong>
              </div>
              <div class="day-body">
                ${dayTasks.map(t => `<div class="calendar-item task-item"><strong>${esc(t.title)}</strong><small>${esc(t.subject)}</small></div>`).join('')}
                ${sessions.map(s => {
                  const task = state.tasks.find(t => t.id === s.taskId);
                  return `<div class="calendar-item ai-item"><span>${icon('sparkles', 13)}</span><strong>${esc(task?.title || 'Sessió')}</strong><small>${s.minutes} min</small></div>`;
                }).join('')}
                ${!dayTasks.length && !sessions.length ? '<span class="day-empty">Lliure</span>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function chatView() {
  return `
    <div class="page chat-page">
      <section class="chat-panel">
        <div class="chat-head">
          <div class="assistant-avatar">${icon('sparkles', 20)}</div>
          <div>
            <p class="eyebrow">Assistent</p>
            <h2>IA d'estudi</h2>
            <span>Pot consultar les teves tasques i exàmens per ajudar-te a organitzar-te.</span>
          </div>
        </div>

        <div id="chat-messages" class="chat-messages">
          ${state.chat.length ? state.chat.map(m => `
            <div class="message ${m.role}">
              <div class="message-bubble">${esc(m.text).replaceAll('\n', '<br>')}</div>
            </div>
          `).join('') : `
            <div class="chat-empty">
              <div class="assistant-avatar">${icon('sparkles', 22)}</div>
              <h3>Com et puc ajudar?</h3>
              <p>Pregunta'm com prioritzar les tasques, quan estudiar o com preparar els pròxims exàmens.</p>
            </div>
          `}
        </div>

        <form id="chat-form" class="chat-form">
          <input id="chat-input" type="text" autocomplete="off" placeholder="Escriu la teva pregunta..." required>
          <button class="btn primary" type="submit">${icon('arrow', 17)}</button>
        </form>
      </section>
    </div>
  `;
}

function progressView() {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.status === 'completed').length;
  const planned = state.tasks.reduce((sum, t) => sum + Number(t.minutes || 0), 0);
  const completed = state.tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + Number(t.minutes || 0), 0);
  const percent = total ? Math.round((done / total) * 100) : 0;

  return `
    <div class="page">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Seguiment</p>
          <h2>Progrés</h2>
        </div>
        <button class="btn secondary" data-action="export">${icon('download', 16)} Exportar dades</button>
      </div>

      <div class="progress-grid">
        ${statCard('Tasques completades', `${done}/${total}`, `${percent}% del total`, 'check')}
        ${statCard('Minuts planificats', planned, 'Temps estimat de les tasques', 'clock')}
        ${statCard('Minuts completats', completed, 'Temps de tasques finalitzades', 'progress')}
      </div>

      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Resum</p>
            <h2>Activitat acadèmica</h2>
          </div>
        </div>
        <div class="progress-bar"><span style="width:${percent}%"></span></div>
        <p class="muted">${percent}% de les tasques registrades estan completades.</p>
      </section>
    </div>
  `;
}

function settingsView() {
  return `
    <div class="page">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Projecte TdR</p>
          <h2>Avaluació</h2>
        </div>
      </div>

      <div class="settings-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Registre</p>
              <h2>Dades de l'aplicació</h2>
            </div>
          </div>
          <p>TRIA guarda localment les tasques, els exàmens, els plans generats i les converses d'estudi.</p>
          <div class="setting-row"><span>Tasques registrades</span><strong>${state.tasks.length}</strong></div>
          <div class="setting-row"><span>Exàmens registrats</span><strong>${state.exams.length}</strong></div>
          <div class="setting-row"><span>Missatges d'IA</span><strong>${state.chat.length}</strong></div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Manteniment</p>
              <h2>Control de dades</h2>
            </div>
          </div>
          <div class="button-stack">
            <button class="btn secondary" data-action="export">${icon('download', 16)} Exportar dades JSON</button>
            <button class="btn danger-solid" data-action="reset">${icon('trash', 16)} Restablir dades</button>
          </div>
        </section>
      </div>
    </div>
  `;
}

function render() {
  const root = document.querySelector('#root');
  if (!root) return;

  root.innerHTML = layout();

  const content = document.querySelector('#content');
  const views = {
    dashboard: dashboardView,
    tasks: tasksView,
    exams: examsView,
    planner: plannerView,
    chat: chatView,
    progress: progressView,
    settings: settingsView
  };

  content.innerHTML = (views[currentPage] || dashboardView)();
  bindEvents();

  if (currentPage === 'chat') {
    const box = document.querySelector('#chat-messages');
    if (box) box.scrollTop = box.scrollHeight;
  }
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      currentPage = button.dataset.page;
      render();
    });
  });

  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', handleAction);
  });

  const chatForm = document.querySelector('#chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', sendChat);
  }
}

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;

  if (action === 'new-task') openTaskModal();
  if (action === 'edit-task') openTaskModal(id);
  if (action === 'delete-task') deleteTask(id);
  if (action === 'toggle-task') toggleTask(id);
  if (action === 'new-exam') openExamModal();
  if (action === 'edit-exam') openExamModal(id);
  if (action === 'delete-exam') deleteExam(id);
  if (action === 'close-modal') closeModal();
  if (action === 'recalculate') await generatePlan();
  if (action === 'export') exportData();
  if (action === 'reset') resetData();
}

function openTaskModal(id = null) {
  modalMode = 'task';
  editingId = id;
  const task = id ? state.tasks.find(t => t.id === id) : null;
  const modal = document.querySelector('#modal');
  const form = document.querySelector('#modal-form');

  document.querySelector('#modal-eyebrow').textContent = 'TASQUES';
  document.querySelector('#modal-title').textContent = task ? 'Editar tasca' : 'Nova tasca';

  form.innerHTML = `
    <div class="form-grid">
      <label>Títol
        <input name="title" required value="${esc(task?.title || '')}" placeholder="Ex. Preparar presentació">
      </label>
      <label>Assignatura
        <input name="subject" value="${esc(task?.subject || '')}" placeholder="Ex. Història">
      </label>
      <label class="full">Descripció
        <textarea name="description" rows="3" placeholder="Què has de fer?">${esc(task?.description || '')}</textarea>
      </label>
      <label>Data límit
        <input name="dueDate" type="date" required value="${task?.dueDate || todayISO()}">
      </label>
      <label>Temps estimat (min)
        <input name="minutes" type="number" min="5" step="5" value="${Number(task?.minutes || 30)}">
      </label>
      <label>Dificultat
        <select name="difficulty">
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${Number(task?.difficulty || 3) === n ? 'selected' : ''}>${n} · ${difficultyLabel(n)}</option>`).join('')}
        </select>
      </label>
      <label>Estat
        <select name="status">
          ${['pending','inprogress','completed'].map(s => `<option value="${s}" ${task?.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn secondary" data-action="close-modal">Cancel·lar</button>
      <button type="submit" class="btn primary">Guardar tasca</button>
    </div>
  `;

  form.onsubmit = saveTaskFromForm;
  modal.classList.remove('hidden');
}

function saveTaskFromForm(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const item = {
    id: editingId || uid('task'),
    title: data.get('title').trim(),
    subject: data.get('subject').trim() || 'General',
    description: data.get('description').trim(),
    dueDate: data.get('dueDate'),
    minutes: Number(data.get('minutes')) || 30,
    difficulty: Number(data.get('difficulty')) || 3,
    status: data.get('status') || 'pending'
  };

  if (editingId) {
    state.tasks = state.tasks.map(t => t.id === editingId ? item : t);
  } else {
    state.tasks.push(item);
  }

  saveState();
  closeModal();
  render();
}

function deleteTask(id) {
  if (!confirm('Vols eliminar aquesta tasca?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  render();
}

function toggleTask(id) {
  state.tasks = state.tasks.map(t => {
    if (t.id !== id) return t;
    return {
      ...t,
      status: t.status === 'completed' ? 'pending' : 'completed'
    };
  });
  saveState();
  render();
}

function openExamModal(id = null) {
  modalMode = 'exam';
  editingId = id;
  const exam = id ? state.exams.find(e => e.id === id) : null;
  const modal = document.querySelector('#modal');
  const form = document.querySelector('#modal-form');

  document.querySelector('#modal-eyebrow').textContent = 'EXÀMENS';
  document.querySelector('#modal-title').textContent = exam ? 'Editar examen' : 'Nou examen';

  form.innerHTML = `
    <div class="form-grid">
      <label>Assignatura
        <input name="subject" required value="${esc(exam?.subject || '')}" placeholder="Ex. Matemàtiques">
      </label>
      <label>Data
        <input name="date" type="date" required value="${exam?.date || todayISO()}">
      </label>
      <label class="full">Temari
        <textarea name="syllabus" rows="3" placeholder="Temes que entren a l'examen">${esc(exam?.syllabus || '')}</textarea>
      </label>
      <label>Dificultat
        <select name="difficulty">
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${Number(exam?.difficulty || 3) === n ? 'selected' : ''}>${n} · ${difficultyLabel(n)}</option>`).join('')}
        </select>
      </label>
      <label>Temps disponible (min)
        <input name="availableMinutes" type="number" min="0" step="15" value="${Number(exam?.availableMinutes || 120)}">
      </label>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn secondary" data-action="close-modal">Cancel·lar</button>
      <button type="submit" class="btn primary">Guardar examen</button>
    </div>
  `;

  form.onsubmit = saveExamFromForm;
  modal.classList.remove('hidden');
}

function saveExamFromForm(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const item = {
    id: editingId || uid('exam'),
    subject: data.get('subject').trim(),
    date: data.get('date'),
    syllabus: data.get('syllabus').trim(),
    difficulty: Number(data.get('difficulty')) || 3,
    availableMinutes: Number(data.get('availableMinutes')) || 0
  };

  if (editingId) {
    state.exams = state.exams.map(e => e.id === editingId ? item : e);
  } else {
    state.exams.push(item);
  }

  saveState();
  closeModal();
  render();
}

function deleteExam(id) {
  if (!confirm('Vols eliminar aquest examen?')) return;
  state.exams = state.exams.filter(e => e.id !== id);
  saveState();
  render();
}

function closeModal() {
  const modal = document.querySelector('#modal');
  if (modal) modal.classList.add('hidden');
  modalMode = null;
  editingId = null;
}

async function generatePlan() {
  const buttons = [...document.querySelectorAll('[data-action="recalculate"]')];
  buttons.forEach(b => {
    b.disabled = true;
    b.innerHTML = `${icon('refresh', 16)} Calculant...`;
  });

  try {
    const response = await fetch('/api/ai/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: state.tasks,
        exams: state.exams
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No s’ha pogut generar el pla.');

    state.plan = data;
    saveState();
    alert('Pla actualitzat correctament.');
    render();
  } catch (error) {
    alert(`No s’ha pogut generar el pla: ${error.message}`);
    buttons.forEach(b => {
      b.disabled = false;
      b.innerHTML = `${icon('sparkles', 17)} Recalcular amb IA`;
    });
  }
}

async function sendChat(event) {
  event.preventDefault();

  const input = document.querySelector('#chat-input');
  const message = input.value.trim();
  if (!message) return;

  state.chat.push({ role: 'user', text: message });
  input.value = '';
  saveState();
  render();

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        tasks: state.tasks,
        exams: state.exams
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error de la IA.');

    state.chat.push({
      role: 'assistant',
      text: data.answer || 'No he rebut cap resposta.'
    });
  } catch (error) {
    state.chat.push({
      role: 'assistant',
      text: `No he pogut connectar amb la IA: ${error.message}`
    });
  }

  saveState();
  render();
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'TRIA',
    tasks: state.tasks,
    exams: state.exams,
    plan: state.plan,
    chat: state.chat
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tria-dades-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  if (!confirm('Això eliminarà totes les dades guardades en aquest navegador. Vols continuar?')) return;
  state = structuredClone(defaultState);
  saveState();
  currentPage = 'dashboard';
  render();
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
});

document.addEventListener('click', event => {
  if (event.target?.id === 'modal') closeModal();
});

render();
"""

path = Path("/mnt/data/app.js")
path.write_text(app_js, encoding="utf-8")
print(f"Creat: {path}")
print(f"Línies: {len(app_js.splitlines())}")
