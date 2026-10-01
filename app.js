import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';


/* =========================================================
   TRIA · NÚCLEO
   ========================================================= */

const SUPABASE_URL =
  'https://tzyslkglsywfiwuhtgrj.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_2SIxbdP7otKw74QV4s4J5g_K39-PjkG';

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


let state = structuredClone(defaultState);

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

function normaliseState(raw = {}) {

  const safe =
    raw && typeof raw === 'object'
      ? raw
      : {};

  return {
    ...structuredClone(defaultState),

    ...safe,

    tasks:
      Array.isArray(safe.tasks)
        ? safe.tasks
        : [],

    exams:
      Array.isArray(safe.exams)
        ? safe.exams
        : [],

    scheduleEvents:
      Array.isArray(safe.scheduleEvents)
        ? safe.scheduleEvents
        : [],

    chat:
      Array.isArray(safe.chat)
        ? safe.chat
        : [],

    settings: {
      ...structuredClone(
        defaultState.settings
      ),

      ...(
        safe.settings &&
        typeof safe.settings === 'object'
          ? safe.settings
          : {}
      )
    }
  };

}


function storageKeyForUser(userId) {

  return userId
    ? `${STORAGE_KEY}:user:${userId}`
    : STORAGE_KEY;

}


function readStorage(key) {

  try {

    const raw =
      localStorage.getItem(key);

    return raw
      ? normaliseState(
          JSON.parse(raw)
        )
      : null;

  } catch {

    return null;

  }

}


function loadState() {

  return (
    readStorage(STORAGE_KEY) ||
    structuredClone(defaultState)
  );

}


function loadUserState(userId) {

  const userKey =
    storageKeyForUser(userId);

  const existing =
    readStorage(userKey);

  if (existing) {

    return existing;

  }


  /*
   * Migra les dades antigues
   * d'una versió anterior de TRIA.
   */

  const legacy =
    readStorage(STORAGE_KEY);

  if (legacy) {

    try {

      localStorage.setItem(
        userKey,
        JSON.stringify(legacy)
      );

    } catch {

      /*
       * Si el navegador bloqueja
       * l'emmagatzematge, continuem
       * amb les dades en memòria.
       */

    }

    return legacy;

  }


  return structuredClone(
    defaultState
  );

}


function saveState() {

  state =
    normaliseState(state);

  try {

    const key =
      currentUser
        ? storageKeyForUser(
            currentUser.id
          )
        : STORAGE_KEY;

    localStorage.setItem(
      key,
      JSON.stringify(
        normaliseState(state)
      )
    );

  } catch (error) {

    console.warn(
      'No s’ha pogut desar l’estat local de TRIA.',
      error
    );

  }

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
      data?.session?.user ||
      null;


    state =
      currentUser
        ? loadUserState(
            currentUser.id
          )
        : structuredClone(
            defaultState
          );


  } catch (error) {

    console.error(
      'Error de Supabase:',
      error
    );

    currentUser = null;

    state =
      structuredClone(
        defaultState
      );

  }


  authReady = true;

  render();


  supabase.auth.onAuthStateChange(
    (_event, session) => {

      currentUser =
        session?.user ||
        null;


      state =
        currentUser
          ? loadUserState(
              currentUser.id
            )
          : structuredClone(
              defaultState
            );


      authReady = true;

      render();

    }
  );

}


async function handleAuth(event) {

  event.preventDefault();


  const email =
    document
      .querySelector(
        '#auth-email'
      )
      ?.value
      .trim();


  const password =
    document
      .querySelector(
        '#auth-password'
      )
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


  if (
    !errorBox ||
    !successBox ||
    !button
  ) {

    return;

  }


  if (
    !email ||
    !password
  ) {

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
      error?.message ||
      ''
    );


  const lower =
    message.toLowerCase();


  if (
    lower.includes(
      'invalid login credentials'
    )
  ) {

    return (
      'El correu o la contrasenya no són correctes.'
    );

  }


  if (
    lower.includes(
      'email not confirmed'
    )
  ) {

    return (
      'Primer has de confirmar el teu correu electrònic.'
    );

  }


  if (
    lower.includes(
      'user already registered'
    )
  ) {

    return (
      'Aquest correu ja té un compte.'
    );

  }


  if (
    lower.includes(
      'password should be at least'
    )
  ) {

    return (
      'La contrasenya ha de tenir almenys 6 caràcters.'
    );

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

  try {

    await supabase.auth.signOut();

  } catch (error) {

    console.error(
      'Error tancant sessió:',
      error
    );

  }


  currentUser = null;

  state =
    structuredClone(
      defaultState
    );

  currentPage =
    'dashboard';

  modalMode = null;

  editingId = null;

  pendingScheduleEvents = [];

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

  const date =
    new Date();

  const offset =
    date.getTimezoneOffset();


  return new Date(
    date.getTime() -
    offset * 60000
  )
    .toISOString()
    .slice(
      0,
      10
    );

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
      target -
      Date.now()
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

    pending:
      'Pendent',

    inprogress:
      'En curs',

    completed:
      'Completada'

  }[
    status
  ] || 'Pendent';

}


function difficultyLabel(value) {

  return {

    1:
      'Baixa',

    2:
      'Baixa',

    3:
      'Mitjana',

    4:
      'Alta',

    5:
      'Alta'

  }[
    Number(value)
  ] || 'Mitjana';

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
   LOGIN / REGISTRE
   ========================================================= */

function authView() {

  const isLogin =
    authMode === 'login';

  return `
    <main class="auth-screen">

      <section class="auth-card">

        <div class="auth-brand">

          <div class="auth-mark">
            ${icon('sparkles', 19)}
          </div>

          <div class="auth-brand-text">

            <strong>
              ${APP_NAME}
            </strong>

            <span>
              ${APP_AUTHOR}
            </span>

          </div>

        </div>


        <div class="auth-heading">

          <p class="eyebrow">
            ${isLogin ? 'BENvingut' : 'NOU COMPTE'}
          </p>

          <h1>
            ${
              isLogin
                ? 'Continua amb el teu estudi.'
                : 'Crea el teu espai d’estudi.'
            }
          </h1>

          <p>
            Organitza tasques, exàmens,
            horari i temps d’estudi des d’un
            únic lloc.
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
              placeholder="tu@correu.com"
              required
            >

          </label>


          <label>

            Contrasenya

            <input
              id="auth-password"
              type="password"
              autocomplete="${
                isLogin
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
            role="alert"
          ></div>


          <div
            id="auth-success"
            class="auth-message success hidden"
            role="status"
          ></div>


          <button
            type="submit"
            class="btn primary auth-submit"
          >
            ${
              isLogin
                ? 'Iniciar sessió'
                : 'Crear compte'
            }
          </button>

        </form>


        <div class="auth-switch">

          <span>
            ${
              isLogin
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
              isLogin
                ? 'Crear compte'
                : 'Iniciar sessió'
            }
          </button>

        </div>

      </section>

    </main>
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

  const titles = {

    dashboard:
      'Tauler',

    tasks:
      'Tasques',

    exams:
      'Exàmens',

    schedule:
      'Horari',

    planner:
      'Planificador',

    chat:
      "IA d'estudi",

    progress:
      'Progrés',

    settings:
      'Avaluació'

  };


  return (
    titles[currentPage] ||
    'Tauler'
  );

}


/* =========================================================
   LAYOUT PRINCIPAL
   ========================================================= */

function layout(content) {

  const navigation =
    navItems()
      .map(
        ([
          id,
          label,
          iconName
        ]) => `
          <button
            type="button"
            class="nav-item ${
              currentPage === id
                ? 'active'
                : ''
            }"
            data-page="${id}"
          >

            ${icon(iconName, 16)}

            <span>
              ${esc(label)}
            </span>

          </button>
        `
      )
      .join('');


  const pageAction = {

    tasks: `
      <button
        type="button"
        class="btn primary"
        data-action="new-task"
      >
        ${icon('plus', 16)}
        Nova tasca
      </button>
    `,

    exams: `
      <button
        type="button"
        class="btn primary"
        data-action="new-exam"
      >
        ${icon('plus', 16)}
        Nou examen
      </button>
    `,

    schedule: `
      <button
        type="button"
        class="btn secondary"
        data-action="scroll-schedule-upload"
      >
        ${icon('camera', 15)}
        Analitzar horari
      </button>
    `,

    planner: `
      <button
        type="button"
        class="btn primary"
        data-action="recalculate-plan"
      >
        ${icon('sparkles', 15)}
        Crear pla amb IA
      </button>
    `,

    chat: `
      <div class="ai-top-status">
        <span class="status-dot"></span>
        <span>Gemini connectat</span>
      </div>
    `,

    dashboard: `
      <button
        type="button"
        class="btn primary"
        data-action="recalculate-plan"
      >
        ${icon('sparkles', 15)}
        Recalcular amb IA
      </button>
    `

  }[currentPage] || '';


  return `
    <div class="app-shell">


      <!-- ================================================
           SIDEBAR
           ================================================ -->

      <aside class="sidebar">

        <div class="brand">

          <div class="brand-mark">
            ${icon('sparkles', 17)}
          </div>


          <div class="brand-copy">

            <strong>
              ${APP_NAME}
            </strong>

            <span>
              ${APP_AUTHOR}
            </span>

          </div>


          <img
            class="school-logo"
            src="/logo-institut.png"
            alt=""
            aria-hidden="true"
          >

        </div>


        <nav
          class="nav"
          aria-label="Navegació principal"
        >

          ${navigation}

        </nav>


        <div class="sidebar-bottom">

          <div class="ai-status">

            <span class="status-dot"></span>

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
            type="button"
            class="logout-btn"
            data-action="logout"
          >
            Tancar sessió
          </button>

        </div>

      </aside>


      <!-- ================================================
           MAIN
           ================================================ -->

      <main class="main">


        <header class="topbar">

          <div>

            <p class="eyebrow">
              ${APP_NAME}
            </p>

            <h1>
              ${esc(pageTitle())}
            </h1>

          </div>


          <div class="top-actions">

            ${pageAction}

          </div>

        </header>


        <section id="content">
          ${content}
        </section>


      </main>


      <!-- ================================================
           MODAL
           ================================================ -->

      <div
        id="modal"
        class="modal-backdrop hidden"
        aria-hidden="true"
      ></div>


    </div>
  `;

}


/* =========================================================
   MODAL
   ========================================================= */

function buildModalHtml(
  title,
  body,
  actions = ''
) {

  return `
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >

      <div class="modal-head">

        <div>

          <p class="eyebrow">
            TRIA
          </p>

          <h2 id="modal-title">
            ${esc(title)}
          </h2>

        </div>


        <button
          type="button"
          class="icon-btn"
          data-action="close-modal"
          aria-label="Tancar"
        >
          ${icon('close', 17)}
        </button>

      </div>


      <div class="modal-body">

        ${body}

      </div>


      ${
        actions
          ? `
            <div class="modal-actions">
              ${actions}
            </div>
          `
          : ''
      }

    </div>
  `;

}


/* =========================================================
   TARGETA D’ESTADÍSTICA
   ========================================================= */

function statCard(
  iconName,
  label,
  value,
  detail = ''
) {

  return `
    <article class="stat-card">

      <div class="stat-icon">
        ${icon(iconName, 16)}
      </div>


      <div>

        <span>
          ${esc(label)}
        </span>

        <strong>
          ${esc(value)}
        </strong>

        ${
          detail
            ? `
              <small>
                ${esc(detail)}
              </small>
            `
            : ''
        }

      </div>

    </article>
  `;

}


/* =========================================================
   ESTAT BUIT
   ========================================================= */

function emptyState(
  title,
  description,
  action = ''
) {

  return `
    <div class="empty large">

      ${icon('sparkles', 20)}

      <strong>
        ${esc(title)}
      </strong>

      <span>
        ${esc(description)}
      </span>

      ${
        action
          ? `
            <div style="margin-top:12px;">
              ${action}
            </div>
          `
          : ''
      }

    </div>
  `;

}


/* =========================================================
   DATA AUXILIAR
   ========================================================= */

function sortTasks(tasks) {

  return [...tasks].sort(
    (a, b) => {

      const aDate =
        a?.dueDate ||
        '9999-12-31';

      const bDate =
        b?.dueDate ||
        '9999-12-31';


      if (
        aDate !== bDate
      ) {

        return aDate.localeCompare(
          bDate
        );

      }


      return (
        Number(
          b?.difficulty || 0
        ) -
        Number(
          a?.difficulty || 0
        )
      );

    }
  );

}


function sortExams(exams) {

  return [...exams].sort(
    (a, b) => {

      const aDate =
        a?.date ||
        '9999-12-31';

      const bDate =
        b?.date ||
        '9999-12-31';


      return aDate.localeCompare(
        bDate
      );

    }
  );

}


function pendingTasks() {

  return sortTasks(
    state.tasks.filter(
      task =>
        task.status !==
        'completed'
    )
  );

}


function completedTasks() {

  return state.tasks.filter(
    task =>
      task.status ===
      'completed'
  );

}


function upcomingExams() {

  return sortExams(
    state.exams.filter(
      exam =>
        daysUntil(
          exam.date
        ) >= 0
    )
  );

}


function totalTaskMinutes(
  tasks = state.tasks
) {

  return tasks.reduce(
    (total, task) =>
      total +
      Number(
        task.estimatedMinutes ||
        0
      ),
    0
  );

}


function completedTaskMinutes() {

  return completedTasks().reduce(
    (total, task) =>
      total +
      Number(
        task.estimatedMinutes ||
        0
      ),
    0
  );

}


function progressPercent() {

  const total =
    state.tasks.length;

  if (!total) {

    return 0;

  }


  return Math.round(
    (
      completedTasks().length /
      total
    ) *
    100
  );

}


/* =========================================================
   SAFE DATE HELPERS
   ========================================================= */

function dateFromISO(
  value
) {

  if (!value) {

    return null;

  }


  const date =
    new Date(
      `${value}T12:00:00`
    );


  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;

}


function weekdayName(
  date
) {

  if (!(date instanceof Date)) {

    return '';

  }


  return new Intl.DateTimeFormat(
    'ca-ES',
    {
      weekday: 'long'
    }
  ).format(date);

}


function isoDay(
  date
) {

  if (!(date instanceof Date)) {

    return '';

  }


  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');


  return `${year}-${month}-${day}`;

}


/* =========================================================
   DOM HELPERS
   ========================================================= */

function getRoot() {

  return document.querySelector(
    '#root'
  );

}


function getModal() {

  return document.querySelector(
    '#modal'
  );

}


function setModal(
  html
) {

  const modal =
    getModal();

  if (!modal) {

    return;

  }


  modal.innerHTML =
    html;

  modal.classList.remove(
    'hidden'
  );

  modal.setAttribute(
    'aria-hidden',
    'false'
  );

}


function closeModal() {

  const modal =
    getModal();

  if (!modal) {

    return;

  }


  modal.classList.add(
    'hidden'
  );

  modal.setAttribute(
    'aria-hidden',
    'true'
  );

  modal.innerHTML =
    '';

  modalMode = null;

  editingId = null;

}


function scrollToElement(
  selector
) {

  const element =
    document.querySelector(
      selector
    );

  if (!element) {

    return;

  }


  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = 'success'
) {

  const old =
    document.querySelector(
      '.tria-toast'
    );

  if (old) {

    old.remove();

  }


  const toast =
    document.createElement(
      'div'
    );


  toast.className =
    `tria-toast ${type}`;


  toast.textContent =
    message;


  document.body.appendChild(
    toast
  );


  requestAnimationFrame(
    () => {
      toast.classList.add(
        'show'
      );
    }
  );


  setTimeout(
    () => {

      toast.classList.remove(
        'show'
      );


      setTimeout(
        () => {
          toast.remove();
        },
        180
      );

    },
    2600
  );

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

      const modal =
        getModal();

      if (
        modal &&
        !modal.classList.contains(
          'hidden'
        )
      ) {

        closeModal();

      }

    }

  }
);

/* =========================================================
   PARTE 3 · DASHBOARD
   ========================================================= */

const teacherQuotes = [
  `En l'àmbit estrictament acadèmic, no s'hauria d'utilitzar per adquirir coneixements, hàbits, esperit crític, etc.., només s'hauria d'utilitzar en àmbits on hi hagi un adult que indiqui el bon i mal ús d'aquesta eina.`,

  `Com a docent, crec que l'alumne ha d'utilitzar la IA per ajudar-se a entendre i practicar, no perquè li faci la feina. Primer ha d'intentar resoldre la tasca pel seu compte i, després, fer-la servir per demanar explicacions o pistes, generar exercicis i revisar el que ha fet, no per obtenir la resposta feta. També ha de contrastar sempre la informació, perquè la IA s'equivoca, i ser transparent sobre com l'ha utilitzada. En definitiva, la IA ajuda a aprendre quan et fa més capaç; si en depens per fer allò que hauries de saber fer sol, t'està perjudicant.`,

  `Com un reforç de l'aprenentatge, no com un aprenentatge. Hi ha d'haver un filtre humà.`,

  `El problema és que la IA és addictiva. Primer has de tractar d'esforçar-te a entendre les coses i resoldre-les per tu mateix. Llavors la IA pot resoldre't dubtes particulars. El problema és quan ni pensem què ens demanen, li passem el problema a la IA i enganxem sense el que ens dona, sense entendre-ho ni raonar-ho. Sovint, no fent la pregunta adequada i concisa i rebent resultats ambigus.`,

  `Tant per aprofundir sobre un tema com a l'hora de resoldre dubtes.`,

  `De manera ètica i responsable.`,

  `Com a ajuda per fomentar el pensament crític.`,

  `Per poder extreure informació de diferents formats de continguts i poder obtenir un resum endreçat a on estigui tot connectat.`,

  `Haurien d'aprendre les seves limitacions i contraindicacions i no haurien de recórrer a la IA com a primera opció.`
];

let teacherQuoteIndex = 0;


function tomorrowISO() {

  const date = new Date();

  date.setDate(
    date.getDate() + 1
  );

  return isoDay(date);

}


function formatTomorrowLabel() {

  const date =
    dateFromISO(
      tomorrowISO()
    );

  if (!date) {

    return 'Demà';

  }

  const weekday =
    new Intl.DateTimeFormat(
      'ca-ES',
      {
        weekday: 'long'
      }
    ).format(date);

  const day =
    date.getDate();

  const month =
    new Intl.DateTimeFormat(
      'ca-ES',
      {
        month: 'long'
      }
    ).format(date);

  return `${
    weekday.charAt(0).toUpperCase() +
    weekday.slice(1)
  }, ${day} d’${month}`;

}


function tomorrowSchedule() {

  const tomorrow =
    tomorrowISO();

  return state.scheduleEvents
    .filter(
      event =>
        event &&
        event.date === tomorrow
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

}


function tomorrowTasks() {

  const tomorrow =
    tomorrowISO();

  return sortTasks(
    state.tasks.filter(
      task =>
        task.status !== 'completed' &&
        task.dueDate === tomorrow
    )
  );

}


function dashboardTomorrowItems() {

 function dashboardTomorrowItems() {
  const tomorrow = new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const weekdayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];

  const tomorrowDay =
    weekdayNames[tomorrow.getDay()];

  const tomorrowISO =
    isoDay(tomorrow);

  const classes =
    state.scheduleEvents
      .filter(event =>
        String(event.day || '').toLowerCase() ===
        tomorrowDay
      )
      .sort((a, b) =>
        String(a.startTime || '')
          .localeCompare(
            String(b.startTime || '')
          )
      );

  const tasks =
    state.tasks
      .filter(task =>
        task.dueDate === tomorrowISO &&
        task.status !== 'completed'
      )
      .sort((a, b) =>
        String(a.dueDate || '')
          .localeCompare(
            String(b.dueDate || '')
          )
      );

  const exams =
    state.exams
      .filter(exam =>
        exam.date === tomorrowISO
      )
      .sort((a, b) =>
        String(a.date || '')
          .localeCompare(
            String(b.date || '')
          )
      );

  return {
    date: tomorrow,
    day: tomorrowDay,
    classes,
    tasks,
    exams
  };
}

function dashboardView() {

  const pending =
    pendingTasks();

  const completed =
    completedTasks();

  const exams =
    upcomingExams();

  const urgent =
    pending.filter(
      task =>
        daysUntil(
          task.dueDate
        ) <= 2
    );

  const completedMinutes =
    completedTaskMinutes();

  const totalMinutes =
    totalTaskMinutes();

  const percent =
    progressPercent();

  const tomorrowItems =
    dashboardTomorrowItems();

  const tomorrow =
    tomorrowISO();


  const quote =
    teacherQuotes[
      new Date().getDate() %
      teacherQuotes.length
    ];


  return `
    <div class="page dashboard-page">


      <section class="dashboard-intro">

        <div>

          <p class="eyebrow">
            AVUI
          </p>

          <h2>
            El teu estudi,<br>
            clar i al teu ritme.
          </h2>

          <p class="dashboard-intro-copy">
            Tot el que necessita la teva atenció,
            sense soroll.
          </p>

        </div>

      </section>


      <section class="tomorrow-card">

        <div class="tomorrow-head">

          <div>

            <p class="eyebrow">
              DEMÀ
            </p>

            <h3>
              ${esc(
                formatTomorrowLabel()
              )}
            </h3>

          </div>


          <span class="count-badge">
            ${tomorrowItems.length}
          </span>

        </div>


        ${
          tomorrowItems.length
            ? `
              <div class="tomorrow-list">

                ${tomorrowItems
                  .map(
                    item => `
                      <div class="tomorrow-row">

                        <span class="tomorrow-time">
                          ${
                            item.time ||
                            '—'
                          }
                        </span>


                        <div class="tomorrow-main">

                          <strong>
                            ${esc(
                              item.title
                            )}
                          </strong>

                          ${
                            item.subject
                              ? `
                                <small>
                                  ${esc(
                                    item.subject
                                  )}
                                </small>
                              `
                              : ''
                          }

                        </div>


                        <span class="tomorrow-type">
                          ${
                            item.type ===
                            'task'
                              ? 'TASCA'
                              : 'HORARI'
                          }
                        </span>

                      </div>
                    `
                  )
                  .join('')}

              </div>
            `
            : `
              <div class="tomorrow-empty">

                <div class="empty-icon">
                  ${icon(
                    'calendar',
                    20
                  )}
                </div>

                <div>

                  <strong>
                    Demà està lliure.
                  </strong>

                  <span>
                    No tens cap classe ni tasca
                    registrada per demà.
                  </span>

                </div>

              </div>
            `
        }

      </section>


      <section class="stats-grid">

        ${statCard(
          'tasks',
          'Tasques pendents',
          String(
            pending.length
          ),
          `${completed.length} completades`
        )}

        ${statCard(
          'exams',
          'Exàmens propers',
          String(
            exams.length
          ),
          'Properes dates'
        )}

        ${statCard(
          'progress',
          'Progrés',
          `${percent}%`,
          `${completedMinutes} / ${totalMinutes} min`
        )}

        ${statCard(
          'clock',
          'Urgents',
          String(
            urgent.length
          ),
          'Pròxims 2 dies'
        )}

      </section>


      <section class="dashboard-columns">


        <article class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                ATENCIÓ
              </p>

              <h3>
                Què toca ara?
              </h3>

            </div>


            <button
              type="button"
              class="link-btn"
              data-page="tasks"
            >
              Veure tasques
              ${icon(
                'arrow',
                13
              )}
            </button>

          </div>


          ${
            pending.length
              ? `
                <div class="dashboard-task-list">

                  ${pending
                    .slice(0, 4)
                    .map(
                      task =>
                        taskCard(
                          task,
                          true
                        )
                    )
                    .join('')}

                </div>
              `
              : `
                <div class="panel-empty">

                  ${icon(
                    'check',
                    20
                  )}

                  <strong>
                    No tens tasques pendents.
                  </strong>

                  <span>
                    Quan n’afegeixis, TRIA
                    t’ajudarà a ordenar-les.
                  </span>

                </div>
              `
          }

        </article>


        <article class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                EXÀMENS
              </p>

              <h3>
                Properes dates
              </h3>

            </div>


            <button
              type="button"
              class="link-btn"
              data-page="exams"
            >
              Veure exàmens
              ${icon(
                'arrow',
                13
              )}
            </button>

          </div>


          ${
            exams.length
              ? `
                <div class="upcoming-exams">

                  ${exams
                    .slice(0, 4)
                    .map(
                      exam => `
                        <div class="exam-mini">

                          <div>

                            <strong>
                              ${esc(
                                exam.subject ||
                                'Examen'
                              )}
                            </strong>

                            <span>
                              ${esc(
                                exam.title ||
                                'Examen'
                              )}
                            </span>

                          </div>

                          <time>
                            ${esc(
                              formatShortDate(
                                exam.date
                              )
                            )}
                          </time>

                        </div>
                      `
                    )
                    .join('')}

                </div>
              `
              : `
                <div class="panel-empty">

                  ${icon(
                    'calendar',
                    20
                  )}

                  <strong>
                    No hi ha exàmens.
                  </strong>

                  <span>
                    Afegeix-ne un per començar
                    a preparar-lo.
                  </span>

                </div>
              `
          }

        </article>


      </section>


      <section class="ai-recommendation">

        <div class="ai-recommendation-icon">
          ${icon(
            'sparkles',
            18
          )}
        </div>


        <div>

          <p class="eyebrow">
            RECOMANACIÓ DE TRIA
          </p>

          <h3>
            ${
              pending.length
                ? `Comença per «${esc(
                    pending[0].title
                  )}».`
                : 'Afegeix una tasca per començar.'
            }
          </h3>

          <p>
            ${
              pending.length
                ? `És la primera tasca de la teva llista segons la data de lliurament.`
                : `TRIA necessita algunes dades acadèmiques per poder ordenar el teu estudi.`
            }
          </p>

        </div>

      </section>


      ${teacherQuoteView()}
      </div>

    </section>
  `;
}
   
/* =========================================================
   PARTE 4 · TASQUES
   ========================================================= */

function taskCard(
  task,
  compact = false
) {

  const status =
    task.status ||
    'pending';

  const due =
    task.dueDate
      ? formatShortDate(
          task.dueDate
        )
      : 'Sense data';


  const urgency =
    task.dueDate
      ? daysUntil(
          task.dueDate
        )
      : 999;


  let urgencyClass = '';

  if (
    urgency < 0
  ) {

    urgencyClass =
      'overdue';

  } else if (
    urgency <= 2
  ) {

    urgencyClass =
      'urgent';

  }


  return `
    <article
      class="task-card ${compact ? 'compact' : ''} ${urgencyClass}"
    >

      <button
        type="button"
        class="task-check ${
          status === 'completed'
            ? 'checked'
            : ''
        }"
        data-action="toggle-task"
        data-id="${esc(
          task.id
        )}"
        aria-label="${
          status === 'completed'
            ? 'Marcar com a pendent'
            : 'Marcar com a completada'
        }"
      >
        ${
          status === 'completed'
            ? icon(
                'check',
                14
              )
            : ''
        }
      </button>


      <div class="task-main">

        <div class="task-title-row">

          <h3 class="${
            status === 'completed'
              ? 'completed'
              : ''
          }">
            ${esc(
              task.title ||
              'Tasca sense nom'
            )}
          </h3>


          ${
            task.subject
              ? `
                <span class="subject-pill">
                  ${esc(
                    task.subject
                  )}
                </span>
              `
              : ''
          }

        </div>


        ${
          !compact &&
          task.description
            ? `
              <p>
                ${esc(
                  task.description
                )}
              </p>
            `
            : ''
        }


        <div class="task-meta">

          <span>
            ${icon(
              'calendar',
              12
            )}
            ${esc(due)}
          </span>


          ${
            task.estimatedMinutes
              ? `
                <span>
                  ${icon(
                    'clock',
                    12
                  )}
                  ${esc(
                    String(
                      task.estimatedMinutes
                    )
                  )} min
                </span>
              `
              : ''
          }


          <span>
            ${icon(
              'info',
              12
            )}
            ${esc(
              difficultyLabel(
                task.difficulty
              )
            )}
          </span>

        </div>

      </div>


      <div class="task-actions">

        <button
          type="button"
          class="icon-btn small"
          data-action="edit-task"
          data-id="${esc(
            task.id
          )}"
          aria-label="Editar tasca"
        >
          ${icon(
            'edit',
            14
          )}
        </button>


        <button
          type="button"
          class="icon-btn small danger"
          data-action="delete-task"
          data-id="${esc(
            task.id
          )}"
          aria-label="Eliminar tasca"
        >
          ${icon(
            'trash',
            14
          )}
        </button>

      </div>

    </article>
  `;

}


function tasksView() {

  const tasks =
    sortTasks(
      state.tasks
    );


  return `
    <div class="page">


      <div class="toolbar">

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

      </div>


      ${
        tasks.length
          ? `
            <section class="task-list">

              ${tasks
                .map(
                  task =>
                    taskCard(
                      task
                    )
                )
                .join('')}

            </section>
          `
          : `
            <section class="panel empty-panel">

              ${emptyState(
                'Encara no tens tasques',
                'Crea la primera i TRIA podrà començar a organitzar-te.'
              )}

            </section>
          `
      }

    </div>
  `;

}


function openTaskModal(
  taskId = null
) {

  modalMode =
    'task';

  editingId =
    taskId;


  const task =
    state.tasks.find(
      item =>
        item.id === taskId
    );


  const isEdit =
    Boolean(task);


  const body = `
    <form
      id="task-form"
      class="form-grid"
    >

      <label class="full">

        Nom de la tasca

        <input
          name="title"
          type="text"
          value="${esc(
            task?.title || ''
          )}"
          placeholder="Ex. Preparar presentació"
          required
        >

      </label>


      <label>

        Assignatura

        <input
          name="subject"
          type="text"
          value="${esc(
            task?.subject || ''
          )}"
          placeholder="Ex. Història"
        >

      </label>


      <label>

        Data de lliurament

        <input
          name="dueDate"
          type="date"
          value="${esc(
            task?.dueDate || ''
          )}"
        >

      </label>


      <label>

        Temps estimat

        <input
          name="estimatedMinutes"
          type="number"
          min="0"
          step="5"
          value="${esc(
            task?.estimatedMinutes ||
            ''
          )}"
          placeholder="60"
        >

      </label>


      <label>

        Dificultat

        <select name="difficulty">

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

        <select name="status">

          <option
            value="pending"
            ${
              (
                task?.status ||
                'pending'
              ) === 'pending'
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


      <label class="full">

        Descripció

        <textarea
          name="description"
          rows="4"
          placeholder="Afegeix els detalls que necessitis..."
        >${esc(
          task?.description || ''
        )}</textarea>

      </label>

    </form>
  `;


  setModal(
    buildModalHtml(
      isEdit
        ? 'Editar tasca'
        : 'Nova tasca',

      body,

      `
        <button
          type="button"
          class="btn secondary"
          data-action="close-modal"
        >
          Cancel·lar
        </button>

        <button
          type="button"
          class="btn primary"
          data-action="save-task"
        >
          ${
            isEdit
              ? 'Desar canvis'
              : 'Crear tasca'
          }
        </button>
      `
    )
  );

}


function saveTaskFromForm() {

  const form =
    document.querySelector(
      '#task-form'
    );

  if (!form) {

    return;

  }


  const data =
    new FormData(form);


  const title =
    String(
      data.get('title') ||
      ''
    ).trim();


  if (!title) {

    showToast(
      'Escriu un nom per a la tasca.',
      'error'
    );

    return;

  }


  const payload = {

    title,

    subject:
      String(
        data.get('subject') ||
        ''
      ).trim(),

    description:
      String(
        data.get('description') ||
        ''
      ).trim(),

    dueDate:
      String(
        data.get('dueDate') ||
        ''
      ),

    estimatedMinutes:
      Math.max(
        0,
        Number(
          data.get(
            'estimatedMinutes'
          ) || 0
        )
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
        task =>
          task.id ===
          editingId
            ? {
                ...task,
                ...payload
              }
            : task
      );

    showToast(
      'Tasca actualitzada.'
    );

  } else {

    state.tasks.push({

      id:
        uid('task'),

      createdAt:
        new Date().toISOString(),

      ...payload

    });

    showToast(
      'Tasca creada.'
    );

  }


  saveState();

  closeModal();

  render();

}


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


  const confirmed =
    window.confirm(
      `Eliminar «${task.title}»?`
    );


  if (!confirmed) {

    return;

  }


  state.tasks =
    state.tasks.filter(
      item =>
        item.id !== id
    );


  saveState();

  showToast(
    'Tasca eliminada.'
  );

  render();

}

/* =========================================================
   PARTE 5 · EXÀMENS
   ========================================================= */

function examsView() {

  const exams =
    sortExams(
      state.exams
    );


  return `
    <div class="page">


      <div class="toolbar">

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

      </div>


      ${
        exams.length
          ? `
            <section class="exam-grid">

              ${exams
                .map(
                  exam => `
                    <article class="exam-card">

                      <div class="exam-date">

                        <span>
                          ${
                            dateFromISO(
                              exam.date
                            )
                              ? new Intl.DateTimeFormat(
                                  'ca-ES',
                                  {
                                    weekday:
                                      'short'
                                  }
                                ).format(
                                  dateFromISO(
                                    exam.date
                                  )
                                )
                              : ''
                          }
                        </span>

                        <strong>
                          ${
                            dateFromISO(
                              exam.date
                            )
                              ? dateFromISO(
                                  exam.date
                                ).getDate()
                              : '—'
                          }
                        </strong>

                      </div>


                      <div class="exam-main">

                        <p class="eyebrow">
                          ${esc(
                            exam.subject ||
                            'Assignatura'
                          )}
                        </p>

                        <h3>
                          ${esc(
                            exam.title ||
                            'Examen'
                          )}
                        </h3>


                        ${
                          exam.syllabus
                            ? `
                              <p>
                                ${esc(
                                  exam.syllabus
                                )}
                              </p>
                            `
                            : ''
                        }


                        <div class="exam-meta">

                          <span>
                            ${icon(
                              'clock',
                              12
                            )}
                            ${
                              exam.studyMinutes ||
                              0
                            } min
                          </span>

                          <span>
                            ${icon(
                              'info',
                              12
                            )}
                            ${esc(
                              difficultyLabel(
                                exam.difficulty
                              )
                            )}
                          </span>

                        </div>

                      </div>


                      <div class="exam-actions">

                        <button
                          type="button"
                          class="icon-btn small"
                          data-action="edit-exam"
                          data-id="${esc(
                            exam.id
                          )}"
                          aria-label="Editar examen"
                        >
                          ${icon(
                            'edit',
                            14
                          )}
                        </button>


                        <button
                          type="button"
                          class="icon-btn small danger"
                          data-action="delete-exam"
                          data-id="${esc(
                            exam.id
                          )}"
                          aria-label="Eliminar examen"
                        >
                          ${icon(
                            'trash',
                            14
                          )}
                        </button>

                      </div>

                    </article>
                  `
                )
                .join('')}

            </section>
          `
          : `
            <section class="panel empty-panel">

              ${emptyState(
                'No hi ha exàmens',
                'Afegeix el primer examen per començar a planificar-lo.'
              )}

            </section>
          `
      }

    </div>
  `;

}


function openExamModal(
  examId = null
) {

  modalMode =
    'exam';

  editingId =
    examId;


  const exam =
    state.exams.find(
      item =>
        item.id === examId
    );


  const isEdit =
    Boolean(exam);


  const body = `
    <form
      id="exam-form"
      class="form-grid"
    >

      <label class="full">

        Nom de l’examen

        <input
          name="title"
          type="text"
          value="${esc(
            exam?.title || ''
          )}"
          placeholder="Ex. Examen de Física"
          required
        >

      </label>


      <label>

        Assignatura

        <input
          name="subject"
          type="text"
          value="${esc(
            exam?.subject || ''
          )}"
          placeholder="Física"
        >

      </label>


      <label>

        Data

        <input
          name="date"
          type="date"
          value="${esc(
            exam?.date || ''
          )}"
          required
        >

      </label>


      <label>

        Temps d’estudi

        <input
          name="studyMinutes"
          type="number"
          min="0"
          step="15"
          value="${esc(
            exam?.studyMinutes ||
            ''
          )}"
          placeholder="180"
        >

      </label>


      <label>

        Dificultat

        <select name="difficulty">

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


      <label class="full">

        Temari

        <textarea
          name="syllabus"
          rows="5"
          placeholder="Temes, capítols o continguts que entren..."
        >${esc(
          exam?.syllabus || ''
        )}</textarea>

      </label>

    </form>
  `;


  setModal(
    buildModalHtml(
      isEdit
        ? 'Editar examen'
        : 'Nou examen',

      body,

      `
        <button
          type="button"
          class="btn secondary"
          data-action="close-modal"
        >
          Cancel·lar
        </button>

        <button
          type="button"
          class="btn primary"
          data-action="save-exam"
        >
          ${
            isEdit
              ? 'Desar canvis'
              : 'Crear examen'
          }
        </button>
      `
    )
  );

}


function saveExamFromForm() {

  const form =
    document.querySelector(
      '#exam-form'
    );

  if (!form) {

    return;

  }


  const data =
    new FormData(form);


  const title =
    String(
      data.get('title') ||
      ''
    ).trim();


  const date =
    String(
      data.get('date') ||
      ''
    );


  if (!title) {

    showToast(
      'Escriu un nom per a l’examen.',
      'error'
    );

    return;

  }


  if (!date) {

    showToast(
      'Selecciona la data de l’examen.',
      'error'
    );

    return;

  }


  const payload = {

    title,

    subject:
      String(
        data.get('subject') ||
        ''
      ).trim(),

    date,

    syllabus:
      String(
        data.get('syllabus') ||
        ''
      ).trim(),

    studyMinutes:
      Math.max(
        0,
        Number(
          data.get(
            'studyMinutes'
          ) || 0
        )
      ),

    difficulty:
      Number(
        data.get(
          'difficulty'
        ) || 3
      )

  };


  if (editingId) {

    state.exams =
      state.exams.map(
        exam =>
          exam.id ===
          editingId
            ? {
                ...exam,
                ...payload
              }
            : exam
      );

    showToast(
      'Examen actualitzat.'
    );

  } else {

    state.exams.push({

      id:
        uid('exam'),

      createdAt:
        new Date().toISOString(),

      ...payload

    });

    showToast(
      'Examen creat.'
    );

  }


  saveState();

  closeModal();

  render();

}


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


  const confirmed =
    window.confirm(
      `Eliminar «${exam.title}»?`
    );


  if (!confirmed) {

    return;

  }


  state.exams =
    state.exams.filter(
      item =>
        item.id !== id
    );


  saveState();

  showToast(
    'Examen eliminat.'
  );

  render();

}

/* =========================================================
   PARTE 6 · HORARI
   ========================================================= */

function scheduleTypeLabel(
  type
) {

  return {

    class:
      'Classe',

    study:
      'Estudi',

    exam:
      'Examen',

    task:
      'Tasca'

  }[
    type
  ] || 'Horari';

}


function scheduleDayName(
  day
) {

  return {

    monday:
      'Dilluns',

    tuesday:
      'Dimarts',

    wednesday:
      'Dimecres',

    thursday:
      'Dijous',

    friday:
      'Divendres'

  }[
    String(day)
      .toLowerCase()
  ] || day;

}


function scheduleView() {

  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday'
  ];


  const events =
    [...state.scheduleEvents]
      .sort(
        (a, b) =>
          String(
            a.day || ''
          ).localeCompare(
            String(
              b.day || ''
            )
          ) ||
          String(
            a.startTime || ''
          ).localeCompare(
            String(
              b.startTime || ''
            )
          )
      );


  return `
    <div class="page">


      <div
        class="toolbar"
        id="schedule-upload"
      >

        <div>

          <p class="eyebrow">
            ORGANITZACIÓ
          </p>

          <h2>
            Horari
          </h2>

          <p class="muted">
            Puja una foto del teu horari
            i TRIA l’organitzarà.
          </p>

        </div>


        <div class="toolbar-actions">

          <label
            class="btn primary"
            for="schedule-image"
          >
            ${icon(
              'camera',
              15
            )}
            Analitzar horari
          </label>

          <input
            id="schedule-image"
            type="file"
            accept="image/*"
            hidden
          >

          ${
            events.length
              ? `
                <button
                  type="button"
                  class="btn secondary"
                  data-action="clear-schedule"
                >
                  Netejar
                </button>
              `
              : ''
          }

        </div>

      </div>


      <section class="panel schedule-panel">

        <div class="panel-head">

          <div>

            <p class="eyebrow">
              SETMANA
            </p>

            <h3>
              El teu horari
            </h3>

          </div>


          <span class="count-badge">
            ${events.length} elements
          </span>

        </div>


        ${
          events.length
            ? `
              <div class="schedule-grid">

                ${days
                  .map(
                    day => {

                      const dayEvents =
                        events.filter(
                          event =>
                            String(
                              event.day ||
                              ''
                            ).toLowerCase() ===
                            day
                        );


                      return `
                        <div class="schedule-day">

                          <div class="schedule-day-header">

                            <span>
                              SETMANA
                            </span>

                            <strong>
                              ${scheduleDayName(
                                day
                              )}
                            </strong>

                          </div>


                          <div class="schedule-day-body">

                            ${
                              dayEvents.length
                                ? dayEvents
                                    .map(
                                      event => `
                                        <article class="schedule-event">

                                          <span class="schedule-time">
                                            ${esc(
                                              event.startTime ||
                                              ''
                                            )}
                                            ${
                                              event.endTime
                                                ? `–${esc(
                                                    event.endTime
                                                  )}`
                                                : ''
                                            }
                                          </span>

                                          <strong>
                                            ${esc(
                                              event.title ||
                                              event.subject ||
                                              'Classe'
                                            )}
                                          </strong>

                                          ${
                                            event.subject &&
                                            event.title !==
                                              event.subject
                                              ? `
                                                <small>
                                                  ${esc(
                                                    event.subject
                                                  )}
                                                </small>
                                              `
                                              : ''
                                          }

                                        </article>
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
            `
            : `
              <div class="schedule-empty-state">

                <div class="empty-icon">
                  ${icon(
                    'camera',
                    22
                  )}
                </div>

                <h3>
                  Encara no tens cap horari
                </h3>

                <p>
                  Puja una foto clara del teu horari
                  i deixa que TRIA el converteixi
                  en dades organitzades.
                </p>

                <label
                  class="btn primary"
                  for="schedule-image"
                >
                  ${icon(
                    'camera',
                    15
                  )}
                  Analitzar horari
                </label>

              </div>
            `
        }

      </section>

    </div>
  `;

}


async function prepareScheduleImage(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (!file) {

        reject(
          new Error(
            'No s’ha seleccionat cap imatge.'
          )
        );

        return;

      }


      if (
        !file.type ||
        !file.type.startsWith(
          'image/'
        )
      ) {

        reject(
          new Error(
            'El fitxer seleccionat no és una imatge.'
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

          const maxWidth =
            1800;


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


          if (
            comma === -1
          ) {

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


      image.onerror =
        () => {

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


async function handleScheduleImage(
  file
) {

  if (!file) {

    return;

  }


  showToast(
    'Analitzant el teu horari...',
    'info'
  );


  try {

    const image =
      await prepareScheduleImage(
        file
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
      await response.json()
        .catch(
          () => ({})
        );


    if (!response.ok) {

      throw new Error(
        data.error ||
        'No s’ha pogut analitzar l’horari.'
      );

    }


    const events =
      Array.isArray(
        data.events
      )
        ? data.events
        : Array.isArray(
            data.schedule
          )
          ? data.schedule
          : [];


    if (!events.length) {

      throw new Error(
        'No s’han detectat classes a la imatge.'
      );

    }


    pendingScheduleEvents =
      events
        .map(
          event => ({
            ...event,

            id:
              event.id ||
              uid('schedule'),

            day:
              String(
                event.day ||
                ''
              ).toLowerCase(),

            startTime:
              String(
                event.startTime ||
                ''
              ),

            endTime:
              String(
                event.endTime ||
                ''
              ),

            title:
              String(
                event.title ||
                event.subject ||
                'Classe'
              ),

            subject:
              String(
                event.subject ||
                event.title ||
                ''
              )

          })
        )
        .filter(
          event =>
            [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday'
            ].includes(
              event.day
            ) &&
            /^\d{2}:\d{2}$/.test(
              event.startTime
            )
        );


    if (
      !pendingScheduleEvents.length
    ) {

      throw new Error(
        'L’horari detectat no té un format vàlid.'
      );

    }


    openScheduleReview();

  } catch (error) {

    console.error(
      error
    );

    showToast(
      error.message ||
      'No s’ha pogut analitzar l’horari.',
      'error'
    );

  }

}


function openScheduleReview() {

  const events =
    pendingScheduleEvents;


  const body = `
    <div class="schedule-review-intro">

      <p>
        TRIA ha detectat
        <strong>${events.length}</strong>
        elements.
      </p>

      <span>
        Revisa el resultat abans de desar-lo.
      </span>

    </div>


    <div class="schedule-review">

      ${events
        .map(
          (event, index) => `
            <div
              class="review-event"
              data-review-index="${index}"
            >

              <div>

                <strong>
                  ${esc(
                    event.title
                  )}
                </strong>

                <span>
                  ${esc(
                    scheduleDayName(
                      event.day
                    )
                  )}
                  ·
                  ${esc(
                    event.startTime
                  )}
                  ${
                    event.endTime
                      ? `–${esc(
                          event.endTime
                        )}`
                      : ''
                  }
                </span>

              </div>


              <button
                type="button"
                class="icon-btn small danger"
                data-action="remove-review-event"
                data-index="${index}"
                aria-label="Eliminar element"
              >
                ${icon(
                  'trash',
                  14
                )}
              </button>

            </div>
          `
        )
        .join('')}

    </div>
  `;


  setModal(
    buildModalHtml(
      'Revisar horari',

      body,

      `
        <button
          type="button"
          class="btn secondary"
          data-action="close-modal"
        >
          Cancel·lar
        </button>

        <button
          type="button"
          class="btn primary"
          data-action="save-schedule-review"
        >
          Desar horari
        </button>
      `
    )
  );

     const saveButton =
    document.querySelector(
      '[data-action="save-schedule-review"]'
    );

  if (saveButton) {
    saveButton.addEventListener(
      'click',
      saveScheduleReview
    );
  }


  document
    .querySelectorAll(
      '[data-action="remove-review-event"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {
            removeReviewEvent(
              button.dataset.index
            );
          }
        );

      }
    );


  const closeButton =
    document.querySelector(
      '[data-action="close-modal"]'
    );

  if (closeButton) {
    closeButton.addEventListener(
      'click',
      closeModal
    );
  }
   
}


function saveScheduleReview() {

  if (
    !pendingScheduleEvents.length
  ) {

    showToast(
      'No hi ha cap element per desar.',
      'error'
    );

    return;

  }


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

  pendingScheduleEvents = [];

  closeModal();

  showToast(
    'Horari desat correctament.'
  );

  render();

}


function removeReviewEvent(
  index
) {

  pendingScheduleEvents =
    pendingScheduleEvents.filter(
      (_event, i) =>
        i !== Number(index)
    );


  if (
    !pendingScheduleEvents.length
  ) {

    closeModal();

    showToast(
      'No queda cap element de l’horari.',
      'info'
    );

    return;

  }


  openScheduleReview();

}

/* =========================================================
   PARTE 7 · PLANIFICADOR
   ========================================================= */

function startOfWeek(
  date = new Date()
) {

  const result =
    new Date(date);

  const day =
    result.getDay();


  const diff =
    day === 0
      ? -6
      : 1 - day;


  result.setDate(
    result.getDate() +
    diff
  );


  result.setHours(
    12,
    0,
    0,
    0
  );


  return result;

}


function plannerWeekDays() {

  const monday =
    startOfWeek();


  return Array.from(
    {
      length: 5
    },
    (_, index) => {

      const date =
        new Date(monday);

      date.setDate(
        monday.getDate() +
        index
      );


      return date;

    }
  );

}


function plannerDayEvents(
  date
) {

  const iso =
    isoDay(date);


  return state.scheduleEvents
    .filter(
      event =>
        event.date === iso
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

}


function plannerDayTasks(
  date
) {

  const iso =
    isoDay(date);


  return state.tasks
    .filter(
      task =>
        task.status !==
          'completed' &&
        task.dueDate === iso
    );

}


function plannerItem(
  item,
  type
) {

  const title =
    item.title ||
    item.subject ||
    'Element';


  return `
    <article
      class="planner-item ${type}"
    >

      ${
        item.startTime
          ? `
            <small>
              ${esc(
                item.startTime
              )}
              ${
                item.endTime
                  ? `–${esc(
                      item.endTime
                    )}`
                  : ''
              }
            </small>
          `
          : ''
      }


      <strong>
        ${esc(title)}
      </strong>


      ${
        item.subject &&
        item.subject !== title
          ? `
            <span>
              ${esc(
                item.subject
              )}
            </span>
          `
          : ''
      }

    </article>
  `;

}


function plannerView() {

  const days =
    plannerWeekDays();


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

      </div>


      <section class="panel planner-panel">

        <div class="panel-head">

          <div>

            <p class="eyebrow">
              SETMANA ACTUAL
            </p>

            <h3>
              Horari i tasques
            </h3>

          </div>

        </div>


        <div class="week-grid">

          ${days
            .map(
              date => {

                const events =
                  plannerDayEvents(
                    date
                  );

                const tasks =
                  plannerDayTasks(
                    date
                  );


                const weekday =
                  weekdayName(
                    date
                  );


                return `
                  <div class="week-day">

                    <div class="week-day-header">

                      <span>
                        ${esc(
                          weekday
                        )}
                      </span>

                      <strong>
                        ${date.getDate()}
                      </strong>

                    </div>


                    <div class="week-day-body">

                      ${
                        events.length ||
                        tasks.length
                          ? `
                            ${events
                              .map(
                                event =>
                                  plannerItem(
                                    event,
                                    'class'
                                  )
                              )
                              .join('')}

                            ${tasks
                              .map(
                                task =>
                                  plannerItem(
                                    task,
                                    'task'
                                  )
                              )
                              .join('')}
                          `
                          : `
                            <div class="planner-empty">
                              Lliure
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


      ${
        state.plan
          ? `
            <section class="panel ai-plan-panel">

              <div class="panel-head">

                <div>

                  <p class="eyebrow">
                    IA
                  </p>

                  <h3>
                    Pla d’estudi
                  </h3>

                </div>

              </div>


              <div class="ai-plan-content">

                ${
                  state.plan.summary
                    ? `
                      <p>
                        ${esc(
                          state.plan.summary
                        )}
                      </p>
                    `
                    : ''
                }


                ${
                  Array.isArray(
                    state.plan.sessions
                  )
                    ? `
                      <div class="plan-sessions">

                        ${state.plan.sessions
                          .map(
                            session => `
                              <article class="plan-session">

                                <div>

                                  <strong>
                                    ${esc(
                                      session.title ||
                                      session.task ||
                                      'Sessió d’estudi'
                                    )}
                                  </strong>

                                  <span>
                                    ${esc(
                                      session.date ||
                                      ''
                                    )}
                                  </span>

                                </div>


                                <b>
                                  ${
                                    Number(
                                      session.minutes ||
                                      session.duration ||
                                      0
                                    )
                                  } min
                                </b>

                              </article>
                            `
                          )
                          .join('')}

                      </div>
                    `
                    : ''
                }

              </div>

            </section>
          `
          : ''
      }

    </div>
  `;

}


async function recalculatePlan() {

  showToast(
    'TRIA està preparant el pla...',
    'info'
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
      await response.json()
        .catch(
          () => ({})
        );


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

    showToast(
      'Pla d’estudi actualitzat.'
    );

    render();

  } catch (error) {

    console.error(
      error
    );

    showToast(
      error.message ||
      'No s’ha pogut crear el pla.',
      'error'
    );

  }

}

/* =========================================================
   PARTE 8 · IA + CHAT
   ========================================================= */

function chatMarkdown(text = '') {

  const safe =
    esc(
      String(text)
    );


  return safe
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    )
    .replace(
      /\n\n+/g,
      '</p><p>'
    )
    .replace(
      /\n/g,
      '<br>'
    )
    .replace(
      /^(.+)$/s,
      '<p>$1</p>'
    );

}


function chatView() {

  const messages =
    Array.isArray(
      state.chat
    )
      ? state.chat
      : [];


  return `
    <div class="page">


      <div class="toolbar">

        <div>

          <p class="eyebrow">
            ASSISTENT D’ESTUDI
          </p>

          <h2>
            IA d’estudi
          </h2>

          <p class="muted">
            Parla amb TRIA utilitzant
            les teves tasques i exàmens.
          </p>

        </div>

      </div>


      <section class="chat-panel">


        <header class="chat-head">

          <div class="assistant-avatar">
            ${icon(
              'sparkles',
              17
            )}
          </div>


          <div>

            <p class="eyebrow">
              TRIA IA
            </p>

            <h2>
              Orientador d’estudi
            </h2>

            <span>
              Connectat amb Gemini
            </span>

          </div>

        </header>


        <div
          id="chat-messages"
          class="chat-messages"
        >

          ${
            messages.length
              ? messages
                  .map(
                    message => `
                      <div
                        class="message ${
                          message.role ===
                          'user'
                            ? 'user'
                            : 'assistant'
                        }"
                      >

                        <div class="message-bubble">

                          ${
                            message.role ===
                            'user'
                              ? `
                                <p>
                                  ${esc(
                                    message.text ||
                                    ''
                                  )}
                                </p>
                              `
                              : chatMarkdown(
                                  message.text ||
                                  ''
                                )
                          }

                        </div>

                      </div>
                    `
                  )
                  .join('')
              : `
                <div class="chat-empty">

                  <div class="assistant-avatar">
                    ${icon(
                      'sparkles',
                      20
                    )}
                  </div>

                  <h3>
                    En què et puc ajudar?
                  </h3>

                  <p>
                    Pots preguntar-me què estudiar
                    primer, com repartir el temps
                    o com preparar un examen.
                  </p>

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
            name="message"
            type="text"
            autocomplete="off"
            placeholder="Pregunta a TRIA..."
            aria-label="Pregunta a TRIA"
            required
          >


          <button
            type="submit"
            class="btn primary"
            aria-label="Enviar missatge"
          >
            ${icon(
              'arrow',
              16
            )}
          </button>

        </form>


      </section>

    </div>
  `;

}


async function sendChatMessage(
  message
) {

  const clean =
    String(
      message ||
      ''
    ).trim();


  if (!clean) {

    return;

  }


  if (
    !Array.isArray(
      state.chat
    )
  ) {

    state.chat = [];

  }


  state.chat.push({

    role:
      'user',

    text:
      clean,

    createdAt:
      new Date().toISOString()

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
      await response.json()
        .catch(
          () => ({})
        );


    if (!response.ok) {

      throw new Error(
        data.error ||
        'No s’ha pogut obtenir una resposta.'
      );

    }


    const answer =
      data.answer ||
      data.text ||
      'No he pogut generar una resposta.';


    state.chat.push({

      role:
        'assistant',

      text:
        String(answer),

      createdAt:
        new Date().toISOString()

    });


    saveState();

    render();


  } catch (error) {

    console.error(
      error
    );


    state.chat.push({

      role:
        'assistant',

      text:
        `No he pogut respondre ara mateix. ${error.message || ''}`.trim(),

      createdAt:
        new Date().toISOString()

    });


    saveState();

    render();

  }

}


/* =========================================================
   MISSATGE DE BENvinguda
   ========================================================= */

function ensureWelcomeMessage() {

  if (
    !Array.isArray(
      state.chat
    )
  ) {

    state.chat = [];

  }


  /*
   * No afegim cap missatge automàtic.
   * La pantalla inicial queda neta.
   */

}

/* =========================================================
   PARTE 9 · PROGRÉS
   ========================================================= */

function formatMinutes(
  minutes
) {

  const total =
    Math.max(
      0,
      Number(minutes) || 0
    );


  const hours =
    Math.floor(
      total / 60
    );


  const mins =
    total % 60;


  if (!hours) {

    return `${mins} min`;

  }


  if (!mins) {

    return `${hours} h`;

  }


  return `${hours} h ${mins} min`;

}


function progressView() {

  const totalTasks =
    state.tasks.length;

  const completed =
    completedTasks().length;

  const pending =
    pendingTasks().length;

  const percent =
    progressPercent();

  const plannedMinutes =
    totalTaskMinutes();

  const completedMinutes =
    completedTaskMinutes();


  const remainingMinutes =
    Math.max(
      0,
      plannedMinutes -
      completedMinutes
    );


  const exams =
    state.exams.length;


  return `
    <div class="page">


      <div class="toolbar">

        <div>

          <p class="eyebrow">
            SEGUIMENT
          </p>

          <h2>
            El teu progrés
          </h2>

          <p class="muted">
            Una visió senzilla de com avança
            el teu estudi.
          </p>

        </div>

      </div>


      <section class="stats-grid progress-grid">

        ${statCard(
          'check',
          'Tasques completades',
          `${completed}`,
          `de ${totalTasks}`
        )}

        ${statCard(
          'tasks',
          'Tasques pendents',
          `${pending}`,
          'Per completar'
        )}

        ${statCard(
          'clock',
          'Temps completat',
          formatMinutes(
            completedMinutes
          ),
          `de ${formatMinutes(
            plannedMinutes
          )}`
        )}

        ${statCard(
          'exams',
          'Exàmens registrats',
          `${exams}`,
          'En total'
        )}

      </section>


      <section class="progress-layout">


        <article class="panel progress-main">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                OBJECTIU
              </p>

              <h3>
                Progrés de les tasques
              </h3>

            </div>


            <strong class="progress-big">
              ${percent}%
            </strong>

          </div>


          <div class="progress-track">

            <div
              class="progress-fill"
              style="width:${percent}%"
            ></div>

          </div>


          <div class="progress-details">

            <div>

              <span>
                Completades
              </span>

              <strong>
                ${completed}
              </strong>

            </div>


            <div>

              <span>
                Pendents
              </span>

              <strong>
                ${pending}
              </strong>

            </div>


            <div>

              <span>
                Temps restant
              </span>

              <strong>
                ${formatMinutes(
                  remainingMinutes
                )}
              </strong>

            </div>

          </div>

        </article>


        <article class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                ACTIVITAT
              </p>

              <h3>
                Resum
              </h3>

            </div>

          </div>


          <div class="activity-list">

            <div class="activity-row">

              <span>
                Tasques totals
              </span>

              <strong>
                ${totalTasks}
              </strong>

            </div>


            <div class="activity-row">

              <span>
                Exàmens
              </span>

              <strong>
                ${exams}
              </strong>

            </div>


            <div class="activity-row">

              <span>
                Temps planificat
              </span>

              <strong>
                ${formatMinutes(
                  plannedMinutes
                )}
              </strong>

            </div>


            <div class="activity-row">

              <span>
                Temps completat
              </span>

              <strong>
                ${formatMinutes(
                  completedMinutes
                )}
              </strong>

            </div>

          </div>

        </article>


      </section>


      <section class="panel">

        <div class="panel-head">

          <div>

            <p class="eyebrow">
              ÚLTIMES TASQUES
            </p>

            <h3>
              Activitat recent
            </h3>

          </div>

        </div>


        ${
          state.tasks.length
            ? `
              <div class="dashboard-task-list">

                ${sortTasks(
                  state.tasks
                )
                  .slice(0, 5)
                  .map(
                    task =>
                      taskCard(
                        task,
                        true
                      )
                  )
                  .join('')}

              </div>
            `
            : `
              <div class="panel-empty">

                ${icon(
                  'tasks',
                  20
                )}

                <strong>
                  Encara no hi ha activitat.
                </strong>

                <span>
                  Crea una tasca per començar.
                </span>

              </div>
            `
        }

      </section>


    </div>
  `;

}


/* =========================================================
   PARTE 9 · AVALUACIÓ
   ========================================================= */

function settingsView() {

  const totalTasks =
    state.tasks.length;

  const completed =
    completedTasks().length;

  const exams =
    state.exams.length;

  const schedule =
    state.scheduleEvents.length;

  const chatMessages =
    Array.isArray(
      state.chat
    )
      ? state.chat.length
      : 0;


  return `
    <div class="page">


      <div class="toolbar">

        <div>

          <p class="eyebrow">
            AVALUACIÓ
          </p>

          <h2>
            Activitat de TRIA
          </h2>

          <p class="muted">
            Resum de les dades generades
            durant l’ús de l’aplicació.
          </p>

        </div>

      </div>


      <section class="stats-grid">

        ${statCard(
          'tasks',
          'Tasques',
          `${totalTasks}`,
          `${completed} completades`
        )}

        ${statCard(
          'exams',
          'Exàmens',
          `${exams}`,
          'Registrats'
        )}

        ${statCard(
          'calendar',
          'Elements d’horari',
          `${schedule}`,
          'Detectats'
        )}

        ${statCard(
          'chat',
          'Missatges IA',
          `${chatMessages}`,
          'Converses'
        )}

      </section>


      <section class="settings-layout">


        <article class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                RECOMANACIONS
              </p>

              <h3>
                Decisions d’estudi
              </h3>

            </div>

          </div>


          <div class="setting-row">

            <span>
              IA activa
            </span>

            <strong>
              ${
                state.settings.aiEnabled
                  ? 'Sí'
                  : 'No'
              }
            </strong>

          </div>


          <div class="setting-row">

            <span>
              Tasques completades
            </span>

            <strong>
              ${completed}
            </strong>

          </div>


          <div class="setting-row">

            <span>
              Plans generats
            </span>

            <strong>
              ${
                state.plan
                  ? 'Sí'
                  : 'Encara no'
              }
              


            </strong>

          </div>

        </article>


        <article class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                TRAÇABILITAT
              </p>

              <h3>
                Dades de l’activitat
              </h3>

            </div>

          </div>


          <p class="muted">
            TRIA utilitza les tasques,
            els exàmens, l’horari i les
            interaccions amb la IA per
            construir les recomanacions
            d’estudi.
          </p>


          <div class="evaluation-note">

            ${icon(
              'info',
              16
            )}

            <span>
              Aquest resum és local a
              aquesta sessió de TRIA.
            </span>

          </div>

        </article>


      </section>


    </div>
  `;

}

/* =========================================================
   PARTE 10 · VISTES
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
    getRoot();


  if (!root) {

    return;

  }


  if (!authReady) {

    root.innerHTML = `
      <main class="auth-screen">

        <div class="auth-loading">

          <div class="brand-mark">
            ${icon(
              'sparkles',
              18
            )}
          </div>

          <strong>
            ${APP_NAME}
          </strong>

          <span>
            Carregant...
          </span>

        </div>

      </main>
    `;

    return;

  }


  if (!currentUser) {

    root.innerHTML =
      authView();

    bindAuthEvents();

    return;

  }


  const view =
    views[currentPage] ||
    dashboardView;


  root.innerHTML =
    layout(
      view()
    );


  bindPageEvents();

}


/* =========================================================
   AUTH EVENTS
   ========================================================= */

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
   EVENTOS PRINCIPALES
   ========================================================= */

function bindPageEvents() {


  /* -------------------------------------------------------
     NAVEGACIÓ
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-page]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const page =
              button.dataset.page;


            if (
              !views[page]
            ) {

              return;

            }


            currentPage =
              page;

            closeModal();

            render();

            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });

          }
        );

      }
    );


  /* -------------------------------------------------------
     LOGOUT
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="logout"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          logout
        );

      }
    );


  /* -------------------------------------------------------
     NOVA TASCA
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="new-task"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            openTaskModal()
        );

      }
    );


  /* -------------------------------------------------------
     EDITAR TASCA
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="edit-task"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            openTaskModal(
              button.dataset.id
            )
        );

      }
    );


  /* -------------------------------------------------------
     GUARDAR TASCA
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="save-task"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          saveTaskFromForm
        );

      }
    );


  /* -------------------------------------------------------
     COMPLETAR TASCA
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="toggle-task"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            toggleTask(
              button.dataset.id
            )
        );

      }
    );


  /* -------------------------------------------------------
     ELIMINAR TASCA
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="delete-task"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            deleteTask(
              button.dataset.id
            )
        );

      }
    );


  /* -------------------------------------------------------
     NOU EXAMEN
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="new-exam"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            openExamModal()
        );

      }
    );


  /* -------------------------------------------------------
     EDITAR EXAMEN
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="edit-exam"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            openExamModal(
              button.dataset.id
            )
        );

      }
    );


  /* -------------------------------------------------------
     GUARDAR EXAMEN
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="save-exam"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          saveExamFromForm
        );

      }
    );


  /* -------------------------------------------------------
     ELIMINAR EXAMEN
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="delete-exam"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            deleteExam(
              button.dataset.id
            )
        );

      }
    );


  /* -------------------------------------------------------
     CERRAR MODAL
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="close-modal"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          closeModal
        );

      }
    );


  /* -------------------------------------------------------
     RECALCULAR PLAN
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="recalculate-plan"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          recalculatePlan
        );

      }
    );


  /* -------------------------------------------------------
     SUBIR HORARIO
     ------------------------------------------------------- */

  const scheduleInput =
    document.querySelector(
      '#schedule-image'
    );


  if (scheduleInput) {

    scheduleInput.addEventListener(
      'change',
      event => {

        const file =
          event.target.files?.[0];


        if (file) {

          handleScheduleImage(
            file
          );

        }


        event.target.value =
          '';

      }
    );

  }


  /* -------------------------------------------------------
     BOTÓN ANALIZAR HORARIO
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="scroll-schedule-upload"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            scrollToElement(
              '#schedule-upload'
            );

          }
        );

      }
    );


  /* -------------------------------------------------------
     LIMPIAR HORARIO
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="clear-schedule"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const confirmed =
              window.confirm(
                'Vols eliminar tot l’horari?'
              );


            if (!confirmed) {

              return;

            }


            state.scheduleEvents =
              [];

            saveState();

            showToast(
              'Horari eliminat.'
            );

            render();

          }
        );

      }
    );


  /* -------------------------------------------------------
     GUARDAR REVISIÓ HORARI
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="save-schedule-review"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          saveScheduleReview
        );

      }
    );


  /* -------------------------------------------------------
     ELIMINAR ELEMENT DE REVISIÓ
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="remove-review-event"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            removeReviewEvent(
              button.dataset.index
            )
        );

      }
    );


  /* -------------------------------------------------------
     CHAT
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     BOTONS LINK
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '.link-btn[data-page]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const page =
              button.dataset.page;


            if (
              !views[page]
            ) {

              return;

            }


            currentPage =
              page;

            render();

          }
        );

      }
    );

  /* -------------------------------------------------------
     FRASES DEL PROFESSORAT
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="teacher-prev"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            teacherQuoteIndex =
              (
                teacherQuoteIndex -
                1 +
                teacherQuotes.length
              ) %
              teacherQuotes.length;

            render();

          }
        );

      }
    );


  document
    .querySelectorAll(
      '[data-action="teacher-next"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            teacherQuoteIndex =
              (
                teacherQuoteIndex +
                1
              ) %
              teacherQuotes.length;

            render();

          }
        );

      }
    );


  document
    .querySelectorAll(
      '[data-action="teacher-dot"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            teacherQuoteIndex =
              Number(
                button.dataset.index
              ) || 0;

            render();

          }
        );

      }
    );
  /* -------------------------------------------------------
     MODAL BACKDROP
     ------------------------------------------------------- */

  const modal =
    getModal();


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
   INICI
   ========================================================= */

initAuth();

function () {
  const quote =
    teacherQuotes[teacherQuoteIndex];

  return `
    <section class="teacher-note">

      <div class="teacher-note-header">
        <div>
          <p class="eyebrow">
            LA VISTA DEL PROFESSORAT
          </p>
        </div>
      </div>


      <div class="teacher-quote-wrap">

        <button
          class="teacher-arrow"
          data-action="teacher-prev"
          aria-label="Frase anterior"
        >
          ${icon('chevron-left', 17)}
        </button>


        <blockquote>

          <span class="quote-mark">
            “
          </span>

          <span class="teacher-quote-text">
            ${esc(quote)}
          </span>

          <span class="quote-mark closing">
            ”
          </span>

        </blockquote>


        <button
          class="teacher-arrow"
          data-action="teacher-next"
          aria-label="Frase següent"
        >
          ${icon('chevron-right', 17)}
        </button>

      </div>


      <div class="teacher-note-footer">

        <span>
          Professorat
        </span>


        <div class="teacher-dots">

          ${teacherQuotes.map((_, index) => `
            <button
              class="teacher-dot ${index === teacherQuoteIndex ? 'active' : ''}"
              data-action="teacher-dot"
              data-index="${index}"
              aria-label="Veure frase ${index + 1}"
            ></button>
          `).join('')}

        </div>


        <span>
          ${teacherQuoteIndex + 1} / ${teacherQuotes.length}
        </span>

      </div>

    </section>
  `;
}
