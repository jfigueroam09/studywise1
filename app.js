const KEY='tria';

const uid=()=>crypto.randomUUID();

const addDays=n=>{
  let d=new Date();
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
};

const days=d=>
  Math.ceil(
    (new Date(d+'T23:59:59')-Date.now())/86400000
  );

const fmt=d=>
  new Intl.DateTimeFormat('ca-ES',{
    day:'numeric',
    month:'short'
  }).format(new Date(d+'T12:00'));

const esc=s=>
  String(s??'').replace(
    /[&<>"']/g,
    c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c])
  );


const seed={
  tasks:[
    {
      id:uid(),
      title:'Exercicis de derivades',
      subject:'Matemàtiques',
      description:'Pràctica del full 4.',
      dueDate:addDays(1),
      minutes:60,
      difficulty:4,
      status:'pending'
    },
    {
      id:uid(),
      title:'Comentari de text',
      subject:'Llengua',
      description:'Esborrany i revisió.',
      dueDate:addDays(3),
      minutes:45,
      difficulty:3,
      status:'in_progress'
    },
    {
      id:uid(),
      title:'Preparar presentació',
      subject:'Història',
      description:'Diapositives i assaig.',
      dueDate:addDays(6),
      minutes:90,
      difficulty:4,
      status:'pending'
    }
  ],

  exams:[
    {
      id:uid(),
      subject:'Física',
      date:addDays(3),
      syllabus:'Dinàmica i energia',
      difficulty:5,
      studyMinutes:240
    }
  ],

  plan:null,
  logs:[],
  changes:[],
  chat:[]
};


let data=
  JSON.parse(localStorage.getItem(KEY)||'null')||seed;

let view='dashboard';
let modal=null;
let editing=null;
let busy=false;

const save=()=>{
  localStorage.setItem(KEY,JSON.stringify(data));
};

const setData=p=>{
  data={...data,...p};
  save();
  render();
};


const nav=[
  ['dashboard','Tauler','layout-dashboard'],
  ['tasks','Tasques','list-todo'],
  ['exams','Exàmens','graduation-cap'],
  ['planner','Planificador','calendar-days'],
  ['chat',"IA d'estudi",'message-circle'],
  ['progress','Progrés','check-circle-2'],
  ['settings','Avaluació','settings-2']
];


function icon(n){

  const m={
    sparkles:'✦',
    plus:'＋',
    'layout-dashboard':'⌂',
    'list-todo':'☷',
    'graduation-cap':'🎓',
    'calendar-days':'▦',
    'message-circle':'◌',
    'check-circle-2':'✓',
    'settings-2':'⚙',
    'alert-triangle':'⚠',
    'clock-3':'◷',
    'chevron-right':'›',
    'book-open':'▤',
    circle:'○',
    pencil:'✎',
    'trash-2':'⌫',
    x:'×',
    download:'⇩'
  };

  return `<span class="ico">${m[n]||'•'}</span>`;
}


function title(){

  return {
    dashboard:'Bon dia 👋',
    tasks:'Les meves tasques',
    exams:'Exàmens',
    planner:'Pla setmanal',
    chat:'Parla amb la IA',
    progress:'El meu progrés',
    settings:'Avaluació i ajustos'
  }[view];

}


/* =========================
   ESTRUCTURA PRINCIPAL
========================= */

function layout(){

  return `
    <div class="app">

      <aside>

        <div class="brand">

          <div class="logo">
            ${icon('sparkles')}
          </div>

          <div class="brand-text">
            <span>TRIA</span>
            <small class="creator">
              Fet per Freddy Figueroa
            </small>
          </div>

          <img
            class="school-logo"
            src="/logo-institut.png"
            alt="Logo de l'institut"
          >

        </div>


        <nav>

          ${nav.map(x=>`

            <button
              class="${view===x[0]?'active':''}"
              data-nav="${x[0]}"
            >
              ${icon(x[2])}
              <span>${x[1]}</span>
            </button>

          `).join('')}

        </nav>


        <div class="side-note">

          ${icon('sparkles')}

          <b>
            La IA t'organitza,<br>
            tu fas la feina.
          </b>

          <span>
            Dissenyat per al teu TdR
          </span>

        </div>

      </aside>


      <main class="main">

        <header>

          <div>

            <p class="eyebrow">
              TRIA · MVP
            </p>

            <h1>
              ${title()}
            </h1>

          </div>


          <button
            class="primary"
            data-new-task
          >
            ${icon('plus')}
            Afegir tasca
          </button>

        </header>


        <div id="content"></div>

      </main>


      ${buildModalHtml()}

    </div>
  `;

}


/* =========================
   ESTADÍSTIQUES
========================= */

function stats(){

  let pending=
    data.tasks.filter(
      t=>t.status!=='completed'
    ).length;

  let done=
    data.tasks.filter(
      t=>t.status==='completed'
    ).length;

  let urgent=
    data.tasks.filter(
      t=>
        t.status!=='completed' &&
        days(t.dueDate)<=2
    ).length;

  let mins=
    data.tasks
      .filter(t=>t.status==='completed')
      .reduce(
        (s,t)=>s+t.minutes,
        0
      );

  return `
    <section class="stats">

      ${stat(
        'list-todo',
        pending,
        'tasques pendents',
        `${done} completades`
      )}

      ${stat(
        'alert-triangle',
        urgent,
        'urgents',
        'lliuraments propers'
      )}

      ${stat(
        'graduation-cap',
        data.exams.length,
        'exàmens',
        data.exams[0]
          ? `Pròxim: ${esc(data.exams[0].subject)}`
          : 'Sense exàmens'
      )}

      ${stat(
        'clock-3',
        `${Math.round(mins/6)/10} h`,
        'estudi completat',
        'segons les teves tasques'
      )}

    </section>
  `;

}


function stat(i,v,l,s){

  return `
    <div class="stat">

      <div class="stat-icon">
        ${icon(i)}
      </div>

      <div>

        <b>${v}</b>

        <span>${l}</span>

        <small>${s}</small>

      </div>

    </div>
  `;

}


/* =========================
   TASQUES
========================= */

function taskRow(t){

  return `
    <div class="task-row">

      <button
        class="check"
        data-complete="${t.id}"
      >
        ${icon(
          t.status==='completed'
            ? 'check-circle-2'
            : 'circle'
        )}
      </button>


      <div class="task-main">

        <b class="${t.status==='completed'?'done':''}">
          ${esc(t.title)}
        </b>

        <span>
          ${esc(t.subject)}
          · ${t.minutes} min
          · dificultat ${t.difficulty}/5
        </span>

      </div>


      <div
        class="due ${days(t.dueDate)<=2?'hot':''}"
      >
        ${
          days(t.dueDate)<0
            ? 'Endarrerida'
            : days(t.dueDate)===0
              ? 'Avui'
              : `En ${days(t.dueDate)} dies`
        }
      </div>

    </div>
  `;

}


/* =========================
   TAULER
========================= */

function dashboard(){

  let pending=
    data.tasks
      .filter(t=>t.status!=='completed')
      .sort(
        (a,b)=>
          a.dueDate.localeCompare(b.dueDate)
      )
      .slice(0,3);


  return `

    ${stats()}


    <div class="grid two">


      <section class="card">

        <div class="card-head">

          <div>

            <p class="eyebrow">
              PRIORITATS
            </p>

            <h2>
              Què fer primer
            </h2>

          </div>


          <button
            class="ghost"
            data-nav="tasks"
          >
            Veure-ho tot
            ${icon('chevron-right')}
          </button>

        </div>


        ${
          pending.length
            ? `
              <div class="task-list">
                ${pending.map(taskRow).join('')}
              </div>
            `
            : `
              <div class="empty">
                ${icon('book-open')}
                <p>No tens tasques pendents.</p>
              </div>
            `
        }

      </section>


      <section class="card ai-card">

        <div class="ai-badge">
          ${icon('sparkles')}
          IA
        </div>


        <h2>
          Pla recomanat
        </h2>


        <p>
          ${
            esc(
              data.plan?.summary ||
              'Analitza les teves tasques i exàmens per rebre un ordre de treball raonat.'
            )
          }
        </p>


        ${
          (data.plan?.priorities||[])
            .slice(0,3)
            .map((p,i)=>{

              let t=
                data.tasks.find(
                  x=>x.id===p.taskId
                );

              return t
                ? `
                  <div class="recommend">

                    <span>${i+1}</span>

                    <div>

                      <b>
                        ${esc(t.title)}
                      </b>

                      <small>
                        ${esc(p.reason)}
                      </small>

                    </div>

                  </div>
                `
                : '';

            })
            .join('')
        }


        <button
          class="primary full"
          data-plan
          ${busy?'disabled':''}
        >
          ${
            busy
              ? 'Organitzant…'
              : '✨ Organitzar la meva setmana'
          }
        </button>

      </section>

    </div>


    <section class="card">

      <div class="card-head">

        <div>

          <p class="eyebrow">
            PRÒXIMS
          </p>

          <h2>
            Exàmens
          </h2>

        </div>


        <button
          class="ghost"
          data-nav="exams"
        >
          Gestionar
          ${icon('chevron-right')}
        </button>

      </div>


      <div class="exam-strip">

        ${
          data.exams
            .slice()
            .sort(
              (a,b)=>
                a.date.localeCompare(b.date)
            )
            .slice(0,4)
            .map(examMini)
            .join('')
          ||
          '<div class="muted">No hi ha exàmens registrats.</div>'
        }

      </div>

    </section>

  `;

}


function examMini(e){

  return `
    <div class="exam-mini">

      <div class="date-box">

        <b>
          ${
            new Date(
              e.date+'T12:00'
            ).getDate()
          }
        </b>

        <span>
          ${
            new Intl.DateTimeFormat(
              'ca-ES',
              {month:'short'}
            ).format(
              new Date(e.date+'T12:00')
            )
          }
        </span>

      </div>


      <div>

        <b>
          ${esc(e.subject)}
        </b>

        <small>
          ${esc(e.syllabus||'Sense temari')}
          · ${e.studyMinutes} min
        </small>

      </div>

    </div>
  `;

}


/* =========================
   PÀGINA TASQUES
========================= */

function tasks(){

  return `

    <section class="card">

      <div class="card-head">

        <div>

          <p class="eyebrow">
            ORGANITZACIÓ
          </p>

          <h2>
            ${data.tasks.length} tasques
          </h2>

        </div>


        <button
          class="primary"
          data-new-task
        >
          ${icon('plus')}
          Afegir
        </button>

      </div>


      ${
        data.tasks.length

          ? `
            <div class="task-list">

              ${
                data.tasks
                  .slice()
                  .sort(
                    (a,b)=>
                      a.dueDate.localeCompare(
                        b.dueDate
                      )
                  )
                  .map(t=>`

                    <div class="task-with-actions">

                      ${taskRow(t)}

                      <div class="row-actions">

                        <button
                          data-edit-task="${t.id}"
                        >
                          ${icon('pencil')}
                        </button>

                        <button
                          data-delete-task="${t.id}"
                        >
                          ${icon('trash-2')}
                        </button>

                      </div>

                    </div>

                  `)
                  .join('')

              }

            </div>
          `

          : `
            <div class="empty">

              ${icon('book-open')}

              <p>
                Encara no tens tasques.
              </p>

            </div>
          `
      }

    </section>

  `;

}


/* =========================
   PÀGINA EXÀMENS
========================= */

function exams(){

  return `

    <section class="card">

      <div class="card-head">

        <div>

          <p class="eyebrow">
            CALENDARI ACADÈMIC
          </p>

          <h2>
            ${data.exams.length} exàmens
          </h2>

        </div>


        <button
          class="primary"
          data-new-exam
        >
          ${icon('plus')}
          Afegir
        </button>

      </div>


      <div class="exam-list">

        ${
          data.exams
            .slice()
            .sort(
              (a,b)=>
                a.date.localeCompare(b.date)
            )
            .map(e=>`

              <div class="exam-card">

                <div class="date-box big">

                  <b>
                    ${
                      new Date(
                        e.date+'T12:00'
                      ).getDate()
                    }
                  </b>

                  <span>
                    ${
                      new Intl.DateTimeFormat(
                        'ca-ES',
                        {month:'short'}
                      ).format(
                        new Date(e.date+'T12:00')
                      )
                    }
                  </span>

                </div>


                <div class="exam-info">

                  <b>
                    ${esc(e.subject)}
                  </b>

                  <span>
                    ${esc(
                      e.syllabus ||
                      'Sense temari'
                    )}
                  </span>

                  <small>
                    Dificultat ${e.difficulty}/5
                    · ${e.studyMinutes}
                    min disponibles
                  </small>

                </div>


                <div class="row-actions">

                  <button
                    data-edit-exam="${e.id}"
                  >
                    ${icon('pencil')}
                  </button>

                  <button
                    data-delete-exam="${e.id}"
                  >
                    ${icon('trash-2')}
                  </button>

                </div>

              </div>

            `)
            .join('')

          ||

          '<div class="empty">No hi ha exàmens.</div>'
        }

      </div>

    </section>

  `;

}


/* =========================
   PLANIFICADOR
========================= */

function planner(){

  let week=
    Array.from(
      {length:7},
      (_,i)=>{

        let d=new Date();

        d.setDate(
          d.getDate()-
          ((d.getDay()+6)%7)+
          i
        );

        return d;

      }
    );


  return `

    <section class="planner-tools">

      <div>

        <p class="eyebrow">
          PLA PERSONALITZAT
        </p>

        <h2>
          La teva setmana
        </h2>

        <p>
          La IA proposa; tu pots moure les sessions.
        </p>

      </div>


      <button
        class="primary"
        data-plan
      >
        ${icon('sparkles')}

        ${
          data.plan
            ? 'Recalcular amb IA'
            : 'Crear pla'
        }

      </button>

    </section>


    ${
      !data.plan

        ? `
          <div class="empty card">

            ${icon('calendar-days')}

            <h3>
              Encara no hi ha cap pla
            </h3>

            <p>
              Genera una proposta a partir de
              les teves tasques i exàmens.
            </p>

          </div>
        `

        : `

          <div class="week">

            ${
              week.map((d,i)=>`

                <div class="day">

                  <div class="day-head">

                    <b>
                      ${
                        new Intl.DateTimeFormat(
                          'ca-ES',
                          {weekday:'short'}
                        ).format(d)
                      }
                    </b>

                    <span>
                      ${d.getDate()}
                    </span>

                  </div>


                  ${
                    data.plan.sessions
                      .filter(
                        s=>s.dayOffset===i
                      )
                      .map(s=>{

                        let t=
                          data.tasks.find(
                            x=>x.id===s.taskId
                          );

                        return t

                          ? `
                            <div class="session">

                              ${icon('sparkles')}

                              <b>
                                ${esc(t.title)}
                              </b>

                              <span>
                                ${s.minutes} min
                              </span>

                              <small>
                                ${esc(s.reason)}
                              </small>

                              <div>

                                <button
                                  data-move="${s.taskId}"
                                  data-delta="-1"
                                >
                                  ←
                                </button>

                                <button
                                  data-move="${s.taskId}"
                                  data-delta="1"
                                >
                                  →
                                </button>

                              </div>

                            </div>
                          `

                          : '';

                      })
                      .join('')

                  }

                </div>

              `).join('')
            }

          </div>

        `
    }

  `;

}


/* =========================
   CHAT IA
========================= */

function chat(){

  return `

    <section class="chat card">

      <div class="chat-head">

        <div class="ai-badge">

          ${icon('sparkles')}

          IA D'ESTUDI

        </div>

        <p>
          Pregunta'm sobre la teva organització.
          No resoldré els teus deures.
        </p>

      </div>


      <div class="messages">

        ${
          data.chat.length

            ? data.chat
                .map(m=>`

                  <div
                    class="message ${m.role}"
                  >

                    <span>
                      ${
                        m.role==='assistant'
                          ? '✨'
                          : 'Tu'
                      }
                    </span>

                    <p>
                      ${esc(m.text)}
                    </p>

                  </div>

                `)
                .join('')

            : `

              <div class="chat-empty">

                ${icon('sparkles')}

                <h2>
                  Com t'organitzes avui?
                </h2>


                <div class="suggestions">

                  ${
                    [
                      'Què hauria de fer avui?',
                      'Tinc un examen divendres i tres treballs pendents, com m’organitzo?',
                      'Només tinc una hora per estudiar, què prioritzo?'
                    ]
                    .map(s=>`

                      <button
                        data-suggest="${esc(s)}"
                      >
                        ${esc(s)}
                      </button>

                    `)
                    .join('')
                  }

                </div>

              </div>

            `
        }


        ${
          busy

            ? `
              <div class="message assistant">

                <span>✨</span>

                <p>
                  Estic revisant les teves tasques
                  i exàmens…
                </p>

              </div>
            `

            : ''
        }

      </div>


      <div class="chat-input">

        <input
          id="chat-input"
          placeholder="Escriu la teva pregunta…"
        >

        <button
          class="primary"
          data-send
        >
          Enviar
        </button>

      </div>

    </section>

  `;

}


/* =========================
   PROGRÉS
========================= */

function progress(){

  let total=data.tasks.length;

  let done=
    data.tasks.filter(
      t=>t.status==='completed'
    ).length;

  let pct=
    total
      ? Math.round(done/total*100)
      : 0;

  return `

    <section class="progress-hero card">

      <div>

        <p class="eyebrow">
          AQUESTA SETMANA
        </p>

        <h2>
          ${pct}% de les teves tasques completades
        </h2>

        <p>
          El progrés es calcula a partir del
          que marques com a completat.
        </p>

      </div>


      <div
        class="ring"
        style="--p:${pct}%"
      >

        <span>
          ${pct}%
        </span>

      </div>

    </section>


    ${stats()}


    <section class="card">

      <div class="card-head">

        <h2>
          Activitat
        </h2>

        <span class="muted">
          Últimes accions
        </span>

      </div>


      ${
        data.changes
          .slice(-8)
          .reverse()
          .map(c=>`

            <div class="activity">

              ${icon('check-circle-2')}

              <span>

                ${
                  c.type==='status_change'

                    ? "Has canviat l'estat d'una tasca"

                    : c.type==='plan_change'

                      ? 'Has mogut una sessió del pla'

                      : 'Has actualitzat la teva organització'
                }

              </span>

              <small>
                ${new Date(c.at).toLocaleString('ca-ES')}
              </small>

            </div>

          `)
          .join('')

        ||

        '<div class="muted">Encara no hi ha activitat.</div>'
      }

    </section>

  `;

}


/* =========================
   AVALUACIÓ
========================= */

function settings(){

  return `

    <div class="settings-grid">


      <section class="card">

        <p class="eyebrow">
          PER AL TDR
        </p>

        <h2>
          Registre d'avaluació
        </h2>

        <p>
          Només es registren els esdeveniments
          necessaris per estudiar la utilitat de
          l'eina: plans generats, prioritats,
          canvis manuals i tasques completades.
        </p>


        <ul class="privacy">

          <li>
            Sense nom ni correu.
          </li>

          <li>
            Dades desades localment.
          </li>

          <li>
            Exportació i eliminació disponibles.
          </li>

        </ul>


        <button
          class="primary"
          data-export
        >
          ${icon('download')}
          Exportar registre JSON
        </button>


        <button
          class="danger"
          data-reset
        >
          Esborrar totes les dades
        </button>

      </section>


      <section class="card">

        <p class="eyebrow">
          ESTAT
        </p>

        <h2>
          Mode d'IA
        </h2>

        <p>
          Sense API key funciona el mode demo.
          Amb API key utilitza el model configurat
          al servidor.
        </p>


        <div class="status-line">

          <span class="dot"></span>

          ${
            data.plan?.mode==='ai'
              ? "IA connectada en l'última petició"
              : 'Mode demo o sense petició'
          }

        </div>

      </section>


    </div>

  `;

}


/* =========================
   MODAL
========================= */

function buildModalHtml(){
  
  if(!modal) return '';

  let isTask=modal==='task';

  let f=
    editing ||
    (
      isTask

        ? {
            id:uid(),
            title:'',
            subject:'',
            description:'',
            dueDate:addDays(2),
            minutes:45,
            difficulty:3,
            status:'pending'
          }

        : {
            id:uid(),
            subject:'',
            date:addDays(4),
            syllabus:'',
            difficulty:3,
            studyMinutes:120
          }
    );


  return `

    <div class="overlay">

      <form
        class="modal"
        id="modal-form"
        data-type="${modal}"
        data-id="${editing?.id||''}"
      >


        <div class="modal-head">

          <h2>
            ${editing?'Editar':'Nova'}
            ${isTask?'tasca':'examen'}
          </h2>

          <button
            type="button"
            data-close
          >
            ${icon('x')}
          </button>

        </div>


        ${
          isTask

            ? `

              <label class="field">

                <span>
                  Nom
                </span>

                <input
                  name="title"
                  required
                  value="${esc(f.title)}"
                >

              </label>


              <label class="field">

                <span>
                  Assignatura
                </span>

                <input
                  name="subject"
                  required
                  value="${esc(f.subject)}"
                >

              </label>


              <label class="field">

                <span>
                  Descripció
                </span>

                <textarea name="description">${esc(f.description)}</textarea>

              </label>


              <div class="form-grid">

                <label class="field">

                  <span>
                    Data de lliurament
                  </span>

                  <input
                    name="dueDate"
                    type="date"
                    required
                    value="${f.dueDate}"
                  >

                </label>


                <label class="field">

                  <span>
                    Temps (min)
                  </span>

                  <input
                    name="minutes"
                    type="number"
                    min="5"
                    value="${f.minutes}"
                  >

                </label>

              </div>


              <div class="form-grid">

                <label class="field">

                  <span>
                    Dificultat (1-5)
                  </span>

                  <input
                    name="difficulty"
                    type="number"
                    min="1"
                    max="5"
                    value="${f.difficulty}"
                  >

                </label>


                <label class="field">

                  <span>
                    Estat
                  </span>

                  <select name="status">

                    <option
                      value="pending"
                      ${f.status==='pending'?'selected':''}
                    >
                      Pendent
                    </option>

                    <option
                      value="in_progress"
                      ${f.status==='in_progress'?'selected':''}
                    >
                      En procés
                    </option>

                    <option
                      value="completed"
                      ${f.status==='completed'?'selected':''}
                    >
                      Completada
                    </option>

                  </select>

                </label>

              </div>

            `

            : `

              <label class="field">

                <span>
                  Assignatura
                </span>

                <input
                  name="subject"
                  required
                  value="${esc(f.subject)}"
                >

              </label>


              <label class="field">

                <span>
                  Data de l'examen
                </span>

                <input
                  name="date"
                  type="date"
                  required
                  value="${f.date}"
                >

              </label>


              <label class="field">

                <span>
                  Temari
                </span>

                <textarea name="syllabus">${esc(f.syllabus)}</textarea>

              </label>


              <div class="form-grid">

                <label class="field">

                  <span>
                    Dificultat (1-5)
                  </span>

                  <input
                    name="difficulty"
                    type="number"
                    min="1"
                    max="5"
                    value="${f.difficulty}"
                  >

                </label>


                <label class="field">

                  <span>
                    Minuts disponibles
                  </span>

                  <input
                    name="studyMinutes"
                    type="number"
                    min="0"
                    value="${f.studyMinutes}"
                  >

                </label>

              </div>

            `
        }


        <div class="modal-actions">

          <button
            type="button"
            class="ghost"
            data-close
          >
            Cancel·lar
          </button>


          <button
            class="primary"
          >
            Desar
          </button>

        </div>


      </form>

    </div>

  `;

}


/* =========================
   RENDER
========================= */

function render(){

  document.querySelector('#root').innerHTML=
    layout();

  const c=
    document.querySelector('#content');

  c.innerHTML=
    view==='dashboard'
      ? dashboard()
      : view==='tasks'
        ? tasks()
        : view==='exams'
          ? exams()
          : view==='planner'
            ? planner()
            : view==='chat'
              ? chat()
              : view==='progress'
                ? progress()
                : settings();

  bind();

}


/* =========================
   EVENTOS
========================= */

function bind(){

  document
    .querySelectorAll('[data-nav]')
    .forEach(b=>
      b.onclick=()=>{
        view=b.dataset.nav;
        render();
      }
    );


  document
    .querySelectorAll('[data-new-task]')
    .forEach(b=>
      b.onclick=()=>{
        modal='task';
        editing=null;
        render();
      }
    );


  document
    .querySelectorAll('[data-new-exam]')
    .forEach(b=>
      b.onclick=()=>{
        modal='exam';
        editing=null;
        render();
      }
    );


  document
    .querySelectorAll('[data-close]')
    .forEach(b=>
      b.onclick=()=>{
        modal=null;
        editing=null;
        render();
      }
    );


  document
    .querySelectorAll('[data-complete]')
    .forEach(b=>
      b.onclick=()=>{

        let id=b.dataset.complete;

        data.tasks=
          data.tasks.map(
            t=>
              t.id===id
                ? {
                    ...t,
                    status:
                      t.status==='completed'
                        ? 'pending'
                        : 'completed'
                  }
                : t
          );

        data.changes.push({
          at:new Date().toISOString(),
          type:'status_change',
          taskId:id
        });

        save();
        render();

      }
    );


  document
    .querySelectorAll('[data-delete-task]')
    .forEach(b=>
      b.onclick=()=>{

        data.tasks=
          data.tasks.filter(
            t=>t.id!==b.dataset.deleteTask
          );

        data.changes.push({
          at:new Date().toISOString(),
          type:'delete_task'
        });

        save();
        render();

      }
    );


  document
    .querySelectorAll('[data-edit-task]')
    .forEach(b=>
      b.onclick=()=>{

        editing=
          data.tasks.find(
            t=>t.id===b.dataset.editTask
          );

        modal='task';

        render();

      }
    );


  document
    .querySelectorAll('[data-delete-exam]')
    .forEach(b=>
      b.onclick=()=>{

        data.exams=
          data.exams.filter(
            e=>e.id!==b.dataset.deleteExam
          );

        data.changes.push({
          at:new Date().toISOString(),
          type:'delete_exam'
        });

        save();
        render();

      }
    );


  document
    .querySelectorAll('[data-edit-exam]')
    .forEach(b=>
      b.onclick=()=>{

        editing=
          data.exams.find(
            e=>e.id===b.dataset.editExam
          );

        modal='exam';

        render();

      }
    );


  document
    .querySelectorAll('[data-plan]')
    .forEach(b=>
      b.onclick=generatePlan
    );


  document
    .querySelectorAll('[data-move]')
    .forEach(b=>
      b.onclick=()=>{

        let id=b.dataset.move;
        let delta=Number(b.dataset.delta);

        if(!data.plan?.sessions) return;

        data.plan.sessions=
          data.plan.sessions.map(
            s=>
              s.taskId===id
                ? {
                    ...s,
                    dayOffset:
                      Math.max(
                        0,
                        Math.min(
                          6,
                          s.dayOffset+delta
                        )
                      )
                  }
                : s
          );

        data.changes.push({
          at:new Date().toISOString(),
          type:'plan_change',
          taskId:id,
          delta
        });

        save();
        render();

      }
    );


  document
    .querySelectorAll('[data-suggest]')
    .forEach(b=>{
      b.onclick=()=>{
        const input=
          document.querySelector('#chat-input');

        if(input){
          input.value=
            b.dataset.suggest;

          input.focus();
        }
      };
    });


  document
    .querySelector('[data-send]')
    ?.addEventListener(
      'click',
      sendChat
    );


  document
    .querySelector('#chat-input')
    ?.addEventListener(
      'keydown',
      e=>{
        if(e.key==='Enter'){
          sendChat();
        }
      }
    );


  document
    .querySelector('[data-export]')
    ?.addEventListener(
      'click',
      ()=>{

        let out={
          exportedAt:
            new Date().toISOString(),

          tasks:
            data.tasks.map(
              ({description,...t})=>t
            ),

          exams:data.exams,

          aiLogs:data.logs,

          manualChanges:data.changes
        };


        let a=
          document.createElement('a');

        a.href=
          URL.createObjectURL(
            new Blob(
              [
                JSON.stringify(
                  out,
                  null,
                  2
                )
              ],
              {
                type:'application/json'
              }
            )
          );

        a.download=
          'tria-avaluacio.json';

        a.click();

      }
    );


  document
    .querySelector('[data-reset]')
    ?.addEventListener(
      'click',
      ()=>{

        if(
          confirm(
            'Vols esborrar totes les dades?'
          )
        ){

          localStorage.removeItem(KEY);

          location.reload();

        }

      }
    );


  const form=
    document.querySelector('#modal-form');


  if(form){

    form.onsubmit=e=>{

      e.preventDefault();


      let fd=
        new FormData(form);

      let o=
        Object.fromEntries(fd.entries());


      for(
        let k of [
          'minutes',
          'difficulty',
          'studyMinutes'
        ]
      ){

        if(k in o){
          o[k]=Number(o[k]);
        }

      }


      if(form.dataset.type==='task'){

        o.id=
          editing?.id||uid();

        data.tasks=
          editing

            ? data.tasks.map(
                t=>
                  t.id===o.id
                    ? o
                    : t
              )

            : [
                ...data.tasks,
                o
              ];

      }else{

        o.id=
          editing?.id||uid();

        data.exams=
          editing

            ? data.exams.map(
                x=>
                  x.id===o.id
                    ? o
                    : x
              )

            : [
                ...data.exams,
                o
              ];

      }


      data.changes.push({
        at:new Date().toISOString(),
        type:
          editing
            ? 'edit'
            : 'create'
      });


      save();

      modal=null;
      editing=null;

      render();

    };

  }

}


/* =========================
   IA: PLA
========================= */

async function generatePlan(){

  busy=true;

  render();


  try{

    let r=
      await fetch(
        '/api/ai/plan',
        {
          method:'POST',

          headers:{
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              tasks:data.tasks,
              exams:data.exams
            })
        }
      );


    let j=
      await r.json();


    if(!r.ok){
      throw Error(j.error);
    }


    data.plan=j;


    data.logs.push({

      at:new Date().toISOString(),

      type:'ai_plan',

      mode:j.mode,

      summary:j.summary,

      priorities:j.priorities,

      sessions:j.sessions

    });


    save();


  }catch(e){

    alert(
      "No s'ha pogut generar el pla: "+
      e.message
    );

  }finally{

    busy=false;

    render();

  }

}


/* =========================
   IA: CHAT
========================= */

async function sendChat(){

  let el=
    document.querySelector(
      '#chat-input'
    );

  let q=
    el?.value.trim();


  if(!q) return;


  data.chat.push({
    role:'user',
    text:q
  });

  save();


  busy=true;

  render();


  try{

    let r=
      await fetch(
        '/api/ai/chat',
        {
          method:'POST',

          headers:{
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              message:q,
              tasks:data.tasks,
              exams:data.exams
            })
        }
      );


    let j=
      await r.json();


    if(!r.ok){
      throw Error(j.error);
    }


    data.chat.push({
      role:'assistant',
      text:j.answer
    });


    save();


  }catch(e){

    data.chat.push({
      role:'assistant',
      text:
        'No he pogut respondre: '+
        e.message
    });

    save();

  }finally{

    busy=false;

    render();

  }

}


/* =========================
   INICIAR APP
========================= */

render();
function settings(){return `<div class="settings-grid"><section class="card"><p class="eyebrow">PER AL TDR</p><h2>Registre d'avaluació</h2><p>Només es registren els esdeveniments necessaris per estudiar la utilitat de l'eina: plans generats, prioritats, canvis manuals i tasques completades.</p><ul class="privacy"><li>Sense nom ni correu.</li><li>Dades desades localment.</li><li>Exportació i eliminació disponibles.</li></ul><button class="primary" data-export>${icon('download')} Exportar registre JSON</button><button class="danger" data-reset>Esborrar totes les dades</button></section><section class="card"><p class="eyebrow">ESTAT</p><h2>Mode d'IA</h2><p>Sense API key funciona el mode demo. Amb API key utilitza el model configurat al servidor.</p><div class="status-line"><span class="dot"></span>${data.plan?.mode==='ai'?"IA connectada en l'última petició":'Mode demo o sense petició'}</div></section></div>`}

function modalHtml(){if(!modal)return '';let isTask=modal==='task',f=editing|| (isTask?{id:uid(),title:'',subject:'',description:'',dueDate:addDays(2),minutes:45,difficulty:3,status:'pending'}:{id:uid(),subject:'',date:addDays(4),syllabus:'',difficulty:3,studyMinutes:120});return `<div class="overlay"><form class="modal" id="modal-form" data-type="${modal}" data-id="${editing?.id||''}"><div class="modal-head"><h2>${editing?'Editar':'Nova'} ${isTask?'tasca':'examen'}</h2><button type="button" data-close>${icon('x')}</button></div>${isTask?`<label class="field"><span>Nom</span><input name="title" required value="${esc(f.title)}"></label><label class="field"><span>Assignatura</span><input name="subject" required value="${esc(f.subject)}"></label><label class="field"><span>Descripció</span><textarea name="description">${esc(f.description)}</textarea></label><div class="form-grid"><label class="field"><span>Data de lliurament</span><input name="dueDate" type="date" required value="${f.dueDate}"></label><label class="field"><span>Temps (min)</span><input name="minutes" type="number" min="5" value="${f.minutes}"></label></div><div class="form-grid"><label class="field"><span>Dificultat (1-5)</span><input name="difficulty" type="number" min="1" max="5" value="${f.difficulty}"></label><label class="field"><span>Estat</span><select name="status"><option value="pending" ${f.status==='pending'?'selected':''}>Pendent</option><option value="in_progress" ${f.status==='in_progress'?'selected':''}>En procés</option><option value="completed" ${f.status==='completed'?'selected':''}>Completada</option></select></label></div>`:`<label class="field"><span>Assignatura</span><input name="subject" required value="${esc(f.subject)}"></label><label class="field"><span>Data de l'examen</span><input name="date" type="date" required value="${f.date}"></label><label class="field"><span>Temari</span><textarea name="syllabus">${esc(f.syllabus)}</textarea></label><div class="form-grid"><label class="field"><span>Dificultat (1-5)</span><input name="difficulty" type="number" min="1" max="5" value="${f.difficulty}"></label><label class="field"><span>Minuts disponibles</span><input name="studyMinutes" type="number" min="0" value="${f.studyMinutes}"></label></div>`}<div class="modal-actions"><button type="button" class="ghost" data-close>Cancel·lar</button><button class="primary">Desar</button></div></form></div>`}

function render(){document.querySelector('#root').innerHTML=layout();const c=document.querySelector('#content');c.innerHTML=view==='dashboard'?dashboard():view==='tasks'?tasks():view==='exams'?exams():view==='planner'?planner():view==='chat'?chat():view==='progress'?progress():settings();bind();}

function bind(){document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{view=b.dataset.nav;render()});document.querySelectorAll('[data-new-task]').forEach(b=>b.onclick=()=>{modal='task';editing=null;render()});document.querySelectorAll('[data-new-exam]').forEach(b=>b.onclick=()=>{modal='exam';editing=null;render()});document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{modal=null;editing=null;render()});document.querySelectorAll('[data-complete]').forEach(b=>b.onclick=()=>{let id=b.dataset.complete;data.tasks=data.tasks.map(t=>t.id===id?{...t,status:t.status==='completed'?'pending':'completed'}:t);data.changes.push({at:new Date().toISOString(),type:'status_change',taskId:id});save();render()});document.querySelectorAll('[data-delete-task]').forEach(b=>b.onclick=()=>{data.tasks=data.tasks.filter(t=>t.id!==b.dataset.deleteTask);data.changes.push({at:new Date().toISOString(),type:'delete_task'});save();render()});document.querySelectorAll('[data-edit-task]').forEach(b=>b.onclick=()=>{editing=data.tasks.find(t=>t.id===b.dataset.editTask);modal='task';render()});document.querySelectorAll('[data-delete-exam]').forEach(b=>b.onclick=()=>{data.exams=data.exams.filter(e=>e.id!==b.dataset.deleteExam);data.changes.push({at:new Date().toISOString(),type:'delete_exam'});save();render()});document.querySelectorAll('[data-edit-exam]').forEach(b=>b.onclick=()=>{editing=data.exams.find(e=>e.id===b.dataset.editExam);modal='exam';render()});document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=generatePlan);document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{let id=b.dataset.move,delta=Number(b.dataset.delta);data.plan.sessions=data.plan.sessions.map(s=>s.taskId===id?{...s,dayOffset:Math.max(0,Math.min(6,s.dayOffset+delta))}:s);data.changes.push({at:new Date().toISOString(),type:'plan_change',taskId:id,delta});save();render()});document.querySelectorAll('[data-suggest]').forEach(b=>{b.onclick=()=>{document.querySelector('#chat-input').value=b.dataset.suggest}});document.querySelector('[data-send]')?.addEventListener('click',sendChat);document.querySelector('#chat-input')?.addEventListener('keydown',e=>e.key==='Enter'&&sendChat());document.querySelector('[data-export]')?.addEventListener('click',()=>{let out={exportedAt:new Date().toISOString(),tasks:data.tasks.map(({description,...t})=>t),exams:data.exams,aiLogs:data.logs,manualChanges:data.changes};let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='tria-avaluacio.json';a.click()});document.querySelector('[data-reset]')?.addEventListener('click',()=>{if(confirm('Vols esborrar totes les dades?')){localStorage.removeItem(KEY);location.reload()}});const form=document.querySelector('#modal-form');if(form)form.onsubmit=e=>{e.preventDefault();let fd=new FormData(form),o=Object.fromEntries(fd.entries());for(let k of ['minutes','difficulty','studyMinutes'])if(k in o)o[k]=Number(o[k]);if(form.dataset.type==='task'){o.id=editing?.id||uid();data.tasks=editing?data.tasks.map(t=>t.id===o.id?o:t):[...data.tasks,o]}else{o.id=editing?.id||uid();data.exams=editing?data.exams.map(x=>x.id===o.id?o:x):[...data.exams,o]}data.changes.push({at:new Date().toISOString(),type:editing?'edit':'create'});save();modal=null;editing=null;render()}}

async function generatePlan(){busy=true;render();try{let r=await fetch('/api/ai/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tasks:data.tasks,exams:data.exams})});let j=await r.json();if(!r.ok)throw Error(j.error);data.plan=j;data.logs.push({at:new Date().toISOString(),type:'ai_plan',mode:j.mode,summary:j.summary,priorities:j.priorities,sessions:j.sessions});save()}catch(e){alert("No s'ha pogut generar el pla: "+e.message)}finally{busy=false;render()}}

async function sendChat(){let el=document.querySelector('#chat-input'),q=el?.value.trim();if(!q)return;data.chat.push({role:'user',text:q});save();busy=true;render();try{let r=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,tasks:data.tasks,exams:data.exams})}),j=await r.json();if(!r.ok)throw Error(j.error);data.chat.push({role:'assistant',text:j.answer});save()}catch(e){data.chat.push({role:'assistant',text:'No he pogut respondre: '+e.message});save()}finally{busy=false;render()}}

render();
