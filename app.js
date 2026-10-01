import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';


/* =========================================================
   TRIA · NÚCLEO
   ========================================================= */

const SUPABASE_URL =
  'https://tzyslkglsywfiwuhtgrj.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'PEGA_AQUI_TU_PUBLISHABLE_KEY';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


const APP_NAME = 'TRIA';
const APP_AUTHOR = 'Fet per Freddy Figueroa';
const STORAGE_KEY = 'tria';


/* =========================================================
   ESTAT
   ========================================================= */

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

let currentUser = null;

let authReady = false;

let authMode = 'login';

let modalMode = null;

let editingId = null;

let pendingScheduleEvents = [];


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function loadState() {

  try {

    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return structuredClone(defaultState);
    }

    return {
      ...structuredClone(defaultState),
      ...JSON.parse(raw)
    };

  } catch {

    return structuredClone(defaultState);

  }

}


function saveState() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

}


/* =========================================================
   AUTH
   ========================================================= */

async function initAuth() {

  try {

    const {
      data,
      error
    } =
      await supabase.auth.getSession();

    if (error) {
      console.error(error);
    }

    currentUser =
      data?.session?.user || null;

  } catch (error) {

    console.error(
      'Error de Supabase:',
      error
    );

    currentUser = null;

  }

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
      ?.value
      .trim();

  const password =
    document
      .querySelector('#auth-password')
      ?.value;

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


  if (!email || !password) {

    errorBox.textContent =
      'Escriu el correu i la contrasenya.';

    errorBox.classList.remove(
      'hidden'
    );

    return;

  }


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
          'Compte creat. Revisa el teu correu per confirmar l’adreça.';

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

  } finally {

    button.disabled = false;

    button.textContent =
      authMode === 'login'
        ? 'Iniciar sessió'
        : 'Crear compte';

  }

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
      .slice(2, 9)}`
  );

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

  const date =
    new Date();

  const offset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime() -
    offset * 60000
  )
    .toISOString()
    .slice(0, 10);

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
    (
      target - Date.now()
    ) /
    86400000
  );

}


function formatDate(value) {

  if (!value) {
    return '—';
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
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
  ).format(date);

}


function formatShortDate(value) {

  if (!value) {
    return '—';
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'ca-ES',
    {
      day: 'numeric',
      month: 'short'
    }
  ).format(date);

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
  }[
    Number(value)
  ] || 'Mitjana';

}


/* =========================================================
   ICONES
   ========================================================= */

function icon(name, size = 18) {

  const paths = {

    dashboard:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',

    tasks:
      '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',

    exams:
      '<path d="M4 4h16v16H4z"/><path d="M8 2v4M16 2v4M8 11h8M8 15h5"/>',

    calendar:
      '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/>',

    planner:
      '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/>',

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
      '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',

    check:
      '<path d="m5 12 4 4L19 6"/>',

    sparkles:
      '<path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2Z"/><path d="m19 16-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6Z"/>',

    clock:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',

    arrow:
      '<path d="M5 12h14M13 6l6 6-6 6"/>',

    close:
      '<path d="m6 6 12 12M18 6 6 18"/>',

    refresh:
      '<path d="M20 11a8.1 8.1 0 0 0-14.7-4L3 10"/><path d="M3 4v6h6"/><path d="M4 13a8.1 8.1 0 0 0 14.7 4L21 14"/><path d="M21 20v-6h-6"/>',

    download:
      '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',

    camera:
      '<path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/>',

    info:
      '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'

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
      ${paths[name] || paths.sparkles}
    </svg>
  `;

}

/* =========================================================
   LOGIN
   ========================================================= */

function authView() {

  const login =
    authMode === 'login';

  return `

    <div class="auth-screen">

      <div class="auth-card">

        <div class="auth-brand">

          <div class="auth-mark">
            ${icon('sparkles', 24)}
          </div>

          <div class="auth-brand-text">

            <strong>
              TRIA
            </strong>

            <span>
              Fet per Freddy Figueroa
            </span>

          </div>

        </div>


        <div class="auth-heading">

          <p class="eyebrow">
            ORGANITZACIÓ ACADÈMICA
          </p>

          <h1>
            ${
              login
                ? 'Benvingut de nou'
                : 'Crea el teu compte'
            }
          </h1>

          <p>
            ${
              login
                ? 'Continua organitzant el teu estudi amb TRIA.'
                : 'Comença a organitzar tasques, exàmens i estudi.'
            }
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
              autocomplete="email"
              placeholder="tu@exemple.com"
              required
            >

          </label>


          <label>

            Contrasenya

            <input
              id="auth-password"
              type="password"
              autocomplete="${
                login
                  ? 'current-password'
                  : 'new-password'
              }"
              placeholder="••••••••"
              minlength="6"
              required
            >

          </label>


          <div
            id="auth-error"
            class="auth-message hidden"
          ></div>


          <div
            id="auth-success"
            class="auth-message success hidden"
          ></div>


          <button
            class="btn primary auth-submit"
            type="submit"
          >
            ${
              login
                ? 'Iniciar sessió'
                : 'Crear compte'
            }
          </button>

        </form>


        <div class="auth-switch">

          <span>
            ${
              login
                ? 'Encara no tens compte?'
                : 'Ja tens un compte?'
            }
          </span>

          <button
            type="button"
            class="text-btn"
            data-action="toggle-auth"
          >
            ${
              login
                ? 'Crear compte'
                : 'Iniciar sessió'
            }
          </button>

        </div>

      </div>

    </div>

  `;

}


/* =========================================================
   NAVEGACIÓ
   ========================================================= */

function navItems() {

  return [

    [
      'dashboard',
      'Tauler',
      'dashboard'
    ],

    [
      'tasks',
      'Tasques',
      'tasks'
    ],

    [
      'exams',
      'Exàmens',
      'exams'
    ],

    [
      'schedule',
      'Horari',
      'calendar'
    ],

    [
      'planner',
      'Planificador',
      'planner'
    ],

    [
      'chat',
      "IA d'estudi",
      'chat'
    ],

    [
      'progress',
      'Progrés',
      'progress'
    ],

    [
      'settings',
      'Avaluació',
      'settings'
    ]

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
            ${icon('sparkles', 21)}
          </div>

          <div class="brand-copy">

            <strong>
              TRIA
            </strong>

            <span>
              Fet per Freddy Figueroa
            </span>

          </div>

          <img
            class="school-logo"
            src="/logo-institut.png"
            alt="Logo de l'institut"
          >

        </div>


        <nav class="nav">

          ${navItems()
            .map(
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

                  <span>
                    ${label}
                  </span>

                </button>

              `
            )
            .join('')}

        </nav>


        <div class="sidebar-bottom">


          <div class="ai-status">

            <span
              class="status-dot"
            ></span>

            <div>

              <strong>
                IA preparada
              </strong>

              <small>
                Gemini connectat
              </small>

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
              TRIA
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

          </div>

        </header>


        <section id="content">
        </section>


        ${buildModalHtml()}

      </main>

    </div>

  `;

}


/* =========================================================
   MODAL
   ========================================================= */

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

            <h2
              id="modal-title"
            >
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

        <span>
          ${label}
        </span>

        <strong>
          ${value}
        </strong>

        <small>
          ${note}
        </small>

      </div>

    </div>

  `;

}


function emptyState(
  title,
  text
) {

  return `

    <div class="empty large">

      <strong>
        ${esc(title)}
      </strong>

      <span>
        ${esc(text)}
      </span>

    </div>

  `;

}

/* =========================================================
   TAULER
   ========================================================= */

const teacherQuotes = [

  "Com un reforç de l'aprenentatge, no com un aprenentatge. Hi ha d'haver un filtre humà.",

  "Tant per aprofundir sobre un tema com a l'hora de resoldre dubtes.",

  "De manera ètica i responsable.",

  "Com ajuda a fomentar el pensament crític.",

  "Haurien d'aprendre les seves limitacions i contraindicacions i no haurien de recórrer a la IA com a primera opció."

];


const teacherQuote =
  teacherQuotes[
    Math.floor(
      Math.random() *
      teacherQuotes.length
    )
  ];


function taskCard(task) {

  const days =
    daysUntil(
      task.dueDate
    );

  const urgent =
    task.status !== 'completed' &&
    days <= 2;

  return `

    <article
      class="task-card"
    >

      <div class="task-main">

        <button
          class="task-check ${
            task.status === 'completed'
              ? 'done'
              : ''
          }"
          data-action="toggle-task"
          data-id="${task.id}"
          aria-label="Completar"
        >

          ${
            task.status === 'completed'
              ? icon('check', 16)
              : ''
          }

        </button>


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
              ${formatShortDate(
                task.dueDate
              )}
            </span>

            <span>
              ${icon('clock', 14)}
              ${Number(
                task.minutes || 30
              )} min
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
                  <span
                    class="danger-text"
                  >
                    Urgent
                  </span>
                `
                : ''
            }

          </div>

        </div>

      </div>


      <div class="task-actions">

        <span
          class="status ${
            task.status
          }"
        >
          ${statusLabel(
            task.status
          )}
        </span>


        <button
          class="icon-btn"
          data-action="edit-task"
          data-id="${task.id}"
          title="Editar"
        >
          ${icon('edit', 16)}
        </button>


        <button
          class="icon-btn danger"
          data-action="delete-task"
          data-id="${task.id}"
          title="Eliminar"
        >
          ${icon('trash', 16)}
        </button>

      </div>

    </article>

  `;

}


function dashboardView() {

  const pending =
    state.tasks.filter(
      task =>
        task.status !==
        'completed'
    );


  const completed =
    state.tasks.filter(
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
      .filter(
        exam =>
          daysUntil(
            exam.date
          ) >= 0
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      )
      .slice(0, 3);


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


  /* DEMÀ */

  const tomorrow =
    new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );


  const tomorrowISO =
    new Date(
      tomorrow.getTime() -
      tomorrow.getTimezoneOffset() *
      60000
    )
      .toISOString()
      .slice(0, 10);


  const tomorrowLabel =
    new Intl.DateTimeFormat(
      'ca-ES',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }
    ).format(
      tomorrow
    );


  const dayMap = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday'
  };


  const tomorrowEvents =
    state.scheduleEvents
      .filter(
        event =>
          event.day ===
          dayMap[
            tomorrow.getDay()
          ]
      )
      .sort(
        (a, b) =>
          String(
            a.startTime || ''
          ).localeCompare(
            String(
              b.startTime || ''
            )
          )
      );


  const tomorrowTasks =
    pending
      .filter(
        task =>
          task.dueDate ===
          tomorrowISO
      );


  const tomorrowItems = [

    ...tomorrowEvents.map(
      event => ({
        kind: 'Horari',
        time: event.startTime,
        title: event.title,
        meta:
          event.subject ||
          scheduleTypeLabel(
            event.type
          )
      })
    ),

    ...tomorrowTasks.map(
      task => ({
        kind: 'Tasca',
        time: 'Entrega',
        title: task.title,
        meta:
          task.subject ||
          'Sense assignatura'
      })
    )

  ].slice(
    0,
    7
  );


  return `

    <div
      class="page dashboard-page"
    >


      <!-- CAPÇALERA -->

      <section
        class="dashboard-intro"
      >

        <div>

          <p class="eyebrow">
            TAULER
          </p>

          <h2>
            El teu estudi,
            clar i al teu ritme.
          </h2>

          <p
            class="dashboard-intro-copy"
          >
            Tot el que necessita
            la teva atenció,
            sense soroll.
          </p>

        </div>


        <button
          class="btn primary"
          data-action="recalculate"
        >

          ${icon(
            'sparkles',
            17
          )}

          Recalcular amb IA

        </button>

      </section>


      <!-- DEMÀ -->

      <section
        class="tomorrow-panel"
      >

        <div
          class="tomorrow-heading"
        >

          <div>

            <p class="eyebrow">
              DEMÀ
            </p>

            <h2>
              ${esc(
                tomorrowLabel
              )}
            </h2>

          </div>


          <span
            class="tomorrow-count"
          >
            ${tomorrowItems.length}
          </span>

        </div>


        ${
          tomorrowItems.length

            ? `

              <div
                class="tomorrow-list"
              >

                ${tomorrowItems
                  .map(
                    item => `

                      <div
                        class="tomorrow-item"
                      >

                        <div
                          class="tomorrow-time"
                        >
                          ${esc(
                            item.time
                          )}
                        </div>

                        <div
                          class="tomorrow-item-main"
                        >

                          <strong>
                            ${esc(
                              item.title
                            )}
                          </strong>

                          <span>
                            ${esc(
                              item.meta
                            )}
                          </span>

                        </div>

                        <span
                          class="tomorrow-kind"
                        >
                          ${item.kind}
                        </span>

                      </div>

                    `
                  )
                  .join('')}

              </div>

            `

            : `

              <div
                class="tomorrow-empty"
              >

                <strong>
                  Demà està tranquil.
                </strong>

                <span>
                  No hi ha classes ni
                  entregues registrades.
                </span>

              </div>

            `
        }

      </section>


      <!-- ESTADÍSTIQUES -->

      <div
        class="stats-grid"
      >

        ${statCard(
          'Tasques pendents',
          pending.length,
          `${completed.length} completades`,
          'tasks'
        )}

        ${statCard(
          'Exàmens propers',
          upcomingExams.length,
          'Pròximes dates',
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
          'Pròxims 2 dies',
          'clock'
        )}

      </div>


      <!-- TASQUES + EXÀMENS -->

      <div
        class="two-col"
      >


        <section
          class="panel"
        >

          <div
            class="panel-head"
          >

            <div>

              <p class="eyebrow">
                ATENCIÓ
              </p>

              <h2>
                Què toca ara?
              </h2>

            </div>


            <button
              class="text-btn"
              data-page="tasks"
            >
              Veure tasques
              ${icon(
                'arrow',
                15
              )}
            </button>

          </div>


          <div class="list">

            ${
              (
                urgent.length
                  ? urgent
                  : pending
              )
                .slice(
                  0,
                  4
                )
                .map(
                  taskCard
                )
                .join('')

              ||

              emptyState(
                'Tot al dia',
                'No tens tasques pendents.'
              )
            }

          </div>

        </section>


        <section
          class="panel"
        >

          <div
            class="panel-head"
          >

            <div>

              <p class="eyebrow">
                EXÀMENS
              </p>

              <h2>
                Pròximes dates
              </h2>

            </div>


            <button
              class="text-btn"
              data-page="exams"
            >
              Veure exàmens
              ${icon(
                'arrow',
                15
              )}
            </button>

          </div>


          <div
            class="exam-list"
          >

            ${
              upcomingExams
                .map(
                  exam => `

                    <div
                      class="exam-row"
                    >

                      <div
                        class="date-box"
                      >

                        <strong>
                          ${
                            new Date(
                              `${exam.date}T12:00:00`
                            ).getDate()
                          }
                        </strong>

                        <span>
                          ${
                            new Intl.DateTimeFormat(
                              'ca-ES',
                              {
                                month:
                                  'short'
                              }
                            ).format(
                              new Date(
                                `${exam.date}T12:00:00`
                              )
                            )
                          }
                        </span>

                      </div>


                      <div>

                        <strong>
                          ${esc(
                            exam.subject
                          )}
                        </strong>

                        <span>
                          ${esc(
                            exam.syllabus ||
                            'Sense temari'
                          )}
                        </span>

                      </div>


                      <span
                        class="badge"
                      >
                        ${
                          difficultyLabel(
                            exam.difficulty
                          )
                        }
                      </span>

                    </div>

                  `
                )
                .join('')

              ||

              emptyState(
                'Cap examen',
                'Encara no hi ha exàmens registrats.'
              )
            }

          </div>

        </section>

      </div>


      <!-- IA -->

      <section
        class="panel ai-panel"
      >

        <div
          class="panel-head"
        >

          <div>

            <p class="eyebrow">
              IA D'ESTUDI
            </p>

            <h2>
              ${
                state.plan?.summary
                  ? 'La teva recomanació'
                  : 'Genera el teu pla'
              }
            </h2>

          </div>


          <button
            class="btn secondary"
            data-action="recalculate"
          >

            ${icon(
              'refresh',
              16
            )}

            Recalcular

          </button>

        </div>


        <p class="plan-summary">

          ${esc(
            state.plan?.summary ||
            'Afegeix les teves tasques i exàmens i TRIA t’ajudarà a ordenar-los.'
          )}

        </p>

      </section>


      <!-- PROFESSORAT -->

      <section
        class="teacher-quote dashboard-quote"
      >

        <span
          class="teacher-quote-label"
        >
          Vist des de l'aula
        </span>

        <blockquote>
          “${esc(
            teacherQuote
          )}”
        </blockquote>

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

    <div
      class="page"
    >

      <div
        class="toolbar"
      >

        <div>

          <p class="eyebrow">
            GESTIÓ
          </p>

          <h2>
            Les teves tasques
          </h2>

          <p class="muted">
            Organitza el que tens pendent
            i marca el que ja has acabat.
          </p>

        </div>


        <button
          class="btn primary"
          data-action="new-task"
        >

          ${icon(
            'plus',
            17
          )}

          Nova tasca

        </button>

      </div>


      <div
        class="task-list"
      >

        ${
          tasks.length

            ? tasks
                .map(
                  taskCard
                )
                .join('')

            : emptyState(
                'Encara no tens tasques',
                'Crea la primera i TRIA podrà començar a organitzar-te.'
              )
        }

      </div>

    </div>

  `;

}


/* =========================================================
   MODAL TASCA
   ========================================================= */

function openTaskModal(
  id = null
) {

  modalMode =
    'task';

  editingId =
    id;


  const task =
    id
      ? state.tasks.find(
          item =>
            item.id === id
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
    'TASCA';


  document.querySelector(
    '#modal-title'
  ).textContent =
    task
      ? 'Editar tasca'
      : 'Nova tasca';


  form.innerHTML = `

    <div
      class="form-grid"
    >


      <label
        class="full"
      >

        Nom de la tasca

        <input
          name="title"
          required
          value="${esc(
            task?.title || ''
          )}"
          placeholder="Ex. Exercicis de matemàtiques"
        >

      </label>


      <label>

        Assignatura

        <input
          name="subject"
          value="${esc(
            task?.subject || ''
          )}"
          placeholder="Ex. Matemàtiques"
        >

      </label>


      <label>

        Data de lliurament

        <input
          name="dueDate"
          type="date"
          required
          value="${esc(
            task?.dueDate ||
            todayISO()
          )}"
        >

      </label>


      <label>

        Temps estimat

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

          ${[
            [1, 'Baixa'],
            [2, 'Baixa'],
            [3, 'Mitjana'],
            [4, 'Alta'],
            [5, 'Alta']
          ]
            .map(
              ([value, label]) => `

                <option
                  value="${value}"
                  ${
                    Number(
                      task?.difficulty ||
                      3
                    ) === value
                      ? 'selected'
                      : ''
                  }
                >
                  ${label}
                </option>

              `
            )
            .join('')}

        </select>

      </label>


      <label>

        Estat

        <select
          name="status"
        >

          ${[
            [
              'pending',
              'Pendent'
            ],
            [
              'inprogress',
              'En curs'
            ],
            [
              'completed',
              'Completada'
            ]
          ]
            .map(
              ([value, label]) => `

                <option
                  value="${value}"
                  ${
                    (
                      task?.status ||
                      'pending'
                    ) === value
                      ? 'selected'
                      : ''
                  }
                >
                  ${label}
                </option>

              `
            )
            .join('')}

        </select>

      </label>


      <label
        class="full"
      >

        Descripció

        <textarea
          name="description"
          rows="4"
          placeholder="Què has de fer?"
        >${esc(
          task?.description ||
          ''
        )}</textarea>

      </label>


    </div>


    <div
      class="modal-actions"
    >

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


/* =========================================================
   GUARDAR TASCA
   ========================================================= */

function saveTaskFromForm(
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


  if (!title) {

    alert(
      'Escriu el nom de la tasca.'
    );

    return;

  }


  const task = {

    id:
      editingId ||
      uid('task'),

    title,

    subject:
      String(
        data.get(
          'subject'
        ) || ''
      ).trim(),

    description:
      String(
        data.get(
          'description'
        ) || ''
      ).trim(),

    dueDate:
      String(
        data.get(
          'dueDate'
        ) || todayISO()
      ),

    minutes:
      Number(
        data.get(
          'minutes'
        ) || 30
      ),

    difficulty:
      Number(
        data.get(
          'difficulty'
        ) || 3
      ),

    status:
      String(
        data.get(
          'status'
        ) ||
        'pending'
      )

  };


  if (editingId) {

    state.tasks =
      state.tasks.map(
        item =>
          item.id ===
          editingId
            ? task
            : item
      );

  } else {

    state.tasks.push(
      task
    );

  }


  saveState();

  closeModal();

  render();

}


/* =========================================================
   TOGGLE
   ========================================================= */

function toggleTask(
  id
) {

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
   ELIMINAR
   ========================================================= */

function deleteTask(
  id
) {

  const task =
    state.tasks.find(
      item =>
        item.id === id
    );


  if (!task) {
    return;
  }


  if (
    !confirm(
      `Vols eliminar «${task.title}»?`
    )
  ) {
    return;
  }


  state.tasks =
    state.tasks.filter(
      item =>
        item.id !== id
    );


  saveState();

  render();

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

    <div
      class="page"
    >

      <div
        class="toolbar"
      >

        <div>

          <p class="eyebrow">
            CALENDARI ACADÈMIC
          </p>

          <h2>
            Exàmens
          </h2>

          <p class="muted">
            Tingues presents les dates
            i el temari que has de preparar.
          </p>

        </div>


        <button
          class="btn primary"
          data-action="new-exam"
        >

          ${icon(
            'plus',
            17
          )}

          Nou examen

        </button>

      </div>


      <div
        class="exam-grid"
      >

        ${
          exams.length

            ? exams
                .map(
                  exam => `

                    <article
                      class="exam-card"
                    >

                      <div
                        class="exam-card-top"
                      >

                        <span
                          class="badge"
                        >
                          ${esc(
                            exam.subject
                          )}
                        </span>

                        <span
                          class="status pending"
                        >
                          ${formatDate(
                            exam.date
                          )}
                        </span>

                      </div>


                      <h3>
                        ${esc(
                          exam.subject
                        )}
                      </h3>


                      <p>
                        ${esc(
                          exam.syllabus ||
                          'Sense temari definit.'
                        )}
                      </p>


                      <div
                        class="exam-details"
                      >

                        <span>
                          Dificultat:
                          ${
                            difficultyLabel(
                              exam.difficulty
                            )
                          }
                        </span>

                        <span>
                          Temps disponible:
                          ${
                            Number(
                              exam.availableMinutes ||
                              0
                            )
                          } min
                        </span>

                      </div>


                      <div
                        class="card-actions"
                      >

                        <button
                          class="btn secondary"
                          data-action="edit-exam"
                          data-id="${exam.id}"
                        >

                          ${icon(
                            'edit',
                            15
                          )}

                          Editar

                        </button>


                        <button
                          class="btn ghost danger-btn"
                          data-action="delete-exam"
                          data-id="${exam.id}"
                        >

                          ${icon(
                            'trash',
                            15
                          )}

                          Eliminar

                        </button>

                      </div>

                    </article>

                  `
                )
                .join('')

            : emptyState(
                'No hi ha exàmens',
                'Afegeix el teu primer examen per començar a planificar-lo.'
              )
        }

      </div>

    </div>

  `;

}


/* =========================================================
   MODAL EXAMEN
   ========================================================= */

function openExamModal(
  id = null
) {

  modalMode =
    'exam';

  editingId =
    id;


  const exam =
    id
      ? state.exams.find(
          item =>
            item.id === id
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
    'EXAMEN';


  document.querySelector(
    '#modal-title'
  ).textContent =
    exam
      ? 'Editar examen'
      : 'Nou examen';


  form.innerHTML = `

    <div
      class="form-grid"
    >


      <label
        class="full"
      >

        Assignatura

        <input
          name="subject"
          required
          value="${esc(
            exam?.subject ||
            ''
          )}"
          placeholder="Ex. Història"
        >

      </label>


      <label>

        Data

        <input
          name="date"
          type="date"
          required
          value="${esc(
            exam?.date ||
            todayISO()
          )}"
        >

      </label>


      <label>

        Dificultat

        <select
          name="difficulty"
        >

          ${[
            [1, 'Baixa'],
            [2, 'Baixa'],
            [3, 'Mitjana'],
            [4, 'Alta'],
            [5, 'Alta']
          ]
            .map(
              ([value, label]) => `

                <option
                  value="${value}"
                  ${
                    Number(
                      exam?.difficulty ||
                      3
                    ) === value
                      ? 'selected'
                      : ''
                  }
                >
                  ${label}
                </option>

              `
            )
            .join('')}

        </select>

      </label>


      <label>

        Temps disponible

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


      <label
        class="full"
      >

        Temari

        <textarea
          name="syllabus"
          rows="4"
          placeholder="Temes que entren a l'examen"
        >${esc(
          exam?.syllabus ||
          ''
        )}</textarea>

      </label>


    </div>


    <div
      class="modal-actions"
    >

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


/* =========================================================
   GUARDAR EXAMEN
   ========================================================= */

function saveExamFromForm(
  event
) {

  event.preventDefault();


  const data =
    new FormData(
      event.currentTarget
    );


  const subject =
    String(
      data.get(
        'subject'
      ) || ''
    ).trim();


  if (!subject) {

    alert(
      'Escriu l’assignatura.'
    );

    return;

  }


  const exam = {

    id:
      editingId ||
      uid('exam'),

    subject,

    date:
      String(
        data.get(
          'date'
        ) ||
        todayISO()
      ),

    syllabus:
      String(
        data.get(
          'syllabus'
        ) || ''
      ).trim(),

    difficulty:
      Number(
        data.get(
          'difficulty'
        ) || 3
      ),

    availableMinutes:
      Number(
        data.get(
          'availableMinutes'
        ) || 0
      )

  };


  if (editingId) {

    state.exams =
      state.exams.map(
        item =>
          item.id ===
          editingId
            ? exam
            : item
      );

  } else {

    state.exams.push(
      exam
    );

  }


  saveState();

  closeModal();

  render();

}


/* =========================================================
   ELIMINAR EXAMEN
   ========================================================= */

function deleteExam(
  id
) {

  const exam =
    state.exams.find(
      item =>
        item.id === id
    );


  if (!exam) {
    return;
  }


  if (
    !confirm(
      `Vols eliminar l'examen de ${exam.subject}?`
    )
  ) {
    return;
  }


  state.exams =
    state.exams.filter(
      item =>
        item.id !== id
    );


  saveState();

  render();

}

/* =========================================================
   HORARI
   ========================================================= */

function scheduleTypeLabel(type) {

  return {
    class: 'Classe',
    study: 'Estudi',
    break: 'Descans',
    other: 'Altres'
  }[type] || 'Classe';

}


function scheduleView() {

  const days = [
    ['monday', 'Dilluns'],
    ['tuesday', 'Dimarts'],
    ['wednesday', 'Dimecres'],
    ['thursday', 'Dijous'],
    ['friday', 'Divendres']
  ];


  return `

    <div class="page">

      <div class="toolbar">

        <div>

          <p class="eyebrow">
            ORGANITZACIÓ
          </p>

          <h2>
            Horari
          </h2>

          <p class="muted">
            Puja una foto del teu horari
            i TRIA l'organitzarà.
          </p>

        </div>


        <div class="toolbar-actions">

          <label
            class="btn primary"
          >

            ${icon('camera', 17)}

            Analitzar horari

            <input
              id="schedule-image"
              type="file"
              accept="image/*"
              hidden
            >

          </label>


          <button
            class="btn secondary"
            data-action="clear-schedule"
          >
            Netejar
          </button>

        </div>

      </div>


      <section class="panel">

        <div class="panel-head">

          <div>

            <p class="eyebrow">
              SETMANA
            </p>

            <h2>
              El teu horari
            </h2>

          </div>

          <span
            class="badge"
          >
            ${
              state.scheduleEvents.length
            } elements
          </span>

        </div>


        <div
          class="schedule-grid"
        >

          ${days
            .map(
              ([id, label]) => {

                const events =
                  state.scheduleEvents
                    .filter(
                      event =>
                        event.day === id
                    )
                    .sort(
                      (a, b) =>
                        String(
                          a.startTime || ''
                        ).localeCompare(
                          String(
                            b.startTime || ''
                          )
                        )
                    );

                return `

                  <div
                    class="schedule-day"
                  >

                    <div
                      class="schedule-day-head"
                    >
                      ${label}
                    </div>

                    <div
                      class="schedule-day-list"
                    >

                      ${
                        events.length

                          ? events
                              .map(
                                event => `

                                  <div
                                    class="schedule-event"
                                  >

                                    <span
                                      class="schedule-event-time"
                                    >
                                      ${esc(
                                        event.startTime ||
                                        ''
                                      )}
                                      ${
                                        event.endTime
                                          ? `– ${esc(
                                              event.endTime
                                            )}`
                                          : ''
                                      }
                                    </span>

                                    <strong>
                                      ${esc(
                                        event.title ||
                                        'Classe'
                                      )}
                                    </strong>

                                    <small>
                                      ${esc(
                                        event.subject ||
                                        scheduleTypeLabel(
                                          event.type
                                        )
                                      )}
                                    </small>

                                  </div>

                                `
                              )
                              .join('')

                          : `
                            <div class="schedule-empty">
                              Sense classes
                            </div>
                          `
                      }

                    </div>

                  </div>

                `;

              }
            )
            .join('')}

        </div>

      </section>

    </div>

  `;

}


/* =========================================================
   PREPARAR IMATGE · SAFARI
   ========================================================= */

async function prepareScheduleImage(
  file
) {

  return new Promise(
    (resolve, reject) => {

      if (!file) {

        reject(
          new Error(
            'No s’ha seleccionat cap imatge.'
          )
        );

        return;

      }


      const objectUrl =
        URL.createObjectURL(
          file
        );


      const image =
        new Image();


      image.onload = () => {

        try {

          const maxWidth = 1800;

          const scale =
            Math.min(
              1,
              maxWidth /
              image.width
            );


          const width =
            Math.max(
              1,
              Math.round(
                image.width *
                scale
              )
            );


          const height =
            Math.max(
              1,
              Math.round(
                image.height *
                scale
              )
            );


          const canvas =
            document.createElement(
              'canvas'
            );


          canvas.width =
            width;

          canvas.height =
            height;


          const ctx =
            canvas.getContext(
              '2d'
            );


          if (!ctx) {

            throw new Error(
              'No s’ha pogut preparar la imatge.'
            );

          }


          ctx.drawImage(
            image,
            0,
            0,
            width,
            height
          );


          const dataUrl =
            canvas.toDataURL(
              'image/jpeg',
              0.82
            );


          URL.revokeObjectURL(
            objectUrl
          );


          const comma =
            dataUrl.indexOf(
              ','
            );


          if (comma === -1) {

            throw new Error(
              'Format d’imatge no vàlid.'
            );

          }


          resolve({

            mimeType:
              'image/jpeg',

            base64:
              dataUrl.slice(
                comma + 1
              )

          });


        } catch (error) {

          URL.revokeObjectURL(
            objectUrl
          );

          reject(error);

        }

      };


      image.onerror = () => {

        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            'Safari no ha pogut llegir aquesta imatge.'
          )
        );

      };


      image.src =
        objectUrl;

    }
  );

}


/* =========================================================
   ANALITZAR HORARI
   ========================================================= */

async function handleScheduleImage(
  file
) {

  try {

    const image =
      await prepareScheduleImage(
        file
      );


    showToast(
      'Analitzant l’horari...'
    );


    const response =
      await fetch(
        '/api/ai/schedule',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              image:
                image.base64,

              mimeType:
                image.mimeType
            })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        'No s’ha pogut analitzar l’horari.'
      );

    }


    pendingScheduleEvents =
      Array.isArray(
        data.events
      )
        ? data.events
        : [];


    openScheduleReview();

  } catch (error) {

    showToast(
      error.message ||
      'No s’ha pogut analitzar l’horari.',
      'error'
    );

  }

}


/* =========================================================
   REVISIÓ HORARI
   ========================================================= */

function openScheduleReview() {

  modalMode =
    'schedule-review';


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
    'IA · HORARI';


  document.querySelector(
    '#modal-title'
  ).textContent =
    'Revisa el teu horari';


  form.innerHTML = `

    <div
      class="schedule-review"
    >

      ${
        pendingScheduleEvents.length

          ? pendingScheduleEvents
              .map(
                (event, index) => `

                  <div
                    class="review-event"
                  >

                    <div>

                      <strong>
                        ${esc(
                          event.title ||
                          'Classe'
                        )}
                      </strong>

                      <span>
                        ${esc(
                          event.day ||
                          ''
                        )}
                        ·
                        ${esc(
                          event.startTime ||
                          ''
                        )}
                        ${
                          event.endTime
                            ? `– ${esc(
                                event.endTime
                              )}`
                            : ''
                        }
                      </span>

                    </div>


                    <button
                      type="button"
                      class="icon-btn danger"
                      data-action="remove-review-event"
                      data-index="${index}"
                    >
                      ${icon(
                        'trash',
                        15
                      )}
                    </button>

                  </div>

                `
              )
              .join('')

          : emptyState(
              'No s’han detectat classes',
              'Prova amb una foto més clara.'
            )
      }

    </div>


    <div
      class="modal-actions"
    >

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
        ${
          pendingScheduleEvents.length
            ? ''
            : 'disabled'
        }
      >
        Guardar horari
      </button>

    </div>

  `;


  form.onsubmit =
    saveScheduleReview;


  modal.classList.remove(
    'hidden'
  );

}


function saveScheduleReview(
  event
) {

  event.preventDefault();


  state.scheduleEvents =
    pendingScheduleEvents.map(
      event => ({
        ...event,
        id:
          event.id ||
          uid('schedule')
      })
    );


  saveState();

  pendingScheduleEvents =
    [];

  closeModal();

  render();

  showToast(
    'Horari guardat.'
  );

}

/* =========================================================
   PLANIFICADOR
   ========================================================= */

function plannerView() {

  const today =
    new Date();


  const weekStart =
    new Date(today);

  const day =
    weekStart.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  weekStart.setDate(
    weekStart.getDate() +
    diff
  );


  const days = [];


  for (
    let i = 0;
    i < 7;
    i++
  ) {

    const date =
      new Date(
        weekStart
      );

    date.setDate(
      weekStart.getDate() +
      i
    );

    const iso =
      new Date(
        date.getTime() -
        date.getTimezoneOffset() *
        60000
      )
        .toISOString()
        .slice(0, 10);


    days.push({
      date,
      iso
    });

  }


  return `

    <div class="page">

      <div class="toolbar">

        <div>

          <p class="eyebrow">
            PLANIFICACIÓ
          </p>

          <h2>
            Aquesta setmana
          </h2>

          <p class="muted">
            Organitza les hores d’estudi
            al voltant de les teves obligacions.
          </p>

        </div>


        <button
          class="btn primary"
          data-action="recalculate"
        >

          ${icon(
            'sparkles',
            17
          )}

          Crear pla amb IA

        </button>

      </div>


      <section
        class="panel planner-panel"
      >

        <div
          class="week-grid"
        >

          ${days
            .map(
              ({ date, iso }) => {

                const tasks =
                  state.tasks.filter(
                    task =>
                      task.dueDate ===
                      iso
                  );


                const events =
                  state.scheduleEvents
                    .filter(
                      event =>
                        event.day ===
                        [
                          'sunday',
                          'monday',
                          'tuesday',
                          'wednesday',
                          'thursday',
                          'friday',
                          'saturday'
                        ][
                          date.getDay()
                        ]
                    );


                return `

                  <div
                    class="week-day"
                  >

                    <div
                      class="week-day-head"
                    >

                      <span>
                        ${
                          new Intl.DateTimeFormat(
                            'ca-ES',
                            {
                              weekday:
                                'short'
                            }
                          ).format(
                            date
                          )
                        }
                      </span>

                      <strong>
                        ${date.getDate()}
                      </strong>

                    </div>


                    <div
                      class="week-day-body"
                    >

                      ${
                        events
                          .slice(
                            0,
                            3
                          )
                          .map(
                            event => `

                              <div
                                class="planner-item class"
                              >

                                <small>
                                  ${
                                    esc(
                                      event.startTime ||
                                      ''
                                    )
                                  }
                                </small>

                                <strong>
                                  ${
                                    esc(
                                      event.title
                                    )
                                  }
                                >

                              </div>

                            `
                          )
                          .join('')
                      }


                      ${
                        tasks
                          .slice(
                            0,
                            4
                          )
                          .map(
                            task => `

                              <div
                                class="planner-item task"
                              >

                                <small>
                                  Entrega
                                </small>

                                <strong>
                                  ${
                                    esc(
                                      task.title
                                    )
                                  }
                                >

                              </div>

                            `
                          )
                          .join('')
                      }


                      ${
                        !events.length &&
                        !tasks.length
                          ? `
                            <div
                              class="planner-empty"
                            >
                              Lliure
                            </div>
                          `
                          : ''
                      }

                    </div>

                  </div>

                `;

              }
            )
            .join('')}

        </div>

      </section>


      ${
        state.plan
          ? `

            <section
              class="panel"
            >

              <div
                class="panel-head"
              >

                <div>

                  <p class="eyebrow">
                    PLA IA
                  </p>

                  <h2>
                    Recomanació actual
                  </h2>

                </div>

              </div>


              <p
                class="plan-summary"
              >
                ${esc(
                  state.plan.summary ||
                  ''
                )}
              </p>


              ${
                Array.isArray(
                  state.plan.sessions
                )
                  ? `
                    <div
                      class="plan-sessions"
                    >

                      ${state.plan.sessions
                        .map(
                          session => `

                            <div
                              class="plan-session"
                            >

                              <strong>
                                ${esc(
                                  session.title ||
                                  session.subject ||
                                  'Sessió d’estudi'
                                )}
                              </strong>

                              <span>
                                ${
                                  Number(
                                    session.minutes ||
                                    0
                                  )
                                } min
                              </span>

                            </div>

                          `
                        )
                        .join('')}

                    </div>
                  `
                  : ''
              }

            </section>

          `
          : ''
      }

    </div>

  `;

}


/* =========================================================
   GENERAR PLA IA
   ========================================================= */

async function recalculatePlan() {

  if (
    !state.tasks.length &&
    !state.exams.length
  ) {

    showToast(
      'Afegeix tasques o exàmens abans de crear el pla.',
      'error'
    );

    return;

  }


  showToast(
    'TRIA està preparant el teu pla...'
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
        'No s’ha pogut crear el pla.'
      );

    }


    state.plan =
      data.plan ||
      data;


    saveState();

    render();

    showToast(
      'Pla actualitzat.'
    );

  } catch (error) {

    showToast(
      error.message ||
      'Error creant el pla.',
      'error'
    );

  }

}

/* =========================================================
   CHAT IA
   ========================================================= */

function chatView() {

  return `

    <div
      class="page chat-page"
    >

      <div
        class="chat-intro"
      >

        <p class="eyebrow">
          ASSISTENT
        </p>

        <h2>
          Parla amb TRIA
        </h2>

        <p class="muted">
          Pregunta sobre les teves tasques,
          exàmens o organització.
        </p>

      </div>


      <section
        class="chat-panel panel"
      >

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
                          message.role
                        }"
                      >

                        <div
                          class="chat-bubble"
                        >
                          ${
                            message.role ===
                            'assistant'
                              ? chatMarkdown(
                                  message.content
                                )
                              : esc(
                                  message.content
                                )
                          }
                        </div>

                      </div>

                    `
                  )
                  .join('')

              : `

                <div
                  class="chat-empty"
                >

                  <div
                    class="chat-empty-icon"
                  >
                    ${icon(
                      'sparkles',
                      22
                    )}
                  </div>

                  <strong>
                    Com et puc ajudar?
                  </strong>

                  <span>
                    Per exemple: «Què hauria
                    de fer primer aquesta setmana?»
                  </span>

                </div>

              `
          }

        </div>


        <form
          id="chat-form"
          class="chat-form"
        >

          <input
            id="chat-input"
            type="text"
            autocomplete="off"
            placeholder="Escriu la teva pregunta..."
            required
          >


          <button
            class="btn primary"
            type="submit"
          >

            ${icon(
              'arrow',
              17
            )}

            Enviar

          </button>

        </form>

      </section>

    </div>

  `;

}


/* =========================================================
   ENVIAR CHAT
   ========================================================= */

async function sendChatMessage(
  message
) {

  const clean =
    String(
      message || ''
    ).trim();


  if (!clean) {
    return;
  }


  state.chat.push({
    role: 'user',
    content: clean
  });


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

              message:
                clean,

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
        'No s’ha pogut obtenir una resposta.'
      );

    }


    state.chat.push({

      role:
        'assistant',

      content:
        data.answer ||
        'No he pogut generar una resposta.'

    });


    saveState();

    render();


  } catch (error) {

    state.chat.push({

      role:
        'assistant',

      content:
        `No he pogut respondre ara mateix: ${
          error.message
        }`

    });


    saveState();

    render();

  }

}

/* =========================================================
   PROGRÉS
   ========================================================= */

function progressView() {

  const total =
    state.tasks.length;

  const completed =
    state.tasks.filter(
      task =>
        task.status ===
        'completed'
    ).length;


  const pending =
    total -
    completed;


  const minutes =
    state.tasks.reduce(
      (sum, task) =>
        sum +
        Number(
          task.minutes || 0
        ),
      0
    );


  const completedMinutes =
    state.tasks
      .filter(
        task =>
          task.status ===
          'completed'
      )
      .reduce(
        (sum, task) =>
          sum +
          Number(
            task.minutes || 0
          ),
        0
      );


  const percentage =
    total
      ? Math.round(
          completed /
          total *
          100
        )
      : 0;


  return `

    <div class="page">

      <div class="toolbar">

        <div>

          <p class="eyebrow">
            EVOLUCIÓ
          </p>

          <h2>
            El teu progrés
          </h2>

          <p class="muted">
            Una visió senzilla de la feina
            que ja has fet.
          </p>

        </div>

      </div>


      <div
        class="stats-grid"
      >

        ${statCard(
          'Tasques totals',
          total,
          `${completed} completades`,
          'tasks'
        )}

        ${statCard(
          'Pendents',
          pending,
          'Per acabar',
          'clock'
        )}

        ${statCard(
          'Temps completat',
          `${completedMinutes} min`,
          `de ${minutes} min previstos`,
          'check'
        )}

        ${statCard(
          'Progrés',
          `${percentage}%`,
          'Tasques completades',
          'progress'
        )}

      </div>


      <section
        class="panel progress-panel"
      >

        <div
          class="panel-head"
        >

          <div>

            <p class="eyebrow">
              OBJECTIU
            </p>

            <h2>
              Progrés general
            </h2>

          </div>

          <strong
            class="progress-number"
          >
            ${percentage}%
          </strong>

        </div>


        <div
          class="progress-track"
        >

          <div
            class="progress-fill"
            style="width:${percentage}%"
          ></div>

        </div>


        <p class="muted">
          ${
            percentage === 100
              ? 'Has completat totes les tasques.'
              : `Has completat ${completed} de ${total} tasques.`
          }
        </p>

      </section>


      <section
        class="panel"
      >

        <div
          class="panel-head"
        >

          <div>

            <p class="eyebrow">
              TASQUES
            </p>

            <h2>
              Activitat recent
            </h2>

          </div>

        </div>


        <div class="list">

          ${
            state.tasks.length

              ? [...state.tasks]
                  .sort(
                    (a, b) =>
                      b.dueDate.localeCompare(
                        a.dueDate
                      )
                  )
                  .slice(
                    0,
                    6
                  )
                  .map(
                    taskCard
                  )
                  .join('')

              : emptyState(
                  'Sense activitat',
                  'Quan afegeixis tasques apareixeran aquí.'
                )
          }

        </div>

      </section>

    </div>

  `;

}


/* =========================================================
   AVALUACIÓ
   ========================================================= */

function settingsView() {

  return `

    <div class="page">

      <div class="toolbar">

        <div>

          <p class="eyebrow">
            AVALUACIÓ
          </p>

          <h2>
            Ús de TRIA
          </h2>

          <p class="muted">
            Informació bàsica sobre com
            utilitzes l’organitzador.
          </p>

        </div>

      </div>


      <section
        class="panel"
      >

        <div
          class="evaluation-grid"
        >

          <div
            class="evaluation-card"
          >

            <span>
              Tasques creades
            </span>

            <strong>
              ${state.tasks.length}
            </strong>

          </div>


          <div
            class="evaluation-card"
          >

            <span>
              Tasques completades
            </span>

            <strong>
              ${
                state.tasks.filter(
                  task =>
                    task.status ===
                    'completed'
                ).length
              }
            </strong>

          </div>


          <div
            class="evaluation-card"
          >

            <span>
              Exàmens registrats
            </span>

            <strong>
              ${state.exams.length}
            </strong>

          </div>


          <div
            class="evaluation-card"
          >

            <span>
              Recomanació IA
            </span>

            <strong>
              ${
                state.plan
                  ? 'Sí'
                  : 'Encara no'
              }
            </strong>

          </div>

        </div>

      </section>


      <section
        class="panel"
      >

        <div
          class="panel-head"
        >

          <div>

            <p class="eyebrow">
              REGISTRE
            </p>

            <h2>
              Dades de l’activitat
            </h2>

          </div>

        </div>


        <div
          class="evaluation-list"
        >

          <div>
            Recomanació generada:
            ${
              state.plan
                ? 'Sí'
                : 'No'
            }
          </div>

          <div>
            Converses amb IA:
            ${state.chat.length}
          </div>

          <div>
            Elements d’horari:
            ${state.scheduleEvents.length}
          </div>

        </div>

      </section>


      <section
        class="panel evaluation-note"
      >

        <p>
          TRIA utilitza aquestes dades per
          organitzar l’estudi i mostrar el
          progrés dins de l’aplicació.
        </p>

        <p class="muted">
          Evita introduir informació personal
          que no sigui necessària per a
          l’organització acadèmica.
        </p>

      </section>

    </div>

  `;

}

/* =========================================================
   VISTES
   ========================================================= */

const views = {

  dashboard:
    dashboardView,

  tasks:
    tasksView,

  exams:
    examsView,

  schedule:
    scheduleView,

  planner:
    plannerView,

  chat:
    chatView,

  progress:
    progressView,

  settings:
    settingsView

};


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

        <div class="brand-mark">
          ${icon(
            'sparkles',
            24
          )}
        </div>

        <strong>
          TRIA
        </strong>

        <span>
          Carregant...
        </span>

      </div>

    `;

    return;

  }


  if (!currentUser) {

    root.innerHTML =
      authView();

    return;

  }


  root.innerHTML =
    layout();


  const content =
    document.querySelector(
      '#content'
    );


  const view =
    views[
      currentPage
    ] ||
    dashboardView;


  content.innerHTML =
    view();


  bindPageEvents();

}


/* =========================================================
   MODAL
   ========================================================= */

function closeModal() {

  const modal =
    document.querySelector(
      '#modal'
    );


  if (!modal) {
    return;
  }


  modal.classList.add(
    'hidden'
  );


  modalMode =
    null;

  editingId =
    null;

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = 'normal'
) {

  let toast =
    document.querySelector(
      '.tria-toast'
    );


  if (!toast) {

    toast =
      document.createElement(
        'div'
      );

    toast.className =
      'tria-toast';

    document.body.appendChild(
      toast
    );

  }


  toast.className =
    `tria-toast ${type}`;


  toast.textContent =
    message;


  requestAnimationFrame(
    () => {
      toast.classList.add(
        'show'
      );
    }
  );


  clearTimeout(
    toast._timeout
  );


  toast._timeout =
    setTimeout(
      () => {

        toast.classList.remove(
          'show'
        );

      },
      3000
    );

}


/* =========================================================
   EVENTOS GENERALS
   ========================================================= */

function bindPageEvents() {


  /* NAVEGACIÓ */

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


  /* ACCIONS */

  document
    .querySelectorAll(
      '[data-action]'
    )
    .forEach(
      element => {

        element.addEventListener(
          'click',
          async () => {

            const action =
              element.dataset.action;

            const id =
              element.dataset.id;


            switch (action) {


              case 'logout':

                await logout();

                break;


              case 'toggle-auth':

                toggleAuthMode();

                break;


              case 'new-task':

                openTaskModal();

                break;


              case 'edit-task':

                openTaskModal(
                  id
                );

                break;


              case 'delete-task':

                deleteTask(
                  id
                );

                break;


              case 'toggle-task':

                toggleTask(
                  id
                );

                break;


              case 'new-exam':

                openExamModal();

                break;


              case 'edit-exam':

                openExamModal(
                  id
                );

                break;


              case 'delete-exam':

                deleteExam(
                  id
                );

                break;


              case 'close-modal':

                closeModal();

                break;


              case 'recalculate':

                await recalculatePlan();

                break;


              case 'remove-review-event':

                pendingScheduleEvents.splice(
                  Number(
                    element.dataset.index
                  ),
                  1
                );

                openScheduleReview();

                break;

            }

          }
        );

      }
    );


  /* LOGIN */

  const authForm =
    document.querySelector(
      '#auth-form'
    );


  if (authForm) {

    authForm.addEventListener(
      'submit',
      handleAuth
    );

  }


  /* CHAT */

  const chatForm =
    document.querySelector(
      '#chat-form'
    );


  if (chatForm) {

    chatForm.addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        const input =
          document.querySelector(
            '#chat-input'
          );


        const message =
          input?.value?.trim();


        if (!message) {
          return;
        }


        input.value =
          '';


        await sendChatMessage(
          message
        );

      }
    );

  }


  /* HORARI */

  const scheduleInput =
    document.querySelector(
      '#schedule-image'
    );


  if (scheduleInput) {

    scheduleInput.addEventListener(
      'change',
      async event => {

        const file =
          event.target.files?.[0];


        if (!file) {
          return;
        }


        await handleScheduleImage(
          file
        );


        event.target.value =
          '';

      }
    );

  }


  /* MODAL BACKDROP */

  const modal =
    document.querySelector(
      '#modal'
    );


  if (modal) {

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          modal
        ) {

          closeModal();

        }

      }
    );

  }

}


/* =========================================================
   TECLAT
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
