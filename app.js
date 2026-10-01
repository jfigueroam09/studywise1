import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* =========================================================
   TRIA · NÚCLEOa
   ========================================================= */

const APP_NAME = 'TRIA';
const APP_AUTHOR = 'Fet per Freddy Figueroa';

const SUPABASE_URL =
  'https://tzyslkglsywfiwuhtgrj.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'PEGA_AQUI_TU_PUBLISHABLE_KEY';

const STORAGE_KEY = 'tria';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   ESTADO
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

let teacherQuoteIndex = 0;


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function normaliseState(raw = {}) {
  const safe =
    raw &&
    typeof raw === 'object'
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

    plan:
      safe.plan &&
      typeof safe.plan === 'object'
        ? safe.plan
        : null,

    chat:
      Array.isArray(safe.chat)
        ? safe.chat
        : [],

    settings: {
      ...structuredClone(
        defaultState.settings
      ),

      ...(safe.settings &&
      typeof safe.settings === 'object'
        ? safe.settings
        : {})
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


function loadUserState(userId) {
  const userKey =
    storageKeyForUser(userId);

  const existing =
    readStorage(userKey);

  if (existing) {
    return existing;
  }

  const legacy =
    readStorage(STORAGE_KEY);

  if (legacy) {
    try {
      localStorage.setItem(
        userKey,
        JSON.stringify(legacy)
      );
    } catch {
      /* Continuamos en memoria. */
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
      JSON.stringify(state)
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
      data?.session?.user || null;

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
        session?.user || null;

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

  errorBox.classList.add(
    'hidden'
  );

  successBox.classList.add(
    'hidden'
  );

  if (!email || !password) {
    errorBox.textContent =
      'Escriu el correu i la contrasenya.';

    errorBox.classList.remove(
      'hidden'
    );

    return;
  }

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

  currentPage = 'dashboard';
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
    .slice(0, 10);
}


function dateFromISO(value) {
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


function isoDay(date) {
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

  return (
    `${year}-${month}-${day}`
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
      target.getTime() -
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
    dateFromISO(value);

  if (!date) {
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
    dateFromISO(value);

  if (!date) {
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
  const labels = {
    pending: 'Pendent',
    inprogress: 'En curs',
    completed: 'Completada'
  };

  return (
    labels[status] ||
    'Pendent'
  );
}


function difficultyLabel(value) {
  const labels = {
    1: 'Baixa',
    2: 'Baixa',
    3: 'Mitjana',
    4: 'Alta',
    5: 'Alta'
  };

  return (
    labels[Number(value)] ||
    'Mitjana'
  );
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

    camera:
      '<path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/>',

    info:
      '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',

    menu:
      '<path d="M4 6h16M4 12h16M4 18h16"/>'

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
            ${isLogin
              ? 'BENVINGUT'
              : 'NOU COMPTE'}
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
    dashboard: 'Tauler',
    tasks: 'Tasques',
    exams: 'Exàmens',
    schedule: 'Horari',
    planner: 'Planificador',
    chat: "IA d'estudi",
    progress: 'Progrés',
    settings: 'Avaluació'
  };

  return (
    titles[currentPage] ||
    'Tauler'
  );
}


/* =========================================================
   LAYOUT
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


  const pageActions = {
    dashboard: `
      <button
        type="button"
        class="btn primary"
        data-action="recalculate-plan"
      >
        ${icon('sparkles', 15)}
        Recalcular amb IA
      </button>
    `,

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
    `
  };


  return `
    <div class="app-shell">

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
            ${pageActions[currentPage] || ''}
          </div>

        </header>


        <section id="content">
          ${content}
        </section>

      </main>


      <div
        id="modal"
        class="modal-backdrop hidden"
        aria-hidden="true"
      ></div>

    </div>
  `;
}


/* =========================================================
   MODALS
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


function setModal(html) {
  const modal =
    getModal();

  if (!modal) {
    return;
  }

  modal.innerHTML = html;

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

  modal.innerHTML = '';

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

  requestAnimationFrame(() => {
    toast.classList.add(
      'show'
    );
  });

  setTimeout(() => {
    toast.classList.remove(
      'show'
    );

    setTimeout(() => {
      toast.remove();
    }, 180);

  }, 2600);
}


document.addEventListener(
  'keydown',
  event => {
    if (
      event.key === 'Escape'
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
   DADES
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

      if (aDate !== bDate) {
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
    (a, b) =>
      String(
        a?.date ||
        '9999-12-31'
      ).localeCompare(
        String(
          b?.date ||
          '9999-12-31'
        )
      )
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


function totalTaskMinutes() {
  return state.tasks.reduce(
    (total, task) =>
      total +
      Number(
        task.estimatedMinutes || 0
      ),
    0
  );
}


function completedTaskMinutes() {
  return completedTasks().reduce(
    (total, task) =>
      total +
      Number(
        task.estimatedMinutes || 0
      ),
    0
  );
}


function progressPercent() {
  if (!state.tasks.length) {
    return 0;
  }

  return Math.round(
    (
      completedTasks().length /
      state.tasks.length
    ) * 100
  );
}


/* =========================================================
   PROFESSORAT
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


function teacherQuoteView() {
  const quote =
    teacherQuotes[
      teacherQuoteIndex
    ];

  return `
    <section class="teacher-note">

      <div class="teacher-note-head">

        <div>

          <span class="teacher-label">
            PROFESSORAT
          </span>

          <h3>
            LA VISTA DEL PROFESSORAT
          </h3>

        </div>

        <span class="teacher-counter">
          ${teacherQuoteIndex + 1}
          /
          ${teacherQuotes.length}
        </span>

      </div>


      <div class="teacher-quote">
        “${esc(quote)}”
      </div>


      <div class="teacher-controls">

        <button
          type="button"
          class="teacher-arrow"
          data-action="teacher-prev"
          aria-label="Frase anterior"
        >
          ${icon('arrow', 16)}
        </button>


        <div class="teacher-dots">

          ${teacherQuotes
            .map(
              (_item, index) => `
                <button
                  type="button"
                  class="teacher-dot ${
                    index ===
                    teacherQuoteIndex
                      ? 'active'
                      : ''
                  }"
                  data-action="teacher-dot"
                  data-index="${index}"
                  aria-label="Veure frase ${index + 1}"
                ></button>
              `
            )
            .join('')}

        </div>


        <button
          type="button"
          class="teacher-arrow next"
          data-action="teacher-next"
          aria-label="Frase següent"
        >
          ${icon('arrow', 16)}
        </button>

      </div>

    </section>
  `;
}


/* =========================================================
   DEMÀ
   ========================================================= */

function tomorrowISO() {
  const date =
    new Date();

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

  const month =
    new Intl.DateTimeFormat(
      'ca-ES',
      {
        month: 'long'
      }
    ).format(date);

  return (
    `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date.getDate()} d’${month}`
  );
}


function scheduleWeekdayForDate(
  date
) {
  const map = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];

  return map[
    date.getDay()
  ];
}


function dashboardTomorrowItems() {
  const tomorrow =
    dateFromISO(
      tomorrowISO()
    );

  if (!tomorrow) {
    return [];
  }

  const weekday =
    scheduleWeekdayForDate(
      tomorrow
    );


  const classes =
    state.scheduleEvents
      .filter(event => {

        const day =
          String(
            event.day || ''
          )
            .trim()
            .toLowerCase();

        return (
          day === weekday
        );
      })
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


  const tasks =
    sortTasks(
      state.tasks.filter(
        task =>
          task.status !==
            'completed' &&
          task.dueDate ===
            tomorrowISO()
      )
    );


  const exams =
    sortExams(
      state.exams.filter(
        exam =>
          exam.date ===
          tomorrowISO()
      )
    );


  return [
    ...classes.map(
      event => ({
        type: 'schedule',
        time:
          event.startTime ||
          '—',
        title:
          event.subject ||
          event.title ||
          'Classe',
        subject:
          event.subject || ''
      })
    ),

    ...tasks.map(
      task => ({
        type: 'task',
        time: '—',
        title:
          task.title ||
          'Tasca',
        subject:
          task.subject || ''
      })
    ),

    ...exams.map(
      exam => ({
        type: 'exam',
        time: '—',
        title:
          exam.title ||
          'Examen',
        subject:
          exam.subject || ''
      })
    )
  ];
}


/* =========================================================
   DASHBOARD
   ========================================================= */

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

  const tomorrowItems =
    dashboardTomorrowItems();


  return `
    <div class="page dashboard-page">

      <section class="dashboard-intro">

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
                          ${esc(
                            item.time
                          )}
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
                            item.type === 'task'
                              ? 'TASCA'
                              : item.type === 'exam'
                                ? 'EXAMEN'
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
          `${progressPercent()}%`,
          `${completedTaskMinutes()} / ${totalTaskMinutes()} min`
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
              ${icon('arrow', 13)}
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
              ${icon('arrow', 13)}
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
                ? 'És la primera tasca de la teva llista segons la data de lliurament.'
                : 'TRIA necessita algunes dades acadèmiques per poder ordenar el teu estudi.'
            }
          </p>

        </div>

      </section>


      ${teacherQuoteView()}

    </div>
  `;
}
/* =========================================================
   TASQUES
   ========================================================= */

function taskCard(
  task,
  compact = false
) {
  const status =
    task.status || 'pending';

  const overdue =
    task.dueDate &&
    daysUntil(task.dueDate) < 0 &&
    status !== 'completed';

  return `
    <article
      class="task-card ${
        compact
          ? 'compact'
          : ''
      } ${
        overdue
          ? 'overdue'
          : ''
      }"
    >

      <div class="task-card-main">

        <div class="task-check ${
          status === 'completed'
            ? 'done'
            : ''
        }">
          ${
            status === 'completed'
              ? icon('check', 14)
              : ''
          }
        </div>


        <div class="task-content">

          <strong>
            ${esc(
              task.title ||
              'Tasca'
            )}
          </strong>

          <div class="task-meta">

            ${
              task.subject
                ? `
                  <span>
                    ${esc(
                      task.subject
                    )}
                  </span>
                `
                : ''
            }

            ${
              task.dueDate
                ? `
                  <span>
                    ${esc(
                      formatShortDate(
                        task.dueDate
                      )
                    )}
                  </span>
                `
                : ''
            }

            ${
              task.estimatedMinutes
                ? `
                  <span>
                    ${task.estimatedMinutes} min
                  </span>
                `
                : ''
            }

          </div>

        </div>

      </div>


      <div class="task-card-side">

        <span class="status-pill ${status}">
          ${statusLabel(status)}
        </span>

        ${
          compact
            ? ''
            : `
              <div class="item-actions">

                <button
                  type="button"
                  class="icon-btn"
                  data-action="edit-task"
                  data-id="${task.id}"
                  aria-label="Editar"
                >
                  ${icon('edit', 15)}
                </button>

                <button
                  type="button"
                  class="icon-btn danger"
                  data-action="delete-task"
                  data-id="${task.id}"
                  aria-label="Eliminar"
                >
                  ${icon('trash', 15)}
                </button>

              </div>
            `
        }

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

      <section class="page-intro">

        <div>

          <p class="eyebrow">
            ORGANITZACIÓ
          </p>

          <h2>
            Les teves tasques
          </h2>

          <p>
            Tingues clar què has de fer,
            quan i quant temps et pot ocupar.
          </p>

        </div>

      </section>


      ${
        tasks.length
          ? `
            <section class="list-panel">

              <div class="list-head">

                <strong>
                  ${tasks.length}
                  ${
                    tasks.length === 1
                      ? ' tasca'
                      : ' tasques'
                  }
                </strong>

              </div>

              <div class="task-list">

                ${tasks
                  .map(
                    task =>
                      taskCard(
                        task
                      )
                  )
                  .join('')}

              </div>

            </section>
          `
          : emptyState(
              'Encara no tens tasques',
              'Afegeix la primera tasca per començar a organitzar el teu estudi.',
              `
                <button
                  type="button"
                  class="btn primary"
                  data-action="new-task"
                >
                  ${icon('plus', 15)}
                  Nova tasca
                </button>
              `
            )
      }

    </div>
  `;
}


function openTaskModal(
  taskId = null
) {
  modalMode = 'task';
  editingId = taskId;

  const task =
    taskId
      ? state.tasks.find(
          item =>
            item.id === taskId
        )
      : null;

  const title =
    task
      ? 'Editar tasca'
      : 'Nova tasca';

  const body = `
    <form
      id="task-form"
      class="form-grid"
    >

      <label>
        Nom de la tasca

        <input
          name="title"
          type="text"
          value="${esc(
            task?.title || ''
          )}"
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
          placeholder="Ex. Matemàtiques"
        >
      </label>


      <label class="full">
        Descripció

        <textarea
          name="description"
          rows="4"
          placeholder="Què has de fer?"
        >${esc(
          task?.description || ''
        )}</textarea>
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
          min="5"
          step="5"
          value="${esc(
            task?.estimatedMinutes || 30
          )}"
        >
      </label>


      <label>
        Dificultat

        <select name="difficulty">

          ${[1,2,3,4,5]
            .map(
              value => `
                <option
                  value="${value}"
                  ${
                    Number(
                      task?.difficulty || 3
                    ) === value
                      ? 'selected'
                      : ''
                  }
                >
                  ${difficultyLabel(
                    value
                  )}
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
              (task?.status || 'pending') ===
              'pending'
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

    </form>
  `;


  setModal(
    buildModalHtml(
      title,
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
          ${task ? 'Desar canvis' : 'Crear tasca'}
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

  const task = {
    id:
      editingId ||
      uid('task'),

    title:
      String(
        data.get('title') || ''
      ).trim(),

    subject:
      String(
        data.get('subject') || ''
      ).trim(),

    description:
      String(
        data.get('description') || ''
      ).trim(),

    dueDate:
      String(
        data.get('dueDate') || ''
      ),

    estimatedMinutes:
      Number(
        data.get(
          'estimatedMinutes'
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
        data.get('status') ||
        'pending'
      )
  };


  if (!task.title) {
    showToast(
      'Escriu el nom de la tasca.',
      'error'
    );

    return;
  }


  if (editingId) {
    state.tasks =
      state.tasks.map(
        item =>
          item.id === editingId
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

  showToast(
    editingId
      ? 'Tasca actualitzada.'
      : 'Tasca creada.'
  );
}


function deleteTask(taskId) {
  const task =
    state.tasks.find(
      item =>
        item.id === taskId
    );

  if (!task) {
    return;
  }

  const confirmed =
    window.confirm(
      `Vols eliminar «${task.title}»?`
    );

  if (!confirmed) {
    return;
  }

  state.tasks =
    state.tasks.filter(
      item =>
        item.id !== taskId
    );

  saveState();

  render();

  showToast(
    'Tasca eliminada.'
  );
}
/* =========================================================
   EXÀMENS
   ========================================================= */

function examsView() {
  const exams = sortExams(
    state.exams
  );

  return `
    <div class="page">

      <section class="page-intro">
        <div>
          <p class="eyebrow">
            PREPARACIÓ
          </p>

          <h2>
            Els teus exàmens
          </h2>

          <p>
            Consulta les dates i organitza
            el temps de preparació.
          </p>
        </div>
      </section>

      ${
        exams.length
          ? `
            <section class="list-panel">

              <div class="list-head">
                <strong>
                  ${exams.length}
                  ${
                    exams.length === 1
                      ? ' examen'
                      : ' exàmens'
                  }
                </strong>
              </div>

              <div class="exam-list">

                ${exams
                  .map(
                    exam => `
                      <article class="exam-card">

                        <div class="exam-date-box">
                          <strong>
                            ${esc(
                              dateFromISO(
                                exam.date
                              )?.getDate() || '—'
                            )}
                          </strong>

                          <span>
                            ${
                              dateFromISO(
                                exam.date
                              )
                                ? new Intl.DateTimeFormat(
                                    'ca-ES',
                                    {
                                      month: 'short'
                                    }
                                  ).format(
                                    dateFromISO(
                                      exam.date
                                    )
                                  )
                                : ''
                            }
                          </span>
                        </div>

                        <div class="exam-card-main">

                          <div>
                            <span class="eyebrow">
                              ${esc(
                                exam.subject ||
                                'Assignatura'
                              )}
                            </span>

                            <h3>
                              ${esc(
                                exam.title ||
                                'Examen'
                              )}
                            </h3>
                          </div>

                          ${
                            exam.difficulty
                              ? `
                                <span class="status-pill">
                                  ${difficultyLabel(
                                    exam.difficulty
                                  )}
                                </span>
                              `
                              : ''
                          }

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

                        </div>

                        <div class="item-actions">

                          <button
                            type="button"
                            class="icon-btn"
                            data-action="edit-exam"
                            data-id="${esc(
                              exam.id
                            )}"
                            aria-label="Editar examen"
                          >
                            ${icon(
                              'edit',
                              15
                            )}
                          </button>

                          <button
                            type="button"
                            class="icon-btn danger"
                            data-action="delete-exam"
                            data-id="${esc(
                              exam.id
                            )}"
                            aria-label="Eliminar examen"
                          >
                            ${icon(
                              'trash',
                              15
                            )}
                          </button>

                        </div>

                      </article>
                    `
                  )
                  .join('')}

              </div>

            </section>
          `
          : emptyState(
              'Encara no tens exàmens',
              'Afegeix els teus pròxims exàmens per començar a planificar la preparació.',
              `
                <button
                  type="button"
                  class="btn primary"
                  data-action="new-exam"
                >
                  ${icon('plus', 15)}
                  Nou examen
                </button>
              `
            )
      }

    </div>
  `;
}


function openExamModal(
  examId = null
) {
  modalMode = 'exam';
  editingId = examId;

  const exam =
    examId
      ? state.exams.find(
          item =>
            item.id === examId
        )
      : null;

  const body = `
    <form
      id="exam-form"
      class="form-grid"
    >

      <label>
        Nom de l'examen

        <input
          name="title"
          type="text"
          value="${esc(
            exam?.title || ''
          )}"
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
          placeholder="Ex. Física"
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
        Dificultat

        <select name="difficulty">

          ${[1,2,3,4,5]
            .map(
              value => `
                <option
                  value="${value}"
                  ${
                    Number(
                      exam?.difficulty || 3
                    ) === value
                      ? 'selected'
                      : ''
                  }
                >
                  ${difficultyLabel(
                    value
                  )}
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
          value="${esc(
            exam?.availableMinutes || 0
          )}"
          placeholder="Minuts"
        >
      </label>

      <label class="full">
        Temari

        <textarea
          name="syllabus"
          rows="5"
          placeholder="Temes que entren a l'examen..."
        >${esc(
          exam?.syllabus || ''
        )}</textarea>
      </label>

    </form>
  `;

  setModal(
    buildModalHtml(
      exam
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
            exam
              ? 'Desar canvis'
              : 'Crear examen'
          }
        </button>
      `
    )
  );

  bindModalEvents();
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

  const wasEditing =
    Boolean(editingId);

  const exam = {
    id:
      editingId ||
      uid('exam'),

    title:
      String(
        data.get('title') || ''
      ).trim(),

    subject:
      String(
        data.get('subject') || ''
      ).trim(),

    date:
      String(
        data.get('date') || ''
      ),

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
      ),

    syllabus:
      String(
        data.get('syllabus') || ''
      ).trim()
  };

  if (
    !exam.title ||
    !exam.date
  ) {
    showToast(
      'Completa el nom i la data.',
      'error'
    );

    return;
  }

  if (wasEditing) {
    state.exams =
      state.exams.map(
        item =>
          item.id === editingId
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

  showToast(
    wasEditing
      ? 'Examen actualitzat.'
      : 'Examen creat.'
  );
}


function deleteExam(
  examId
) {
  const exam =
    state.exams.find(
      item =>
        item.id === examId
    );

  if (!exam) {
    return;
  }

  if (
    !window.confirm(
      `Vols eliminar «${exam.title}»?`
    )
  ) {
    return;
  }

  state.exams =
    state.exams.filter(
      item =>
        item.id !== examId
    );

  saveState();

  render();

  showToast(
    'Examen eliminat.'
  );
}


/* =========================================================
   TARGETES D'ESTADÍSTICA
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
        ${icon(
          iconName,
          16
        )}
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
   EMPTY STATE
   ========================================================= */

function emptyState(
  title,
  description,
  action = ''
) {
  return `
    <div class="empty large">

      ${icon(
        'sparkles',
        20
      )}

      <strong>
        ${esc(title)}
      </strong>

      <span>
        ${esc(description)}
      </span>

      ${
        action
          ? `
            <div style="margin-top:14px;">
              ${action}
            </div>
          `
          : ''
      }

    </div>
  `;
}
/* =========================================================
   HORARI
   ========================================================= */

const scheduleDays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday'
];


function scheduleDayName(
  day
) {
  const names = {
    monday: 'Dilluns',
    tuesday: 'Dimarts',
    wednesday: 'Dimecres',
    thursday: 'Dijous',
    friday: 'Divendres'
  };

  return (
    names[
      String(day)
        .toLowerCase()
    ] || day
  );
}


function scheduleView() {
  const hasSchedule =
    state.scheduleEvents.length > 0;

  return `
    <div class="page">

      <section class="page-intro">

        <div>

          <p class="eyebrow">
            HORARI
          </p>

          <h2>
            La teva setmana
          </h2>

          <p>
            Puja una foto del teu horari
            i TRIA convertirà les classes
            en informació organitzada.
          </p>

        </div>

      </section>


      <section
        class="schedule-upload"
        id="schedule-upload"
      >

        <div class="schedule-upload-copy">

          <div class="upload-icon">
            ${icon(
              'camera',
              22
            )}
          </div>

          <div>

            <strong>
              Analitza el teu horari
            </strong>

            <span>
              Selecciona una fotografia clara
              del teu horari.
            </span>

          </div>

        </div>


        <label
          class="btn primary"
          for="schedule-image"
        >
          ${icon(
            'camera',
            15
          )}
          Seleccionar imatge
        </label>

        <input
          id="schedule-image"
          type="file"
          accept="image/*"
          hidden
        >

      </section>


      ${
        hasSchedule
          ? `
            <section class="schedule-grid">

              ${scheduleDays
                .map(
                  day => {

                    const events =
                      state.scheduleEvents
                        .filter(
                          event =>
                            String(
                              event.day ||
                              ''
                            ).toLowerCase() ===
                            day
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
                      <article class="schedule-day">

                        <div class="schedule-day-head">
                          <strong>
                            ${scheduleDayName(
                              day
                            )}
                          </strong>

                          <span>
                            ${events.length}
                          </span>
                        </div>

                        <div class="schedule-day-body">

                          ${
                            events.length
                              ? events
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

                      </article>
                    `;
                  }
                )
                .join('')}

            </section>

            <div class="schedule-actions">

              <button
                type="button"
                class="btn secondary"
                data-action="clear-schedule"
              >
                ${icon(
                  'trash',
                  15
                )}
                Eliminar horari
              </button>

            </div>
          `
          : `
            <section class="schedule-empty-state">

              <div class="empty-icon">
                ${icon(
                  'calendar',
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

            </section>
          `
      }

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
              normaliseScheduleDay(
                event.day
              ),

            startTime:
              normaliseTime(
                event.startTime
              ),

            endTime:
              normaliseTime(
                event.endTime
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
            scheduleDays.includes(
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

    console.error(error);

    showToast(
      error.message ||
      'No s’ha pogut analitzar l’horari.',
      'error'
    );
  }
}


function normaliseScheduleDay(
  value
) {
  const day =
    String(
      value || ''
    )
      .trim()
      .toLowerCase();

  const aliases = {
    dilluns: 'monday',
    lunes: 'monday',
    monday: 'monday',

    dimarts: 'tuesday',
    martes: 'tuesday',
    tuesday: 'tuesday',

    dimecres: 'wednesday',
    miercoles: 'wednesday',
    miércoles: 'wednesday',
    wednesday: 'wednesday',

    dijous: 'thursday',
    jueves: 'thursday',
    thursday: 'thursday',

    divendres: 'friday',
    viernes: 'friday',
    friday: 'friday'
  };

  return (
    aliases[day] ||
    day
  );
}


function normaliseTime(
  value
) {
  const raw =
    String(
      value || ''
    )
      .trim();

  const match =
    raw.match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return '';
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return '';
  }

  return (
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  );
}


/* =========================================================
   REVISIÓ HORARI
   ========================================================= */

function openScheduleReview() {
  const events =
    pendingScheduleEvents;

  const body = `
    <div class="schedule-review-intro">

      <p>
        TRIA ha detectat
        <strong>
          ${events.length}
        </strong>
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

  bindModalEvents();
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

  render();

  showToast(
    'Horari desat correctament.'
  );
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


function clearSchedule() {
  if (
    !window.confirm(
      'Vols eliminar tot l’horari?'
    )
  ) {
    return;
  }

  state.scheduleEvents = [];

  saveState();

  render();

  showToast(
    'Horari eliminat.'
  );
}
/* =========================================================
   PLANIFICADOR
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
    { length: 5 },
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
  const weekday =
    scheduleWeekdayForDate(
      date
    );

  return state.scheduleEvents
    .filter(
      event =>
        String(
          event.day || ''
        ).toLowerCase() ===
        weekday
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

  return sortTasks(
    state.tasks.filter(
      task =>
        task.status !==
          'completed' &&
        task.dueDate === iso
    )
  );
}


function plannerItem(
  item,
  type
) {
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
        ${esc(
          item.title ||
          item.subject ||
          'Element'
        )}
      </strong>

      ${
        item.subject &&
        item.title !==
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

    </article>
  `;
}


function plannerView() {
  const days =
    plannerWeekDays();

  return `
    <div class="page">

      <section class="page-intro">

        <div>

          <p class="eyebrow">
            SETMANA
          </p>

          <h2>
            El teu planificador
          </h2>

          <p>
            Classes, tasques i sessions
            d’estudi en una sola vista.
          </p>

        </div>

      </section>


      ${
        state.plan
          ? `
            <section class="ai-plan-card">

              <div class="ai-plan-head">

                <div>
                  <p class="eyebrow">
                    PLA DE TRIA
                  </p>

                  <h3>
                    Pla d’estudi actual
                  </h3>
                </div>

                <span class="status-pill">
                  IA
                </span>

              </div>

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
                ) &&
                state.plan.sessions.length
                  ? `
                    <div class="plan-session-list">

                      ${state.plan.sessions
                        .map(
                          session => `
                            <div class="plan-session">

                              <span>
                                ${esc(
                                  session.date ||
                                  ''
                                )}
                              </span>

                              <strong>
                                ${esc(
                                  session.title ||
                                  session.task ||
                                  'Sessió d’estudi'
                                )}
                              </strong>

                              <small>
                                ${
                                  Number(
                                    session.minutes ||
                                    0
                                  )
                                } min
                              </small>

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


      <section class="planner-week">

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

              return `
                <article class="planner-day">

                  <header>

                    <strong>
                      ${esc(
                        new Intl.DateTimeFormat(
                          'ca-ES',
                          {
                            weekday: 'long'
                          }
                        ).format(
                          date
                        )
                      )}
                    </strong>

                    <span>
                      ${date.getDate()}
                    </span>

                  </header>


                  <div class="planner-day-body">

                    ${
                      events.length
                        ? events
                            .map(
                              event =>
                                plannerItem(
                                  event,
                                  'schedule'
                                )
                            )
                            .join('')
                        : ''
                    }

                    ${
                      tasks.length
                        ? tasks
                            .map(
                              task =>
                                plannerItem(
                                  task,
                                  'task'
                                )
                            )
                            .join('')
                        : ''
                    }

                    ${
                      !events.length &&
                      !tasks.length
                        ? `
                          <div class="planner-empty">
                            Sense elements
                          </div>
                        `
                        : ''
                    }

                  </div>

                </article>
              `;
            }
          )
          .join('')}

      </section>

    </div>
  `;
}


/* =========================================================
   IA · PLA D'ESTUDI
   ========================================================= */

async function recalculatePlan() {
  if (
    !state.tasks.length &&
    !state.exams.length
  ) {
    showToast(
      'Afegeix tasques o exàmens abans de crear un pla.',
      'info'
    );

    return;
  }

  showToast(
    'TRIA està creant el teu pla...',
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
                state.exams,

              scheduleEvents:
                state.scheduleEvents
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

    render();

    showToast(
      'Pla d’estudi actualitzat.'
    );

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      'No s’ha pogut crear el pla.',
      'error'
    );
  }
}
/* =========================================================
   CHAT IA
   ========================================================= */

function chatMarkdown(
  text = ''
) {
  const safe =
    esc(text);

  return safe
    .split(/\n\s*\n/)
    .map(
      paragraph =>
        `<p>${paragraph.replace(
          /\n/g,
          '<br>'
        )}</p>`
    )
    .join('');
}


function ensureWelcomeMessage() {
  if (state.chat.length) {
    return;
  }

  state.chat.push({
    id: uid('chat'),
    role: 'assistant',
    content:
      'Hola! Soc la IA d’estudi de TRIA. Puc ajudar-te a ordenar tasques, preparar exàmens i planificar el teu temps d’estudi.'
  });

  saveState();
}


function chatView() {
  ensureWelcomeMessage();

  return `
    <div class="page">

      <section class="page-intro">

        <div>

          <p class="eyebrow">
            IA D’ESTUDI
          </p>

          <h2>
            Parla amb TRIA
          </h2>

          <p>
            Pregunta sobre les teves tasques,
            exàmens o organització.
          </p>

        </div>

      </section>


      <section class="chat-panel">

        <div
          class="chat-messages"
          id="chat-messages"
        >

          ${state.chat
            .map(
              message => `
                <div
                  class="chat-message ${
                    message.role === 'user'
                      ? 'user'
                      : 'assistant'
                  }"
                >

                  <div class="chat-bubble">

                    ${
                      message.role ===
                      'assistant'
                        ? chatMarkdown(
                            message.content
                          )
                        : `
                          <p>
                            ${esc(
                              message.content
                            )}
                          </p>
                        `
                    }

                  </div>

                </div>
              `
            )
            .join('')}

        </div>


        <form
          id="chat-form"
          class="chat-form"
        >

          <input
            id="chat-input"
            type="text"
            placeholder="Pregunta alguna cosa a TRIA..."
            autocomplete="off"
            required
          >

          <button
            type="submit"
            class="btn primary"
          >
            Enviar
            ${icon(
              'arrow',
              15
            )}
          </button>

        </form>

      </section>

    </div>
  `;
}


async function sendChatMessage(
  event
) {
  event.preventDefault();

  const input =
    document.querySelector(
      '#chat-input'
    );

  if (!input) {
    return;
  }

  const message =
    input.value.trim();

  if (!message) {
    return;
  }

  state.chat.push({
    id: uid('chat'),
    role: 'user',
    content: message
  });

  saveState();

  input.value = '';

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
      await response.json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      throw new Error(
        data.error ||
        'No s’ha pogut contactar amb la IA.'
      );
    }

    state.chat.push({
      id: uid('chat'),
      role: 'assistant',
      content:
        data.answer ||
        'No he rebut cap resposta.'
    });

    saveState();

    render();

  } catch (error) {

    console.error(error);

    state.chat.push({
      id: uid('chat'),
      role: 'assistant',
      content:
        `No he pogut respondre ara mateix. ${error.message || ''}`
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
    completedTasks().length;

  const pending =
    pendingTasks().length;

  const totalMinutes =
    totalTaskMinutes();

  const completedMinutes =
    completedTaskMinutes();

  const percent =
    progressPercent();

  return `
    <div class="page">

      <section class="page-intro">

        <div>

          <p class="eyebrow">
            PROGRÉS
          </p>

          <h2>
            Com avança el teu estudi
          </h2>

          <p>
            Una visió senzilla del que
            ja has fet i del que queda.
          </p>

        </div>

      </section>


      <section class="stats-grid">

        ${statCard(
          'check',
          'Completades',
          String(
            completed
          ),
          `de ${total} tasques`
        )}

        ${statCard(
          'tasks',
          'Pendents',
          String(
            pending
          ),
          'Per completar'
        )}

        ${statCard(
          'clock',
          'Temps estimat',
          `${totalMinutes} min`,
          'Tasques totals'
        )}

        ${statCard(
          'progress',
          'Progrés',
          `${percent}%`,
          `${completedMinutes} min completats`
        )}

      </section>


      <section class="progress-panel">

        <div class="progress-panel-head">

          <div>

            <p class="eyebrow">
              RESUM
            </p>

            <h3>
              Progrés de tasques
            </h3>

          </div>

          <strong>
            ${percent}%
          </strong>

        </div>


        <div class="progress-bar">
          <span
            style="width:${percent}%"
          ></span>
        </div>


        <div class="progress-breakdown">

          <span>
            ${completed} completades
          </span>

          <span>
            ${pending} pendents
          </span>

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

      <section class="page-intro">

        <div>

          <p class="eyebrow">
            AVALUACIÓ
          </p>

          <h2>
            Com funciona TRIA
          </h2>

          <p>
            Aquest resum mostra les dades
            acadèmiques que TRIA utilitza
            per ajudar-te a organitzar-te.
          </p>

        </div>

      </section>


      <section class="evaluation-grid">

        <article class="panel">

          <p class="eyebrow">
            DADES
          </p>

          <h3>
            Informació utilitzada
          </h3>

          <ul class="evaluation-list">

            <li>
              Tasques i dates de lliurament
            </li>

            <li>
              Dificultat i temps estimat
            </li>

            <li>
              Exàmens i temari
            </li>

            <li>
              Horari de classes
            </li>

            <li>
              Progrés de les tasques
            </li>

          </ul>

        </article>


        <article class="panel">

          <p class="eyebrow">
            IA
          </p>

          <h3>
            Recomanacions
          </h3>

          <p>
            TRIA pot proposar prioritats
            i plans d’estudi a partir de
            les dades que introdueixes.
          </p>

          <p>
            Tu pots modificar sempre
            les recomanacions i decidir
            com organitzes el teu temps.
          </p>

        </article>


        <article class="panel">

          <p class="eyebrow">
            RESUM
          </p>

          <h3>
            Activitat actual
          </h3>

          <div class="evaluation-stats">

            <div>
              <strong>
                ${state.tasks.length}
              </strong>
              <span>
                tasques
              </span>
            </div>

            <div>
              <strong>
                ${state.exams.length}
              </strong>
              <span>
                exàmens
              </span>
            </div>

            <div>
              <strong>
                ${state.scheduleEvents.length}
              </strong>
              <span>
                classes
              </span>
            </div>

          </div>

        </article>

      </section>

    </div>
  `;
}
/* =========================================================
   VISTES
   ========================================================= */

const views = {
  dashboard: dashboardView,
  tasks: tasksView,
  exams: examsView,
  schedule: scheduleView,
  planner: plannerView,
  chat: chatView,
  progress: progressView,
  settings: settingsView
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
        <div class="auth-card">
          <div class="auth-brand">
            <div class="auth-mark">
              ${icon(
                'sparkles',
                19
              )}
            </div>

            <div class="auth-brand-text">
              <strong>
                TRIA
              </strong>

              <span>
                ${APP_AUTHOR}
              </span>
            </div>
          </div>

          <p>
            Carregant...
          </p>
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
   EVENTOS LOGIN
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


  document
    .querySelectorAll(
      '[data-action="toggle-auth"]'
    )
    .forEach(
      button => {
        button.addEventListener(
          'click',
          toggleAuthMode
        );
      }
    );
}


/* =========================================================
   EVENTOS MODAL
   ========================================================= */

function bindModalEvents() {
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
}


/* =========================================================
   EVENTOS PRINCIPALES
   ========================================================= */

function bindPageEvents() {

  /* -------------------------------------------------------
     NAVEGACIÓN
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
     NUEVA TASCA
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
     NUEVO EXAMEN
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
     RECALCULAR IA
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
     HORARI · IMATGE
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
          clearSchedule
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
      sendChatMessage
    );
  }


  /* -------------------------------------------------------
     PROFESSORAT · ANTERIOR
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


  /* -------------------------------------------------------
     PROFESSORAT · SEGÜENT
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     PROFESSORAT · PUNTS
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-action="teacher-dot"]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const index =
              Number(
                button.dataset.index
              );

            if (
              Number.isNaN(
                index
              )
            ) {
              return;
            }

            teacherQuoteIndex =
              index;

            render();

          }
        );

      }
    );


  /* -------------------------------------------------------
     MODAL
     ------------------------------------------------------- */

  bindModalEvents();
}


/* =========================================================
   INICI
   ========================================================= */

initAuth();
