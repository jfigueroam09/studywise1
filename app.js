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

let pendingScheduleEvents = [];


/* =========================================================
   AUTENTICACIÓ
   ========================================================= */

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);

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
    KEY,
    JSON.stringify(state)
  );
}


async function initAuth() {

  const {
    data
  } = await supabase.auth.getSession();

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
    document.querySelector('#auth-error');

  const successBox =
    document.querySelector('#auth-success');

  const button =
    document.querySelector('.auth-submit');

  errorBox.classList.add('hidden');

  successBox.classList.add('hidden');

  button.disabled = true;

  button.textContent =
    authMode === 'login'
      ? 'Iniciant sessió...'
      : 'Creant compte...';

  try {

    if (authMode === 'login') {

      const {
        error
      } =
        await supabase.auth.signInWithPassword({
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
        await supabase.auth.signUp({
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

    button.disabled = false;

    button.textContent =
      authMode === 'login'
        ? 'Iniciar sessió'
        : 'Crear compte';
  }
}


function authErrorMessage(error) {

  const message =
    String(error?.message || '');

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
    structuredClone(defaultState);

  currentPage = 'dashboard';

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
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function todayISO() {

  const d = new Date();

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
    new Date(`${value}T12:00:00`);

  if (Number.isNaN(d.getTime())) {
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
    new Date(`${value}T23:59:59`);

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
  }[Number(value)] || 'Mitjana';
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
        /^\s*\d+\.\s+(.+)$/gm,
        '<li>$1</li>'
      )
      .replace(
        /\n/g,
        '<br>'
      );

  return html;
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

    calendar:
      '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/>',

    clock:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',

    arrow:
      '<path d="M5 12h14M13 6l6 6-6 6"/>',

    close:
      '<path d="m6 6 12 12M18 6 6 18"/>',

    refresh:
      '<path d="M20 11a8.1 8.1 0 0 0-14.7-4L3 10"/><path d="M3 4v6h6"/><path d="M4 13a8.1 8.1 0 0 0 14.7 4L21 14"/><path d="M21 20v-6h-6"/>',

    download:
      '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'
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
            `${completedMinutes} / ${totalMinutes || 0} min`,
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
                  .join('') ||

                `
                  <div class="empty">
                    No tens tasques pendents.
                    Afegeix-ne una per començar.
                  </div>
                `
              }

            </div>

          </section>

          <section class="panel">

            <div class="panel-head">

              <div>

                <p class="eyebrow">
                  Calendari acadèmic
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

            <div class="exam-list">

              ${
                upcomingExams.map(
                  exam => `
                    <div class="exam-row">

                      <div class="date-box">

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
                                month: 'short'
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
                          ${esc(exam.subject)}
                        </strong>

                        <span>
                          ${esc(
                            exam.syllabus ||
                            'Sense temari'
                          )}
                        </span>

                      </div>

                      <span class="badge">
                        ${difficultyLabel(
                          exam.difficulty
                        )}
                      </span>

                    </div>
                  `
                ).join('') ||

                `
                  <div class="empty">
                    No hi ha exàmens registrats.
                  </div>
                `
              }

            </div>

          </section>

        </div>

        <section class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                Pla actual
              </p>

              <h2>
                ${
                  state.plan?.summary
                    ? 'Recomanació de la IA'
                    : 'Encara no tens un pla generat'
                }
              </h2>

            </div>

            <button
              class="btn secondary"
              data-action="recalculate"
            >
              ${icon('refresh', 16)}
              Recalcular
            </button>

          </div>

          <p class="plan-summary">
            ${esc(
              state.plan?.summary ||
              'Afegeix tasques i exàmens i prem «Recalcular amb IA» per generar una proposta.'
            )}
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
    [...state.tasks].sort(
      (a, b) =>
        a.dueDate.localeCompare(
          b.dueDate
        )
    );

  return `
    <div class="page">

      <div class="toolbar">

        <div>

          <p class="eyebrow">
            Gestió
          </p>

          <h2>
            Totes les tasques
          </h2>

        </div>

      </div>

      <div class="task-list">

        ${
          tasks
            .map(taskCard)
            .join('') ||

          `
            <div class="empty large">
              Encara no tens tasques.
              Crea la primera amb el botó
              «Nova tasca».
            </div>
          `
        }

      </div>

    </div>
  `;
}


/* =========================================================
   EXÀMENS
   ========================================================= */

function examsView() {

  const exams =
    [...state.exams].sort(
      (a, b) =>
        a.date.localeCompare(
          b.date
        )
    );

  return `
    <div class="page">

      <div class="toolbar">

        <div>

          <p class="eyebrow">
            Calendari
          </p>

          <h2>
            Exàmens
          </h2>

        </div>

      </div>

      <div class="exam-grid">

        ${
          exams.map(
            exam => `
              <article class="exam-card">

                <div class="exam-card-top">

                  <span class="badge">
                    ${esc(exam.subject)}
                  </span>

                  <span class="status pending">
                    ${formatDate(exam.date)}
                  </span>

                </div>

                <h3>
                  ${esc(exam.subject)}
                </h3>

                <p>
                  ${esc(
                    exam.syllabus ||
                    'Sense temari definit.'
                  )}
                </p>

                <div class="exam-details">

                  <span>
                    Dificultat:
                    ${difficultyLabel(
                      exam.difficulty
                    )}
                  </span>

                  <span>
                    Temps disponible:
                    ${Number(
                      exam.availableMinutes ||
                      0
                    )}
                    min
                  </span>

                </div>

                <div class="card-actions">

                  <button
                    class="btn secondary"
                    data-action="edit-exam"
                    data-id="${exam.id}"
                  >
                    ${icon('edit', 15)}
                    Editar
                  </button>

                  <button
                    class="btn ghost danger-btn"
                    data-action="delete-exam"
                    data-id="${exam.id}"
                  >
                    ${icon('trash', 15)}
                    Eliminar
                  </button>

                </div>

              </article>
            `
          ).join('') ||

          `
            <div class="empty large">
              No hi ha exàmens registrats.
            </div>
          `
        }

      </div>

    </div>
  `;
}


/* =========================================================
   HORARI · CLASSES I ESCANEIG IA
   ========================================================= */

const scheduleDays = [
  ['monday', 'Dilluns'],
  ['tuesday', 'Dimarts'],
  ['wednesday', 'Dimecres'],
  ['thursday', 'Dijous'],
  ['friday', 'Divendres']
];


function scheduleView() {

  const grouped = Object.fromEntries(
    scheduleDays.map(([key]) => [
      key,
      state.scheduleEvents
        .filter(event => event.day === key)
        .sort((a, b) =>
          String(a.startTime || '').localeCompare(
            String(b.startTime || '')
          )
        )
    ])
  );

  return `
    <div class="page">

      <div class="toolbar schedule-toolbar">

        <div>

          <p class="eyebrow">
            HORARI PERSONAL
          </p>

          <h2>
            El teu horari
          </h2>

          <p class="muted">
            Fes una foto del teu horari i deixa que TRIA el llegeixi.
          </p>

        </div>

        <div class="schedule-toolbar-actions">

          <input
            id="schedule-image-input"
            class="schedule-file-input"
            type="file"
            accept="image/*"
            capture="environment"
          >

          <button
            class="btn primary"
            data-action="scan-schedule"
          >
            ${icon('camera', 17)}
            Fes una foto del meu horari
          </button>

          <button
            class="btn secondary"
            data-action="new-schedule-event"
          >
            ${icon('plus', 17)}
            Afegir classe
          </button>

        </div>

      </div>

      <section class="schedule-import-card">

        <div class="schedule-import-icon">
          ${icon('sparkles', 20)}
        </div>

        <div>

          <strong>
            La IA pot crear-lo per tu
          </strong>

          <p>
            Fotografia l'horari de l'institut. TRIA detectarà
            els dies, les hores i les assignatures i et deixarà
            revisar el resultat abans de guardar-lo.
          </p>

        </div>

      </section>

      <section class="schedule-board">

        ${scheduleDays.map(
          ([dayKey, dayLabel]) => `
            <div class="schedule-day">

              <div class="schedule-day-head">

                <span>
                  ${dayLabel}
                </span>

                <small>
                  ${grouped[dayKey].length}
                  classe${grouped[dayKey].length === 1 ? '' : 's'}
                </small>

              </div>

              <div class="schedule-day-list">

                ${
                  grouped[dayKey].map(
                    event => `
                      <article class="schedule-event-card">

                        <div class="schedule-event-time">

                          <strong>
                            ${esc(event.startTime)}
                          </strong>

                          <span>
                            ${esc(event.endTime)}
                          </span>

                        </div>

                        <div class="schedule-event-main">

                          <strong>
                            ${esc(event.title)}
                          </strong>

                          <span>
                            ${esc(event.subject || '')}
                          </span>

                          ${
                            event.notes
                              ? `<small>${esc(event.notes)}</small>`
                              : ''
                          }

                        </div>

                        <span class="schedule-type">
                          ${scheduleTypeLabel(event.type)}
                        </span>

                        <div class="schedule-event-actions">

                          <button
                            class="icon-btn"
                            data-action="edit-schedule-event"
                            data-id="${event.id}"
                            aria-label="Editar"
                          >
                            ${icon('edit', 15)}
                          </button>

                          <button
                            class="icon-btn danger-icon"
                            data-action="delete-schedule-event"
                            data-id="${event.id}"
                            aria-label="Eliminar"
                          >
                            ${icon('trash', 15)}
                          </button>

                        </div>

                      </article>
                    `
                  ).join('') ||

                  `
                    <div class="schedule-empty">

                      <span>
                        No hi ha classes registrades.
                      </span>

                      <button
                        class="btn ghost"
                        data-action="new-schedule-event"
                        data-day="${dayKey}"
                      >
                        Afegir
                      </button>

                    </div>
                  `
                }

              </div>

            </div>
          `
        ).join('')}

      </section>

      ${
        state.scheduleEvents.length
          ? `
            <section class="schedule-ai-note">

              ${icon('sparkles', 17)}

              <div>

                <strong>
                  Horari connectat amb la IA
                </strong>

                <p>
                  Quan creïs o recalculis el teu pla d'estudi,
                  TRIA tindrà en compte aquestes hores ocupades.
                </p>

              </div>

            </section>
          `
          : ''
      }

    </div>
  `;
}


function normalizeScheduleTime(
  value,
  fallback = ''
) {

  const raw =
    String(value ?? '').trim();

  if (!raw) {
    return fallback;
  }

  // HH:MM
  let match =
    raw.match(
      /^(?:[01]?\d|2[0-3]):([0-5]\d)$/
    );

  if (match) {

    const [
      hour,
      minute
    ] =
      raw.split(':');

    return `${hour.padStart(
      2,
      '0'
    )}:${minute}`;
  }

  // H.MM / HH.MM / HhMM / HHhMM
  const compact =
    raw
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(
        /[.,h]/g,
        ':'
      );

  match =
    compact.match(
      /^(\d{1,2}):(\d{2})$/
    );

  if (match) {

    const hour =
      Number(match[1]);

    const minute =
      Number(match[2]);

    if (
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return `${String(
        hour
      ).padStart(
        2,
        '0'
      )}:${String(
        minute
      ).padStart(
        2,
        '0'
      )}`;
    }
  }

  // H / HH
  match =
    raw.match(
      /^(\d{1,2})$/
    );

  if (match) {

    const hour =
      Number(match[1]);

    if (
      hour >= 0 &&
      hour <= 23
    ) {
      return `${String(
        hour
      ).padStart(
        2,
        '0'
      )}:00`;
    }
  }

  return fallback;
}


function normalizeScheduleEvent(
  event,
  index = 0
) {

  const startTime =
    normalizeScheduleTime(
      event?.startTime,
      ''
    );

  const endTime =
    normalizeScheduleTime(
      event?.endTime,
      ''
    );

  return {

    id:
      event?.id ||
      uid(`schedule-${index}`),

    title:
      String(
        event?.title || ''
      ).trim(),

    subject:
      String(
        event?.subject || ''
      ).trim(),

    type:
      [
        'class',
        'exam',
        'study',
        'personal'
      ].includes(
        event?.type
      )
        ? event.type
        : 'class',

    day:
      scheduleDays.some(
        ([value]) =>
          value === event?.day
      )
        ? event.day
        : 'monday',

    startTime,

    endTime,

    notes:
      String(
        event?.notes || ''
      ).trim()

  };
}


function scheduleTypeLabel(type) {

  const labels = {

    class: 'Classe',

    exam: 'Examen',

    study: 'Estudi',

    personal: 'Personal'

  };

  return (
    labels[type] ||
    'Classe'
  );
}


function openScheduleEventModal(
  id = null
) {

  modalMode =
    'schedule-event';

  editingId = id;

  const event =
    id
      ? state.scheduleEvents.find(
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
    'HORARI';

  document.querySelector(
    '#modal-title'
  ).textContent =
    event
      ? 'Editar activitat'
      : 'Nova activitat';

  form.innerHTML = `

    <div class="form-grid">

      <label class="full">

        Títol

        <input
          name="title"
          required
          value="${esc(
            event?.title || ''
          )}"
          placeholder="Ex. Matemàtiques"
        >

      </label>

      <label>

        Assignatura

        <input
          name="subject"
          value="${esc(
            event?.subject || ''
          )}"
          placeholder="Ex. Matemàtiques"
        >

      </label>

      <label>

        Tipus

        <select name="type">

          ${[
            ['class', 'Classe'],
            ['exam', 'Examen'],
            ['study', 'Estudi'],
            ['personal', 'Personal']
          ].map(
            ([value, label]) => `
              <option
                value="${value}"
                ${
                  (
                    event?.type ||
                    'class'
                  ) === value
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

        Dia

        <select name="day">

          ${scheduleDays.map(
            ([value, label]) => `
              <option
                value="${value}"
                ${
                  (
                    event?.day ||
                    'monday'
                  ) === value
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
            event?.startTime ||
            '08:00'
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
            event?.endTime ||
            '09:00'
          )}"
        >

      </label>

      <label class="full">

        Notes

        <textarea
          name="notes"
          rows="3"
          placeholder="Opcional"
        >${esc(
          event?.notes ||
          ''
        )}</textarea>

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
        Guardar activitat
      </button>

    </div>
  `;

  form.onsubmit =
    saveScheduleEventFromForm;

  modal.classList.remove(
    'hidden'
  );
}
          <div class="setting-row">

            <span>
              Missatges d'IA
            </span>

            <strong>
              ${state.chat.length}
            </strong>

          </div>

        </section>

        <section class="panel">

          <div class="panel-head">

            <div>

              <p class="eyebrow">
                Dades
              </p>

              <h2>
                Gestió de dades
              </h2>

            </div>

          </div>

          <p class="muted">
            Les dades acadèmiques d'aquesta versió
            es guarden localment en aquest navegador.
          </p>

          <div class="card-actions">

            <button
              class="btn secondary"
              data-action="export"
            >
              ${icon('download', 16)}
              Exportar dades
            </button>

            <button
              class="btn ghost danger-btn"
              data-action="reset-data"
            >
              ${icon('trash', 15)}
              Esborrar dades
            </button>

          </div>

        </section>

      </div>

    </div>
  `;
}


/* =========================================================
   RENDER
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
      <div class="auth-loading">
        Carregant TRIA...
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

  const view =
    views[currentPage] ||
    dashboardView;

  content.innerHTML =
    view();

  bindEvents();
}


/* =========================================================
   ESDEVENIMENTS
   ========================================================= */

function bindEvents() {

  document
    .querySelectorAll(
      '[data-page]'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          currentPage =
            button.dataset.page;

          render();

        }
      );

    });


  document
    .querySelectorAll(
      '[data-action]'
    )
    .forEach(element => {

      element.addEventListener(
        'click',
        handleAction
      );

    });


  const scheduleInput =
    document.querySelector(
      '#schedule-image-input'
    );

  if (scheduleInput) {

    scheduleInput.addEventListener(
      'change',
      handleScheduleImage
    );

  }


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


function handleAction(event) {

  const target =
    event.currentTarget;

  const action =
    target.dataset.action;

  const id =
    target.dataset.id;


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
    'new-schedule-event'
  ) {

    openScheduleEventModal();

    return;
  }


  if (
    action ===
    'edit-schedule-event'
  ) {

    openScheduleEventModal(id);

    return;
  }


  if (
    action ===
    'delete-schedule-event'
  ) {

    deleteScheduleEvent(id);

    return;
  }


  if (
    action ===
    'scan-schedule'
  ) {

    const input =
      document.querySelector(
        '#schedule-image-input'
      );

    if (input) {
      input.click();
    }

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

    generatePlan();

    return;
  }


  if (
    action ===
    'logout'
  ) {

    logout();

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
    'reset-data'
  ) {

    resetData();

    return;
  }


  if (
    action ===
    'toggle-auth'
  ) {

    toggleAuthMode();

    return;
  }

}


/* =========================================================
   TASQUES · MODAL
   ========================================================= */

function openTaskModal(
  id = null
) {

  modalMode =
    'task';

  editingId = id;

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
    'TASQUES';

  document.querySelector(
    '#modal-title'
  ).textContent =
    task
      ? 'Editar tasca'
      : 'Nova tasca';


  form.innerHTML = `

    <div class="form-grid">

      <label class="full">

        Nom de la tasca

        <input
          name="title"
          required
          value="${esc(
            task?.title ||
            ''
          )}"
          placeholder="Ex. Fer exercicis de matemàtiques"
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


      <label class="full">

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
          ].map(
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
          ).join('')}

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
          ].map(
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
          ).join('')}

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

    minutes:
      Number(
        data.get('minutes') ||
        30
      ),

    difficulty:
      Number(
        data.get('difficulty') ||
        3
      ),

    status:
      String(
        data.get('status') ||
        'pending'
      )

  };


  if (!item.title) {

    alert(
      'Escriu el nom de la tasca.'
    );

    return;
  }


  if (!item.dueDate) {

    alert(
      'Selecciona una data de lliurament.'
    );

    return;
  }


  if (editingId) {

    state.tasks =
      state.tasks.map(
        current =>
          current.id ===
          editingId
            ? item
            : current
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
      `Vols eliminar la tasca «${task.title}»?`
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
   EXÀMENS · MODAL
   ========================================================= */

function openExamModal(
  id = null
) {

  modalMode =
    'exam';

  editingId = id;

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


      <label class="full">

        Temari

        <textarea
          name="syllabus"
          rows="4"
          placeholder="Temes que entren a l'examen..."
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

          ${[
            [1, 'Baixa'],
            [2, 'Baixa'],
            [3, 'Mitjana'],
            [4, 'Alta'],
            [5, 'Alta']
          ].map(
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
          ).join('')}

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
            0
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
        Assignatura

        <input
          name="subject"
          required
          value="${esc(
            exam?.subject || ''
          )}"
          placeholder="Ex. Matemàtiques"
        >

      </label>

      <label>

        Data de l'examen

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
          rows="4"
          placeholder="Temes que entren..."
        >${esc(
          exam?.syllabus || ''
        )}</textarea>

      </label>

      <label>

        Dificultat

        <select
          name="difficulty"
        >

          ${
            [1, 2, 3, 4, 5]
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
                    ${difficultyLabel(n)}
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
          step="5"
          value="${Number(
            exam?.availableMinutes ||
            0
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
      String(
        data.get('date') ||
        ''
      ),

    syllabus:
      String(
        data.get('syllabus') ||
        ''
      ).trim(),

    difficulty:
      Number(
        data.get('difficulty') ||
        3
      ),

    availableMinutes:
      Number(
        data.get(
          'availableMinutes'
        ) ||
        0
      )

  };

  if (!item.subject) {

    alert(
      'Escriu l’assignatura de l’examen.'
    );

    return;
  }

  if (!item.date) {

    alert(
      'Selecciona la data de l’examen.'
    );

    return;
  }

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


function deleteExam(
  id
) {

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

  const form =
    document.querySelector(
      '#modal-form'
    );

  if (form) {
    form.innerHTML = '';
    form.onsubmit = null;
  }

  modalMode = null;

  editingId = null;

  pendingScheduleEvents = [];
}


/* =========================================================
   IA · PLA D'ESTUDI
   ========================================================= */

async function generatePlan() {

  const button =
    document.querySelector(
      '[data-action="recalculate"]'
    );

  if (button) {

    button.disabled = true;

    button.innerHTML =
      `${icon(
        'sparkles',
        17
      )} Calculant...`;

  }

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
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.error ||
        'No s’ha pogut generar el pla.'
      );

    }

    state.plan =
      data.plan ||
      data;

    saveState();

    render();

  } catch (error) {

    alert(
      `No s’ha pogut generar el pla: ${error.message}`
    );

  } finally {

    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        `${icon(
          'sparkles',
          17
        )} Recalcular amb IA`;

    }

  }
}


/* =========================================================
   IA · XAT
   ========================================================= */

async function sendChat(
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

    role:
      'user',

    text:
      message

  });

  input.value = '';

  saveState();

  render();

  const chatBox =
    document.querySelector(
      '#chat-messages'
    );

  if (chatBox) {

    chatBox.scrollTop =
      chatBox.scrollHeight;

  }

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
        'No s’ha pogut contactar amb la IA.'
      );

    }

    state.chat.push({

      role:
        'assistant',

      text:
        data.answer ||
        'No he rebut cap resposta.'

    });

    saveState();

    render();

  } catch (error) {

    state.chat.push({

      role:
        'assistant',

      text:
        `No s’ha pogut contactar amb la IA: ${error.message}`

    });

    saveState();

    render();

  }
}


/* =========================================================
   EXPORTACIÓ
   ========================================================= */

function exportData() {

  const payload = {

    exportedAt:
      new Date().toISOString(),

    tasks:
      state.tasks,

    exams:
      state.exams,

    scheduleEvents:
      state.scheduleEvents,

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

  link.href =
    url;

  link.download =
    'tria-dades.json';

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
   RESTABLIR DADES
   ========================================================= */

function resetData() {

  if (
    !confirm(
      'Vols restablir totes les dades de TRIA? Aquesta acció no es pot desfer.'
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

        <input
          name="subject"
          required
          value="${esc(
            exam?.subject || ''
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
          exam?.syllabus || ''
        )}</textarea>

      </label>

      <label>

        Dificultat

        <select
          name="difficulty"
        >

          ${
            [1, 2, 3, 4, 5]
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
                    ${difficultyLabel(n)}
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
          exam.id === editingId
            ? item
            : exam
      );

  } else {

    state.exams.push(item);

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
                state.exams,

              scheduleEvents:
                state.scheduleEvents
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
                  String(task.id) ===
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
                  String(exam.id) ===
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

    state.plan =
      data;

    saveState();

    alert(
      'Pla actualitzat correctament.'
    );

    render();

  } catch (error) {

    alert(
      `No s’ha pogut generar el pla: ${error.message}`
    );

    buttons.forEach(
      button => {

        button.disabled =
          false;

        button.innerHTML =
          `${icon(
            'sparkles',
            17
          )} Recalcular amb IA`;

      }
    );

  }
}


/* =========================================================
   IA · XAT
   ========================================================= */

async function sendChat(event) {

  event.preventDefault();

  const input =
    document.querySelector(
      '#chat-input'
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
      state.scheduleEvents,

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

  const a =
    document.createElement(
      'a'
    );

  a.href = url;

  a.download =
    `tria-dades-${todayISO()}.json`;

  a.click();

  URL.revokeObjectURL(
    url
  );
}


/* =========================================================
   RESTABLIR
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


document.addEventListener(
  'click',
  event => {

    if (
      event.target?.id ===
      'modal'
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   INICI
   ========================================================= */

initAuth();
