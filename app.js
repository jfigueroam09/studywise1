import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* =========================================================
   TRIA · CONFIGURACIÓ
   ========================================================= */

const SUPABASE_URL =
  'https://tzyslkglsywfiwuhtgrj.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_2SIxbdP7otKw74QV4s4J5g_K39-PjkG';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   ESTAT LOCAL
   ========================================================= */

const KEY = 'tria';

const defaultState = {
  tasks: [],
  exams: [],
  scheduleEvents: [],
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

let currentUser = null;

let authReady = false;

let authMode = 'login';


/* =========================================================
   AUTENTICACIÓ
   ========================================================= */

function loadState() {

  try {

    const raw =
      localStorage.getItem(KEY);

    if (!raw) {
      return structuredClone(
        defaultState
      );
    }

    return {
      ...structuredClone(
        defaultState
      ),
      ...JSON.parse(raw)
    };

  } catch {

    return structuredClone(
      defaultState
    );

  }
}


function saveState() {

  localStorage.setItem(
    KEY,
    JSON.stringify(state)
  );

}


async function initAuth() {

  const {
    data
  } =
    await supabase.auth.getSession();

  currentUser =
    data?.session?.user || null;

  authReady = true;

  render();

  supabase.auth.onAuthStateChange(
    (_event, session) => {

      currentUser =
        session?.user || null;

      authReady = true;

      render();

    }
  );

}


async function handleAuth(event) {

  event.preventDefault();

  const email =
    document
      .querySelector('#auth-email')
      .value
      .trim();

  const password =
    document
      .querySelector('#auth-password')
      .value;

  const errorBox =
    document.querySelector(
      '#auth-error'
    );

  const successBox =
    document.querySelector(
      '#auth-success'
    );

  const button =
    document.querySelector(
      '.auth-submit'
    );

  errorBox.classList.add(
    'hidden'
  );

  successBox.classList.add(
    'hidden'
  );

  button.disabled = true;

  button.textContent =
    authMode === 'login'
      ? 'Iniciant sessió...'
      : 'Creant compte...';

  try {

    if (
      authMode === 'login'
    ) {

      const {
        error
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {
        throw error;
      }

    } else {

      const {
        data,
        error
      } =
        await supabase.auth
          .signUp({
            email,
            password
          });

      if (error) {
        throw error;
      }

      if (!data.session) {

        successBox.textContent =
          'Compte creat. Revisa el teu correu per confirmar l’adreça abans d’iniciar sessió.';

        successBox.classList.remove(
          'hidden'
        );

        button.disabled = false;

        button.textContent =
          'Crear compte';

        return;
      }

    }

  } catch (error) {

    errorBox.textContent =
      authErrorMessage(error);

    errorBox.classList.remove(
      'hidden'
    );

  }

  button.disabled = false;

  button.textContent =
    authMode === 'login'
      ? 'Iniciar sessió'
      : 'Crear compte';

}


function authErrorMessage(error) {

  const message =
    String(
      error?.message || ''
    );

  const lower =
    message.toLowerCase();

  if (
    lower.includes(
      'invalid login credentials'
    )
  ) {
    return 'El correu o la contrasenya no són correctes.';
  }

  if (
    lower.includes(
      'email not confirmed'
    )
  ) {
    return 'Primer has de confirmar el teu correu electrònic.';
  }

  if (
    lower.includes(
      'user already registered'
    )
  ) {
    return 'Aquest correu ja té un compte.';
  }

  if (
    lower.includes(
      'password should be at least'
    )
  ) {
    return 'La contrasenya ha de tenir almenys 6 caràcters.';
  }

  return (
    message ||
    'No s’ha pogut completar l’operació.'
  );

}


function toggleAuthMode() {

  authMode =
    authMode === 'login'
      ? 'signup'
      : 'login';

  render();

}


async function logout() {

  await supabase.auth.signOut();

  currentUser = null;

  state =
    structuredClone(
      defaultState
    );

  currentPage =
    'dashboard';

  render();

}


/* =========================================================
   UTILITATS
   ========================================================= */

function uid(prefix = 'id') {

  return (
    `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
  );

}


function esc(value = '') {

  return String(value)
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );

}


function todayISO() {

  const d =
    new Date();

  const offset =
    d.getTimezoneOffset();

  return new Date(
    d.getTime() -
    offset * 60000
  )
    .toISOString()
    .slice(0, 10);

}


function formatDate(value) {

  if (!value) {
    return '—';
  }

  const d =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'ca-ES',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  ).format(d);

}


function daysUntil(value) {

  if (!value) {
    return 999;
  }

  const target =
    new Date(
      `${value}T23:59:59`
    );

  return Math.ceil(
    (target - Date.now()) /
    86400000
  );

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
  }[Number(value)] ||
  'Mitjana';

}


function chatMarkdown(text) {

  let html =
    esc(text || '');

  html =
    html
      .replace(
        /^### (.+)$/gm,
        '<h3>$1</h3>'
      )
      .replace(
        /^## (.+)$/gm,
        '<h2>$1</h2>'
      )
      .replace(
        /^# (.+)$/gm,
        '<h2>$1</h2>'
      )
      .replace(
        /\*\*(.+?)\*\*/g,
        '<strong>$1</strong>'
      )
      .replace(
        /\*(.+?)\*/g,
        '<em>$1</em>'
      )
      .replace(
        /^\s*[-•] (.+)$/gm,
        '<li>$1</li>'
      )
      .replace(
        /^\s*(\d+)\.\s+(.+)$/gm,
        '<li>$2</li>'
      )
      .replace(
        /\n/g,
        '<br>'
      );

  html =
    html.replace(
      /(<li>.*?<\/li>)(?:<br>|$)/g,
      '$1'
    );

  return html;

}


/* =========================================================
   ICONES
   ========================================================= */

function icon(
  name,
  size = 18
) {

  const paths = {

    dashboard:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',

    tasks:
      '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',

    exams:
      '<path d="M4 4h16v16H4z"/><path d="M8 2v4M16 2v4M8 11h8M8 15h5"/>',

    planner:
      '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/>',

    schedule:
      '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/><path d="M8 13h2M14 13h2M8 17h2M14 17h2"/>',

    chat:
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.8 9.8 0 0 1-4-.8L3 21l1.8-4A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"/>',

    progress:
      '<path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/>',

    settings:
      '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1A1.7 1.7 0 0 0 7.2 15a1.7 1.7 0 0 0-1.5-1H5v-3h.7a1.7 1.7 0 0 0 1.5-1A1.7 1.7 0 0 0 7 8.1l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h3v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.7v3h-.7a1.7 1.7 0 0 0-1.5 1Z"/>',

    plus:
      '<path d="M12 5v14M5 12h14"/>',

    edit:
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',

    trash:
      '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>',

    check:
      '<path d="M5 12l4 4L19 6"/>',

    close:
      '<path d="M6 6l12 12M18 6L6 18"/>',

    calendar:
      '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/>',

    clock:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',

    sparkles:
      '<path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2Z"/><path d="m19 14-.6 2.4L16 17l2.4.6L19 20l.6-2.4L22 17l-2.4-.6Z"/>',

    refresh:
      '<path d="M20 11a8 8 0 0 0-14.9-4L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.9 4L21 15"/><path d="M21 20v-5h-5"/>',

    arrow:
      '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'

  };

  return `
    <svg
      class="icon"
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${paths[name] || ''}
    </svg>
  `;

}


/* =========================================================
   AUTENTICACIÓ · VISTA
   ========================================================= */

function authView() {

  return `
    <div class="auth-screen">

      <div class="auth-card">

        <div class="auth-brand">

          <div class="brand-mark">
            ${icon('sparkles', 24)}
          </div>

          <div>
            <strong>TRIA</strong>
            <span>Fet per Freddy Figueroa</span>
          </div>

        </div>

        <div class="auth-copy">

          <p class="eyebrow">
            ${authMode === 'login'
              ? 'Benvingut'
              : 'Nou compte'}
          </p>

          <h1>
            ${
              authMode === 'login'
                ? 'Inicia sessió'
                : 'Crea el teu compte'
            }
          </h1>

          <p>
            Organitza el teu estudi,
            prepara els exàmens i deixa
            que TRIA t'ajudi amb les
            prioritats.
          </p>

        </div>

        <form
          id="auth-form"
          class="auth-form"
        >

          <label>
            Correu electrònic

            <input
              id="auth-email"
              type="email"
              required
              autocomplete="email"
              placeholder="tu@exemple.com"
            >
          </label>

          <label>
            Contrasenya

            <input
              id="auth-password"
              type="password"
              required
              minlength="6"
              autocomplete="${
                authMode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }"
              placeholder="••••••••"
            >
          </label>

          <div
            id="auth-error"
            class="auth-message error hidden"
          ></div>

          <div
            id="auth-success"
            class="auth-message success hidden"
          ></div>

          <button
            type="submit"
            class="btn primary auth-submit"
          >
            ${
              authMode === 'login'
                ? 'Iniciar sessió'
                : 'Crear compte'
            }
          </button>

        </form>

        <button
          type="button"
          class="auth-switch"
          data-action="toggle-auth"
        >
          ${
            authMode === 'login'
              ? 'Crear compte'
              : 'Iniciar sessió'
          }
        </button>

      </div>

    </div>
  `;

}


function bindAuthEvents() {

  const form =
    document.querySelector(
      '#auth-form'
    );

  if (form) {

    form.addEventListener(
      'submit',
      handleAuth
    );

  }

  const toggle =
    document.querySelector(
      '[data-action="toggle-auth"]'
    );

  if (toggle) {

    toggle.addEventListener(
      'click',
      toggleAuthMode
    );

  }

}


/* =========================================================
   NAVEGACIÓ
   ========================================================= */

function navItems() {

  return [
    ['dashboard', 'Tauler', 'dashboard'],
    ['tasks', 'Tasques', 'tasks'],
    ['exams', 'Exàmens', 'exams'],
    ['planner', 'Planificador', 'planner'],
    ['schedule', 'Horari', 'schedule'],
    ['chat', "IA d'estudi", 'chat'],
    ['progress', 'Progrés', 'progress'],
    ['settings', 'Avaluació', 'settings']
  ];

}


function pageTitle() {

  const item =
    navItems().find(
      item =>
        item[0] === currentPage
    );

  return (
    item?.[1] ||
    'Tauler'
  );

}


/* =========================================================
   LAYOUT
   ========================================================= */

function layout() {

  return `
    <div class="app-shell">

      <aside class="sidebar">

        <div class="brand">

          <div class="brand-mark">
            ${icon('sparkles', 22)}
          </div>

          <div class="brand-copy">
            <strong>TRIA</strong>
            <span>Fet per Freddy Figueroa</span>
          </div>

          <img
            class="school-logo"
            src="/logo-institut.png"
            alt="Logo de l'institut"
          >

        </div>

        <nav class="nav">

          ${navItems().map(
            ([id, label, ico]) => `
              <button
                class="nav-item ${
                  currentPage === id
                    ? 'active'
                    : ''
                }"
                data-page="${id}"
              >
                ${icon(ico)}
                <span>${label}</span>
              </button>
            `
          ).join('')}

        </nav>

        <div class="sidebar-bottom">

          <div class="ai-status">

            <span class="status-dot"></span>

            <div>
              <strong>IA preparada</strong>
              <small>Gemini connectat</small>
            </div>

          </div>

          <button
            class="logout-btn"
            data-action="logout"
          >
            Tancar sessió
          </button>

        </div>

      </aside>

      <main class="main">

        <header class="topbar">

          <div>

            <p class="eyebrow">
              Organització acadèmica
            </p>

            <h1>
              ${pageTitle()}
            </h1>

          </div>

          <div class="top-actions">

            ${
              currentPage === 'tasks'
                ? `
                  <button
                    class="btn primary"
                    data-action="new-task"
                  >
                    ${icon('plus', 17)}
                    Nova tasca
                  </button>
                `
                : ''
            }

            ${
              currentPage === 'exams'
                ? `
                  <button
                    class="btn primary"
                    data-action="new-exam"
                  >
                    ${icon('plus', 17)}
                    Nou examen
                  </button>
                `
                : ''
            }

            ${
              currentPage === 'schedule'
                ? `
                  <button
                    class="btn primary"
                    data-action="new-schedule-event"
                  >
                    ${icon('plus', 17)}
                    Nou esdeveniment
                  </button>
                `
                : ''
            }

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
    <div
      id="modal"
      class="modal-backdrop hidden"
    >

      <div class="modal">

        <div class="modal-head">

          <div>

            <p
              class="eyebrow"
              id="modal-eyebrow"
            >
              TRIA
            </p>

            <h2 id="modal-title">
              Nova tasca
            </h2>

          </div>

          <button
            class="icon-btn"
            data-action="close-modal"
            aria-label="Tancar"
          >
            ${icon('close')}
          </button>

        </div>

        <form
          id="modal-form"
        ></form>

      </div>

    </div>
  `;

}


/* =========================================================
   COMPONENTS
   ========================================================= */

function statCard(
  label,
  value,
  note,
  ico
) {

  return `
    <div class="stat-card">

      <div class="stat-icon">
        ${icon(ico, 20)}
      </div>

      <div>

        <span>${label}</span>

        <strong>${value}</strong>

        <small>${note}</small>

      </div>

    </div>
  `;

}


function taskCard(task) {

  const days =
    daysUntil(
      task.dueDate
    );

  const urgent =
    task.status !== 'completed' &&
    days <= 2;

  return `
    <article class="task-card">

      <div class="task-main">

        <div
          class="task-check ${
            task.status === 'completed'
              ? 'done'
              : ''
          }"
          data-action="toggle-task"
          data-id="${task.id}"
        >
          ${
            task.status === 'completed'
              ? icon('check', 16)
              : ''
          }
        </div>

        <div class="task-info">

          <div class="task-title-row">

            <h3>
              ${esc(task.title)}
            </h3>

            <span class="badge">
              ${esc(
                task.subject ||
                'General'
              )}
            </span>

          </div>

          <p>
            ${esc(
              task.description ||
              'Sense descripció'
            )}
          </p>

          <div class="task-meta">

            <span>
              ${icon('calendar', 14)}
              ${formatDate(
                task.dueDate
              )}
            </span>

            <span>
              ${icon('clock', 14)}
              ${Number(
                task.minutes || 30
              )}
              min
            </span>

            <span>
              Dificultat:
              ${difficultyLabel(
                task.difficulty
              )}
            </span>

            ${
              urgent
                ? `
                  <span class="danger-text">
                    Urgent
                  </span>
                `
                : ''
            }

          </div>

        </div>

      </div>

      <div class="task-actions">

        <button
          class="icon-btn"
          data-action="edit-task"
          data-id="${task.id}"
          aria-label="Editar"
        >
          ${icon('edit', 16)}
        </button>

        <button
          class="icon-btn danger"
          data-action="delete-task"
          data-id="${task.id}"
          aria-label="Eliminar"
        >
          ${icon('trash', 16)}
        </button>

      </div>

    </article>
  `;

}


function examCard(exam) {

  return `
    <article class="exam-card">

      <div class="exam-date">

        <strong>
          ${formatDate(exam.date)}
        </strong>

      </div>

      <div class="exam-info">

        <h3>
          ${esc(exam.subject)}
        </h3>

        <p>
          ${esc(
            exam.syllabus ||
            'Sense temari indicat'
          )}
        </p>

        <div class="exam-meta">

          <span>
            Dificultat:
            ${difficultyLabel(
              exam.difficulty
            )}
          </span>

          <span>
            ${Number(
              exam.availableMinutes || 0
            )} min disponibles
          </span>

        </div>

      </div>

      <div class="exam-actions">

        <button
          class="icon-btn"
          data-action="edit-exam"
          data-id="${exam.id}"
        >
          ${icon('edit', 16)}
        </button>

        <button
          class="icon-btn danger"
          data-action="delete-exam"
          data-id="${exam.id}"
        >
          ${icon('trash', 16)}
        </button>

      </div>

    </article>
  `;

}


/* =========================================================
   DASHBOARD
   ========================================================= */

const teacherQuotes = [
  'La intel·ligència artificial ha de servir per ajudar l’alumnat a aprendre millor, no per substituir el seu esforç.',
  'La tecnologia és més útil quan ajuda a organitzar, comprendre i prendre decisions amb criteri propi.',
  'Aprendre continua sent responsabilitat de l’alumne; la IA pot ser una eina per fer aquest procés més ordenat.',
  'Una bona planificació pot convertir moltes hores d’estudi en un treball més eficient i conscient.'
];

function randomTeacherQuote() {

  return teacherQuotes[
    Math.floor(
      Math.random() *
      teacherQuotes.length
    )
  ];

}

let teacherQuote =
  randomTeacherQuote();


function dashboardView() {

  const pending =
    state.tasks
      .filter(
        task =>
          task.status !==
          'completed'
      );

  const completed =
    state.tasks
      .filter(
        task =>
          task.status ===
          'completed'
      );

  const urgent =
    pending
      .filter(
        task =>
          daysUntil(
            task.dueDate
          ) <= 2
      )
      .sort(
        (a, b) =>
          a.dueDate.localeCompare(
            b.dueDate
          )
      );

  const upcomingExams =
    [...state.exams]
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      )
      .slice(0, 3);

  const totalMinutes =
    state.tasks.reduce(
      (sum, t) =>
        sum +
        Number(
          t.minutes || 0
        ),
      0
    );

  const completedMinutes =
    completed.reduce(
      (sum, t) =>
        sum +
        Number(
          t.minutes || 0
        ),
      0
    );

  const percent =
    state.tasks.length
      ? Math.round(
          completed.length /
          state.tasks.length *
          100
        )
      : 0;

  return `
    <div class="page">

      <div class="hero">

        <div>

          <p class="eyebrow">
            Bon dia
          </p>

          <h2>
            Organitza el teu estudi amb TRIA.
          </h2>

          <p>
            Consulta les tasques, prepara els
            exàmens i deixa que la IA t'ajudi
            a ordenar les prioritats.
          </p>

          <div class="teacher-quote">

            <div class="teacher-quote-label">
              ✦ Veu del professorat sobre l'IA
            </div>

            <blockquote>
              “${esc(
                teacherQuote
              )}”
            </blockquote>

          </div>

        </div>

        <button
          class="btn primary"
          data-action="recalculate"
        >
          ${icon('sparkles', 17)}
          Recalcular amb IA
        </button>

      </div>

      <div class="stats-grid">

        ${statCard(
          'Tasques pendents',
          pending.length,
          `${completed.length} completades`,
          'tasks'
        )}

        ${statCard(
          'Exàmens propers',
          upcomingExams.length,
          'Següents dates',
          'exams'
        )}

        ${statCard(
          'Progrés',
          `${percent}%`,
          `${completedMinutes} / ${
            totalMinutes || 0
          } min`,
          'progress'
        )}

        ${statCard(
          'Urgents',
          urgent.length,
          'En els pròxims 2 dies',
          'clock'
        )}

      </div>

      <div class="two-col">

        <section class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                Prioritats
              </p>

              <h2>
                Què hauries de fer ara?
              </h2>

            </div>

            <button
              class="text-btn"
              data-page="tasks"
            >
              Veure tasques
              ${icon('arrow', 15)}
            </button>

          </div>

          <div class="list">

            ${
              (
                urgent.length
                  ? urgent
                  : pending
              )
                .slice(0, 4)
                .map(taskCard)
                .join('')
                ||
                `
                  <div class="empty">
                    <p>
                      No tens tasques pendents.
                    </p>
                  </div>
                `
            }

          </div>

        </section>

        <section class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                Exàmens
              </p>

              <h2>
                Pròxims exàmens
              </h2>

            </div>

            <button
              class="text-btn"
              data-page="exams"
            >
              Veure exàmens
              ${icon('arrow', 15)}
            </button>

          </div>

          <div class="list">

            ${
              upcomingExams
                .map(examCard)
                .join('')
                ||
                `
                  <div class="empty">
                    <p>
                      No tens exàmens registrats.
                    </p>
                  </div>
                `
            }

          </div>

        </section>

      </div>

      <section class="panel ai-summary">

        <div class="panel-head">

          <div>

            <p class="eyebrow">
              Intel·ligència artificial
            </p>

            <h2>
              Pla recomanat
            </h2>

          </div>

          <span class="ai-badge">
            ${icon('sparkles', 14)}
            IA
          </span>

        </div>

        <p>
          ${
            esc(
              state.plan?.summary ||
              'Encara no tens cap pla calculat. La IA pot analitzar les teves tasques i exàmens per proposar-te un ordre de treball.'
            )
          }
        </p>

      </section>

    </div>
  `;

}


/* =========================================================
   TASQUES
   ========================================================= */

function tasksView() {

  const tasks =
    [...state.tasks]
      .sort(
        (a, b) =>
          a.dueDate.localeCompare(
            b.dueDate
          )
      );

  return `
    <div class="page">

      <div class="section-intro">

        <div>

          <p class="eyebrow">
            Organització
          </p>

          <h2>
            Les meves tasques
          </h2>

          <p class="muted">
            Controla el que tens pendent,
            el que estàs fent i el que ja has acabat.
          </p>

        </div>

      </div>

      <section class="panel">

        ${
          tasks.length
            ? `
              <div class="list">
                ${tasks
                  .map(taskCard)
                  .join('')}
              </div>
            `
            : `
              <div class="empty">

                <div class="empty-icon">
                  ${icon(
                    'tasks',
                    25
                  )}
                </div>

                <h3>
                  Encara no tens tasques
                </h3>

                <p>
                  Afegeix la primera tasca
                  per començar a organitzar-te.
                </p>

                <button
                  class="btn primary"
                  data-action="new-task"
                >
                  ${icon('plus', 16)}
                  Nova tasca
                </button>

              </div>
            `
        }

      </section>

    </div>
  `;

}


/* =========================================================
   EXÀMENS
   ========================================================= */

function examsView() {

  const exams =
    [...state.exams]
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );

  return `
    <div class="page">

      <div class="section-intro">

        <div>

          <p class="eyebrow">
            Preparació
          </p>

          <h2>
            Els meus exàmens
          </h2>

          <p class="muted">
            Tingues les dates i el temari
            controlats.
          </p>

        </div>

      </div>

      <section class="panel">

        ${
          exams.length
            ? `
              <div class="list">
                ${exams
                  .map(examCard)
                  .join('')}
              </div>
            `
            : `
              <div class="empty">

                <div class="empty-icon">
                  ${icon(
                    'exams',
                    25
                  )}
                </div>

                <h3>
                  No hi ha exàmens
                </h3>

                <p>
                  Afegeix el teu primer
                  examen.
                </p>

                <button
                  class="btn primary"
                  data-action="new-exam"
                >
                  ${icon('plus', 16)}
                  Nou examen
                </button>

              </div>
            `
        }

      </section>

    </div>
  `;

}


/* =========================================================
   PLANIFICADOR
   ========================================================= */

function plannerView() {

  const days = [];

  const start =
    new Date();

  start.setHours(
    12,
    0,
    0,
    0
  );

  for (
    let i = 0;
    i < 7;
    i++
  ) {

    const d =
      new Date(start);

    d.setDate(
      start.getDate() + i
    );

    const iso =
      new Date(
        d.getTime() -
        d.getTimezoneOffset() *
        60000
      )
        .toISOString()
        .slice(0, 10);

    days.push({
      date: iso,
      label:
        new Intl.DateTimeFormat(
          'ca-ES',
          {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          }
        ).format(d)
    });

  }

  return `
    <div class="page">

      <div class="section-intro">

        <div>

          <p class="eyebrow">
            Setmana
          </p>

          <h2>
            Pla setmanal
          </h2>

          <p class="muted">
            Consulta les tasques i les
            sessions recomanades.
          </p>

        </div>

      </div>

      <section class="planner">

        ${days.map(day => {

          const taskItems =
            state.tasks.filter(
              task =>
                task.dueDate ===
                day.date
            );

          const sessions =
            state.plan?.sessions
              ?.filter(
                session =>
                  session.date ===
                  day.date
              ) || [];

          return `
            <div class="day-column">

              <div class="day-head">
                ${day.label}
              </div>

              <div class="day-body">

                ${
                  taskItems
                    .map(
                      task => `
                        <div class="calendar-item task-item">
                          <strong>
                            ${esc(task.title)}
                          </strong>

                          <span>
                            ${esc(
                              task.subject ||
                              'General'
                            )}
                          </span>
                        </div>
                      `
                    )
                    .join('')
                }

                ${
                  sessions
                    .map(
                      session => `
                        <div class="calendar-item ai-item">

                          <strong>
                            Sessió d'estudi
                          </strong>

                          <span>
                            ${esc(
                              session.title ||
                              'Estudi'
                            )}
                          </span>

                          <small>
                            ${Number(
                              session.minutes ||
                              30
                            )} min
                          </small>

                        </div>
                      `
                    )
                    .join('')
                }

                ${
                  !taskItems.length &&
                  !sessions.length
                    ? `
                      <div class="day-empty">
                        Sense activitat
                      </div>
                    `
                    : ''
                }

              </div>

            </div>
          `;

        }).join('')}

      </section>

    </div>
  `;

}


/* =========================================================
   HORARI
   ========================================================= */

const scheduleDays = [
  ['monday', 'Dilluns'],
  ['tuesday', 'Dimarts'],
  ['wednesday', 'Dimecres'],
  ['thursday', 'Dijous'],
  ['friday', 'Divendres']
];

const scheduleStartHour = 8;

const scheduleEndHour = 20;


function addMinutesToTime(
  time,
  minutes
) {

  const [
    hours,
    mins
  ] =
    String(
      time || '08:00'
    )
      .split(':')
      .map(Number);

  const total =
    Math.min(
      hours * 60 +
      mins +
      minutes,
      23 * 60 + 59
    );

  return `${String(
    Math.floor(total / 60)
  ).padStart(2, '0')}:${String(
    total % 60
  ).padStart(2, '0')}`;

}


function scheduleTimeToMinutes(
  time
) {

  const [
    hours,
    minutes
  ] =
    String(
      time || '00:00'
    )
      .split(':')
      .map(Number);

  return (
    hours * 60 +
    minutes
  );

}


function scheduleView() {

  const events =
    Array.isArray(
      state.scheduleEvents
    )
      ? state.scheduleEvents
      : [];

  const hours =
    Array.from(
      {
        length:
          scheduleEndHour -
          scheduleStartHour
      },
      (_, index) =>
        scheduleStartHour +
        index
    );

  return `
    <div class="page schedule-page">

      <div class="schedule-intro">

        <div>

          <p class="eyebrow">
            Horari setmanal
          </p>

          <h2>
            El meu horari
          </h2>

          <p class="muted">
            Guarda les teves classes i reserva
            les hores que ja tens ocupades.
          </p>

        </div>

        <div class="schedule-tip">

          <span>
            ${icon('calendar', 15)}
          </span>

          <span>
            Després TRIA podrà tenir en compte
            aquestes hores per organitzar
            el teu estudi.
          </span>

        </div>

      </div>

      <section class="panel schedule-panel">

        <div class="schedule-grid">

          <div class="schedule-corner"></div>

          ${scheduleDays.map(
            ([day, label]) => `
              <div class="schedule-day-head">
                ${label}
              </div>
            `
          ).join('')}

          ${hours.map(
            hour => `

              <div class="schedule-time">
                ${String(hour).padStart(
                  2,
                  '0'
                )}:00
              </div>

              ${scheduleDays.map(
                ([day]) => {

                  const slotEvents =
                    events.filter(
                      item => {

                        if (
                          item.day !==
                          day
                        ) {
                          return false;
                        }

                        const start =
                          scheduleTimeToMinutes(
                            item.startTime
                          );

                        const end =
                          scheduleTimeToMinutes(
                            item.endTime
                          );

                        return (
                          start <
                            (hour + 1) *
                            60 &&
                          end >
                            hour * 60
                        );

                      }
                    );

                  return `
                    <div
                      class="schedule-slot"
                      data-action="new-schedule-event"
                      data-day="${day}"
                      data-time="${String(
                        hour
                      ).padStart(
                        2,
                        '0'
                      )}:00"
                    >

                      ${
                        slotEvents
                          .map(
                            item => `
                              <button
                                type="button"
                                class="schedule-event type-${esc(
                                  item.type ||
                                  'class'
                                )}"
                                data-action="edit-schedule-event"
                                data-id="${esc(
                                  item.id
                                )}"
                              >

                                <strong>
                                  ${esc(
                                    item.title
                                  )}
                                </strong>

                                ${
                                  item.subject
                                    ? `
                                      <span>
                                        ${esc(
                                          item.subject
                                        )}
                                      </span>
                                    `
                                    : ''
                                }

                                <small>
                                  ${esc(
                                    item.startTime
                                  )}–${esc(
                                    item.endTime
                                  )}
                                </small>

                              </button>
                            `
                          )
                          .join('')
                      }

                    </div>
                  `;

                }
              ).join('')}

            `
          ).join('')}

        </div>

      </section>

      <div class="schedule-legend">

        <span>
          <i class="legend-dot class"></i>
          Classe
        </span>

        <span>
          <i class="legend-dot study"></i>
          Estudi
        </span>

        <span>
          <i class="legend-dot exam"></i>
          Examen
        </span>

        <span>
          <i class="legend-dot personal"></i>
          Personal
        </span>

      </div>

    </div>
  `;

}


/* =========================================================
   HORARI · CRUD
   ========================================================= */

function openScheduleEventModal(
  id = null,
  presetDay = '',
  presetTime = ''
) {

  modalMode =
    'schedule-event';

  editingId = id;

  const item =
    id
      ? (
          state.scheduleEvents ||
          []
        ).find(
          event =>
            event.id === id
        )
      : null;

  const modal =
    document.querySelector(
      '#modal'
    );

  const form =
    document.querySelector(
      '#modal-form'
    );

  const day =
    item?.day ||
    presetDay ||
    'monday';

  const startTime =
    item?.startTime ||
    presetTime ||
    '08:00';

  const endTime =
    item?.endTime ||
    addMinutesToTime(
      startTime,
      60
    );

  document.querySelector(
    '#modal-eyebrow'
  ).textContent =
    'HORARI';

  document.querySelector(
    '#modal-title'
  ).textContent =
    item
      ? 'Editar esdeveniment'
      : 'Nou esdeveniment';

  form.innerHTML = `

    <div class="form-grid">

      <label>

        Títol

        <input
          name="title"
          required
          value="${esc(
            item?.title ||
            ''
          )}"
          placeholder="Ex. Matemàtiques"
        >

      </label>

      <label>

        Assignatura

        <input
          name="subject"
          value="${esc(
            item?.subject ||
            ''
          )}"
          placeholder="Ex. Matemàtiques"
        >

      </label>

      <label>

        Tipus

        <select
          name="type"
        >

          <option
            value="class"
            ${
              item?.type ===
                'class' ||
              !item
                ? 'selected'
                : ''
            }
          >
            Classe
          </option>

          <option
            value="study"
            ${
              item?.type ===
              'study'
                ? 'selected'
                : ''
            }
          >
            Estudi
          </option>

          <option
            value="exam"
            ${
              item?.type ===
              'exam'
                ? 'selected'
                : ''
            }
          >
            Examen
          </option>

          <option
            value="personal"
            ${
              item?.type ===
              'personal'
                ? 'selected'
                : ''
            }
          >
            Personal
          </option>

        </select>

      </label>

      <label>

        Dia

        <select
          name="day"
        >

          ${scheduleDays.map(
            ([value, label]) => `

              <option
                value="${value}"
                ${
                  day === value
                    ? 'selected'
                    : ''
                }
              >
                ${label}
              </option>

            `
          ).join('')}

        </select>

      </label>

      <label>

        Hora d'inici

        <input
          name="startTime"
          type="time"
          required
          value="${esc(
            startTime
          )}"
        >

      </label>

      <label>

        Hora de finalització

        <input
          name="endTime"
          type="time"
          required
          value="${esc(
            endTime
          )}"
        >

      </label>

      <label class="full">

        Notes

        <textarea
          name="notes"
          rows="3"
          placeholder="Informació opcional"
        >${esc(
          item?.notes ||
          ''
        )}</textarea>

      </label>

    </div>

    <div class="modal-actions">

      ${
        item
          ? `
            <button
              type="button"
              class="btn ghost danger-btn"
              data-action="delete-schedule-event"
              data-id="${esc(
                item.id
              )}"
            >
              ${icon(
                'trash',
                15
              )}
              Eliminar
            </button>
          `
          : ''
      }

      <div class="modal-actions-right">

        <button
          type="button"
          class="btn secondary"
          data-action="close-modal"
        >
          Cancel·lar
        </button>

        <button
          type="submit"
          class="btn primary"
        >
          Guardar esdeveniment
        </button>

      </div>

    </div>

  `;

  form.onsubmit =
    saveScheduleEventFromForm;

  modal.classList.remove(
    'hidden'
  );

}


function saveScheduleEventFromForm(
  event
) {

  event.preventDefault();

  const data =
    new FormData(
      event.currentTarget
    );

  const title =
    String(
      data.get('title') ||
      ''
    ).trim();

  const startTime =
    String(
      data.get('startTime') ||
      ''
    );

  const endTime =
    String(
      data.get('endTime') ||
      ''
    );

  if (!title) {

    alert(
      'Escriu un títol per a l’esdeveniment.'
    );

    return;
  }

  if (
    !startTime ||
    !endTime ||
    startTime >= endTime
  ) {

    alert(
      'L’hora de finalització ha de ser posterior a l’hora d’inici.'
    );

    return;
  }

  if (
    !Array.isArray(
      state.scheduleEvents
    )
  ) {

    state.scheduleEvents =
      [];

  }

  const item = {

    id:
      editingId ||
      uid('schedule'),

    title,

    subject:
      String(
        data.get('subject') ||
        ''
      ).trim(),

    type:
      String(
        data.get('type') ||
        'class'
      ),

    day:
      String(
        data.get('day') ||
        'monday'
      ),

    startTime,

    endTime,

    notes:
      String(
        data.get('notes') ||
        ''
      ).trim()

  };

  if (editingId) {

    state.scheduleEvents =
      state.scheduleEvents.map(
        eventItem =>
          eventItem.id ===
          editingId
            ? item
            : eventItem
      );

  } else {

    state.scheduleEvents.push(
      item
    );

  }

  state.scheduleEvents.sort(
    (a, b) =>
      scheduleDays.findIndex(
        ([day]) =>
          day === a.day
      ) -
      scheduleDays.findIndex(
        ([day]) =>
          day === b.day
      ) ||
      a.startTime.localeCompare(
        b.startTime
      )
  );

  saveState();

  closeModal();

  currentPage =
    'schedule';

  render();

}


function deleteScheduleEvent(
  id
) {

  if (
    !confirm(
      'Vols eliminar aquest esdeveniment?'
    )
  ) {
    return;
  }

  state.scheduleEvents =
    (
      state.scheduleEvents ||
      []
    ).filter(
      item =>
        item.id !== id
    );

  saveState();

  closeModal();

  currentPage =
    'schedule';

  render();

}


/* =========================================================
   TASQUES · CRUD
   ========================================================= */

function openTaskModal(
  id = null
) {

  modalMode = 'task';

  editingId = id;

  const task =
    id
      ? state.tasks.find(
          t => t.id === id
        )
      : null;

  const modal =
    document.querySelector(
      '#modal'
    );

  const form =
    document.querySelector(
      '#modal-form'
    );

  document.querySelector(
    '#modal-eyebrow'
  ).textContent =
    'TASQUES';

  document.querySelector(
    '#modal-title'
  ).textContent =
    task
      ? 'Editar tasca'
      : 'Nova tasca';

  form.innerHTML = `

    <div class="form-grid">

      <label>

        Títol

        <input
          name="title"
          required
          value="${esc(
            task?.title ||
            ''
          )}"
          placeholder="Ex. Preparar presentació"
        >

      </label>

      <label>

        Assignatura

        <input
          name="subject"
          value="${esc(
            task?.subject ||
            ''
          )}"
          placeholder="Ex. Història"
        >

      </label>

      <label class="full">

        Descripció

        <textarea
          name="description"
          rows="3"
          placeholder="Què has de fer?"
        >${esc(
          task?.description ||
          ''
        )}</textarea>

      </label>

      <label>

        Data límit

        <input
          name="dueDate"
          type="date"
          required
          value="${
            task?.dueDate ||
            todayISO()
          }"
        >

      </label>

      <label>

        Temps estimat (min)

        <input
          name="minutes"
          type="number"
          min="5"
          step="5"
          value="${Number(
            task?.minutes ||
            30
          )}"
        >

      </label>

      <label>

        Dificultat

        <select
          name="difficulty"
        >

          ${
            [1,2,3,4,5]
              .map(
                n => `
                  <option
                    value="${n}"
                    ${
                      Number(
                        task?.difficulty ||
                        3
                      ) === n
                        ? 'selected'
                        : ''
                    }
                  >
                    ${n} ·
                    ${difficultyLabel(
                      n
                    )}
                  </option>
                `
              )
              .join('')
          }

        </select>

      </label>

      <label>

        Estat

        <select
          name="status"
        >

          <option
            value="pending"
            ${
              task?.status ===
                'pending' ||
              !task
                ? 'selected'
                : ''
            }
          >
            Pendent
          </option>

          <option
            value="inprogress"
            ${
              task?.status ===
              'inprogress'
                ? 'selected'
                : ''
            }
          >
            En curs
          </option>

          <option
            value="completed"
            ${
              task?.status ===
              'completed'
                ? 'selected'
                : ''
            }
          >
            Completada
          </option>

        </select>

      </label>

    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn secondary"
        data-action="close-modal"
      >
        Cancel·lar
      </button>

      <button
        type="submit"
        class="btn primary"
      >
        Guardar tasca
      </button>

    </div>

  `;

  form.onsubmit =
    saveTaskFromForm;

  modal.classList.remove(
    'hidden'
  );

}


function saveTaskFromForm(
  event
) {

  event.preventDefault();

  const data =
    new FormData(
      event.currentTarget
    );

  const item = {

    id:
      editingId ||
      uid('task'),

    title:
      String(
        data.get('title') ||
        ''
      ).trim(),

    subject:
      String(
        data.get('subject') ||
        ''
      ).trim() ||
      'General',

    description:
      String(
        data.get(
          'description'
        ) ||
        ''
      ).trim(),

    dueDate:
      data.get('dueDate'),

    minutes:
      Number(
        data.get('minutes')
      ) || 30,

    difficulty:
      Number(
        data.get(
          'difficulty'
        )
      ) || 3,

    status:
      data.get('status') ||
      'pending'

  };

  if (editingId) {

    state.tasks =
      state.tasks.map(
        task =>
          task.id ===
          editingId
            ? item
            : task
      );

  } else {

    state.tasks.push(
      item
    );

  }

  saveState();

  closeModal();

  render();

}


function deleteTask(id) {

  if (
    !confirm(
      'Vols eliminar aquesta tasca?'
    )
  ) {
    return;
  }

  state.tasks =
    state.tasks.filter(
      task =>
        task.id !== id
    );

  saveState();

  render();

}


function toggleTask(id) {

  state.tasks =
    state.tasks.map(
      task => {

        if (
          task.id !== id
        ) {
          return task;
        }

        return {
          ...task,
          status:
            task.status ===
            'completed'
              ? 'pending'
              : 'completed'
        };

      }
    );

  saveState();

  render();

}


/* =========================================================
   EXÀMENS · CRUD
   ========================================================= */

function openExamModal(
  id = null
) {

  modalMode = 'exam';

  editingId = id;

  const exam =
    id
      ? state.exams.find(
          e => e.id === id
        )
      : null;

  const modal =
    document.querySelector(
      '#modal'
    );

  const form =
    document.querySelector(
      '#modal-form'
    );

  document.querySelector(
    '#modal-eyebrow'
  ).textContent =
    'EXÀMENS';

  document.querySelector(
    '#modal-title'
  ).textContent =
    exam
      ? 'Editar examen'
      : 'Nou examen';

  form.innerHTML = `

    <div class="form-grid">

      <label>

        Assignatura

        <input
          name="subject"
          required
          value="${esc(
            exam?.subject ||
            ''
          )}"
          placeholder="Ex. Matemàtiques"
        >

      </label>

      <label>

        Data

        <input
          name="date"
          type="date"
          required
          value="${
            exam?.date ||
            todayISO()
          }"
        >

      </label>

      <label class="full">

        Temari

        <textarea
          name="syllabus"
          rows="3"
          placeholder="Temes que entren a l'examen"
        >${esc(
          exam?.syllabus ||
          ''
        )}</textarea>

      </label>

      <label>

        Dificultat

        <select
          name="difficulty"
        >

          ${
            [1,2,3,4,5]
              .map(
                n => `
                  <option
                    value="${n}"
                    ${
                      Number(
                        exam?.difficulty ||
                        3
                      ) === n
                        ? 'selected'
                        : ''
                    }
                  >
                    ${n} ·
                    ${difficultyLabel(
                      n
                    )}
                  </option>
                `
              )
              .join('')
          }

        </select>

      </label>

      <label>

        Temps disponible (min)

        <input
          name="availableMinutes"
          type="number"
          min="0"
          step="15"
          value="${Number(
            exam?.availableMinutes ||
            120
          )}"
        >

      </label>

    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn secondary"
        data-action="close-modal"
      >
        Cancel·lar
      </button>

      <button
        type="submit"
        class="btn primary"
      >
        Guardar examen
      </button>

    </div>

  `;

  form.onsubmit =
    saveExamFromForm;

  modal.classList.remove(
    'hidden'
  );

}


function saveExamFromForm(
  event
) {

  event.preventDefault();

  const data =
    new FormData(
      event.currentTarget
    );

  const item = {

    id:
      editingId ||
      uid('exam'),

    subject:
      String(
        data.get('subject') ||
        ''
      ).trim(),

    date:
      data.get('date'),

    syllabus:
      String(
        data.get('syllabus') ||
        ''
      ).trim(),

    difficulty:
      Number(
        data.get('difficulty')
      ) || 3,

    availableMinutes:
      Number(
        data.get(
          'availableMinutes'
        )
      ) || 0

  };

  if (editingId) {

    state.exams =
      state.exams.map(
        exam =>
          exam.id ===
          editingId
            ? item
            : exam
      );

  } else {

    state.exams.push(
      item
    );

  }

  saveState();

  closeModal();

  render();

}


function deleteExam(id) {

  if (
    !confirm(
      'Vols eliminar aquest examen?'
    )
  ) {
    return;
  }

  state.exams =
    state.exams.filter(
      exam =>
        exam.id !== id
    );

  saveState();

  render();

}


function closeModal() {

  const modal =
    document.querySelector(
      '#modal'
    );

  if (modal) {

    modal.classList.add(
      'hidden'
    );

  }

  modalMode = null;

  editingId = null;

}


/* =========================================================
   IA · PLA D'ESTUDI
   ========================================================= */

async function generatePlan() {

  const buttons =
    [
      ...document.querySelectorAll(
        '[data-action="recalculate"]'
      )
    ];

  buttons.forEach(
    button => {

      button.disabled = true;

      button.innerHTML =
        `${icon(
          'refresh',
          16
        )} Calculant...`;

    }
  );

  try {

    const response =
      await fetch(
        '/api/ai/plan',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              tasks:
                state.tasks,

              exams:
                state.exams
            })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.error ||
        'No s’ha pogut generar el pla.'
      );

    }

    if (
      Array.isArray(
        data.sessions
      )
    ) {

      data.sessions =
        data.sessions.filter(
          session => {

            if (
              session.targetType ===
                'task' &&
              !state.tasks.some(
                task =>
                  String(
                    task.id
                  ) ===
                  String(
                    session.targetId
                  )
              )
            ) {
              return false;
            }

            if (
              session.targetType ===
                'exam' &&
              !state.exams.some(
                exam =>
                  String(
                    exam.id
                  ) ===
                  String(
                    session.targetId
                  )
              )
            ) {
              return false;
            }

            return true;

          }
        );

    }

    state.plan = data;

    saveState();

  } catch (error) {

    alert(
      error.message
    );

  }

  render();

}


/* =========================================================
   IA · XAT
   ========================================================= */

function chatView() {

  return `
    <div class="page">

      <div class="section-intro">

        <div>

          <p class="eyebrow">
            Assistent
          </p>

          <h2>
            Parla amb la IA
          </h2>

          <p class="muted">
            Pregunta sobre les teves tasques,
            exàmens i organització.
          </p>

        </div>

      </div>

      <section class="chat-panel">

        <div
          id="chat-messages"
          class="chat-messages"
        >

          ${
            state.chat.length
              ? state.chat
                  .map(
                    message => `
                      <div
                        class="chat-message ${
                          message.role ===
                          'user'
                            ? 'user'
                            : 'assistant'
                        }"
                      >
                        <div class="chat-bubble">
                          ${
                            message.role ===
                            'assistant'
                              ? chatMarkdown(
                                  message.text
                                )
                              : esc(
                                  message.text
                                )
                          }
                        </div>
                      </div>
                    `
                  )
                  .join('')
              : `
                <div class="chat-empty">

                  <div class="ai-badge">
                    ${icon(
                      'sparkles',
                      15
                    )}
                    IA
                  </div>

                  <h3>
                    Com et puc ajudar?
                  </h3>

                  <p>
                    Pots preguntar-me com
                    prioritzar les tasques,
                    quan estudiar o com
                    organitzar la setmana.
                  </p>

                </div>
              `
          }

        </div>

        <form
          id="chat-form"
          class="chat-input"
        >

          <input
            name="message"
            autocomplete="off"
            placeholder="Escriu una pregunta..."
            required
          >

          <button
            type="submit"
            class="btn primary"
          >
            Enviar
          </button>

        </form>

      </section>

    </div>
  `;

}


async function sendChat(event) {

  event.preventDefault();

  const input =
    event.currentTarget.querySelector(
      'input[name="message"]'
    );

  const message =
    input.value.trim();

  if (!message) {
    return;
  }

  state.chat.push({
    role: 'user',
    text: message
  });

  input.value = '';

  saveState();

  render();

  try {

    const response =
      await fetch(
        '/api/ai/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              message,
              tasks:
                state.tasks,
              exams:
                state.exams
            })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.error ||
        'Error de la IA.'
      );

    }

    state.chat.push({

      role:
        'assistant',

      text:
        data.answer ||
        'No he rebut cap resposta.'

    });

  } catch (error) {

    state.chat.push({

      role:
        'assistant',

      text:
        `No he pogut connectar amb la IA: ${error.message}`

    });

  }

  saveState();

  render();

}


/* =========================================================
   PROGRÉS
   ========================================================= */

function progressView() {

  const completed =
    state.tasks.filter(
      task =>
        task.status ===
        'completed'
    );

  const pending =
    state.tasks.filter(
      task =>
        task.status !==
        'completed'
    );

  const totalMinutes =
    state.tasks.reduce(
      (sum, task) =>
        sum +
        Number(
          task.minutes || 0
        ),
      0
    );

  const completedMinutes =
    completed.reduce(
      (sum, task) =>
        sum +
        Number(
          task.minutes || 0
        ),
      0
    );

  const percent =
    state.tasks.length
      ? Math.round(
          completed.length /
          state.tasks.length *
          100
        )
      : 0;

  return `
    <div class="page">

      <div class="section-intro">

        <div>

          <p class="eyebrow">
            Seguiment
          </p>

          <h2>
            El meu progrés
          </h2>

          <p class="muted">
            Mira com avances amb les tasques
            i el temps planificat.
          </p>

        </div>

      </div>

      <div class="stats-grid">

        ${statCard(
          'Completades',
          completed.length,
          `${pending.length} pendents`,
          'check'
        )}

        ${statCard(
          'Progrés',
          `${percent}%`,
          'Tasques completades',
          'progress'
        )}

        ${statCard(
          'Temps completat',
          `${completedMinutes} min`,
          'Segons les tasques',
          'clock'
        )}

        ${statCard(
          'Temps total',
          `${totalMinutes} min`,
          'Temps estimat',
          'clock'
        )}

      </div>

      <section class="panel">

        <div class="panel-head">

          <div>

            <p class="eyebrow">
              Resum
            </p>

            <h2>
              Activitat
            </h2>

          </div>

        </div>

        <div class="progress-bar">

          <div
            class="progress-fill"
            style="width:${percent}%"
          ></div>

        </div>

        <p class="muted">
          Has completat
          ${completed.length}
          de
          ${state.tasks.length}
          tasques.
        </p>

      </section>

    </div>
  `;

}


/* =========================================================
   AVALUACIÓ / AJUSTOS
   ========================================================= */

function settingsView() {

  return `
    <div class="page">

      <div class="section-intro">

        <div>

          <p class="eyebrow">
            Transparència
          </p>

          <h2>
            Avaluació i ajustos
          </h2>

          <p class="muted">
            Gestiona les dades locals de TRIA
            i revisa el funcionament de l'aplicació.
          </p>

        </div>

      </div>

      <section class="panel">

        <div class="panel-head">

          <div>

            <p class="eyebrow">
              Dades
            </p>

            <h2>
              Les teves dades
            </h2>

          </div>

        </div>

        <p class="muted">
          Pots exportar les dades actuals
          o eliminar-les d'aquest navegador.
        </p>

        <div class="settings-actions">

          <button
            class="btn secondary"
            data-action="export"
          >
            ${icon(
              'download',
              16
            )}
            Exportar dades
          </button>

          <button
            class="btn danger-btn"
            data-action="reset"
          >
            ${icon(
              'trash',
              16
            )}
            Eliminar dades
          </button>

        </div>

      </section>

      <section class="panel">

        <div class="panel-head">

          <div>

            <p class="eyebrow">
              Privacitat
            </p>

            <h2>
              Com funciona
            </h2>

          </div>

        </div>

        <p class="muted">
          TRIA utilitza les dades acadèmiques
          que introdueixes per organitzar
          tasques, exàmens i recomanacions.
        </p>

      </section>

    </div>
  `;

}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  const root =
    document.querySelector(
      '#root'
    );

  if (!root) {
    return;
  }

  if (!authReady) {

    root.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p>Carregant TRIA...</p>
      </div>
    `;

    return;

  }

  if (!currentUser) {

    root.innerHTML =
      authView();

    bindAuthEvents();

    return;

  }

  root.innerHTML =
    layout();

  const content =
    document.querySelector(
      '#content'
    );

  const views = {

    dashboard:
      dashboardView,

    tasks:
      tasksView,

    exams:
      examsView,

    planner:
      plannerView,

    schedule:
      scheduleView,

    chat:
      chatView,

    progress:
      progressView,

    settings:
      settingsView

  };

  content.innerHTML =
    (
      views[currentPage] ||
      dashboardView
    )();

  bindEvents();

  if (
    currentPage ===
    'chat'
  ) {

    const box =
      document.querySelector(
        '#chat-messages'
      );

    if (box) {

      box.scrollTop =
        box.scrollHeight;

    }

  }

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {

  document
    .querySelectorAll(
      '[data-page]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            currentPage =
              button.dataset.page;

            render();

          }
        );

      }
    );

  document
    .querySelectorAll(
      '[data-action]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          handleAction
        );

      }
    );

  const chatForm =
    document.querySelector(
      '#chat-form'
    );

  if (chatForm) {

    chatForm.addEventListener(
      'submit',
      sendChat
    );

  }

}


async function handleAction(
  event
) {

  const action =
    event.currentTarget.dataset.action;

  const id =
    event.currentTarget.dataset.id;

  if (
    action ===
    'toggle-auth'
  ) {

    toggleAuthMode();

    return;

  }

  if (
    action ===
    'logout'
  ) {

    await logout();

    return;

  }

  if (
    action ===
    'new-task'
  ) {

    openTaskModal();

    return;

  }

  if (
    action ===
    'edit-task'
  ) {

    openTaskModal(id);

    return;

  }

  if (
    action ===
    'delete-task'
  ) {

    deleteTask(id);

    return;

  }

  if (
    action ===
    'toggle-task'
  ) {

    toggleTask(id);

    return;

  }

  if (
    action ===
    'new-exam'
  ) {

    openExamModal();

    return;

  }

  if (
    action ===
    'new-schedule-event'
  ) {

    openScheduleEventModal(
      null,
      event.currentTarget.dataset.day ||
        '',
      event.currentTarget.dataset.time ||
        ''
    );

    return;

  }

  if (
    action ===
    'edit-schedule-event'
  ) {

    event.stopPropagation();

    openScheduleEventModal(
      id
    );

    return;

  }

  if (
    action ===
    'delete-schedule-event'
  ) {

    event.stopPropagation();

    deleteScheduleEvent(
      id
    );

    return;

  }

  if (
    action ===
    'edit-exam'
  ) {

    openExamModal(id);

    return;

  }

  if (
    action ===
    'delete-exam'
  ) {

    deleteExam(id);

    return;

  }

  if (
    action ===
    'close-modal'
  ) {

    closeModal();

    return;

  }

  if (
    action ===
    'recalculate'
  ) {

    await generatePlan();

    return;

  }

  if (
    action ===
    'export'
  ) {

    exportData();

    return;

  }

  if (
    action ===
    'reset'
  ) {

    resetData();

  }

}


/* =========================================================
   EXPORTAR
   ========================================================= */

function exportData() {

  const payload = {

    exportedAt:
      new Date().toISOString(),

    app:
      'TRIA',

    tasks:
      state.tasks,

    exams:
      state.exams,

    scheduleEvents:
      state.scheduleEvents ||
      [],

    plan:
      state.plan,

    chat:
      state.chat

  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          payload,
          null,
          2
        )
      ],
      {
        type:
          'application/json'
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      'a'
    );

  link.href = url;

  link.download =
    `tria-dades-${todayISO()}.json`;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );

}


/* =========================================================
   RESET
   ========================================================= */

function resetData() {

  if (
    !confirm(
      'Això eliminarà totes les dades guardades en aquest navegador. Vols continuar?'
    )
  ) {

    return;

  }

  state =
    structuredClone(
      defaultState
    );

  saveState();

  currentPage =
    'dashboard';

  render();

}


/* =========================================================
   TECLAT / MODAL
   ========================================================= */

document.addEventListener(
  'keydown',
  event => {

    if (
      event.key ===
      'Escape'
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   INICI
   ========================================================= */

initAuth();
