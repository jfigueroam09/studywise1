# TRIA

Organitzador d'estudi per a Batxillerat.

## Estructura

- `index.html` — entrada de l'aplicació.
- `app.js` — interfície, autenticació, dades locals i funcionalitats.
- `styles.css` — estil visual de TRIA.
- `ai.js` — client de Gemini al servidor.
- `api/config.js` — entrega al navegador la configuració pública de Supabase sense guardar-la al repositori.
- `api/ai/chat.js` — xat d'estudi.
- `api/ai/plan.js` — planificació amb IA.
- `api/ai/schedule.js` — lectura d'horari des d'una imatge.
- `api/ai/capture.js` — conversió de text natural en tasques/exàmens.
- `tria-logo.png` i `favicon-*` — identitat visual.
- `logo-institut.png` — logotip de l'institut.

## Configuració de Vercel

Defineix aquestes variables d'entorn a Vercel:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (opcional; per defecte `gemini-3.5-flash-lite`)

No posis cap clau al codi ni al repositori.

## Supabase

L'autenticació utilitza Supabase Auth. Les tasques, exàmens, horari, pla i registre d'entrades es guarden al navegador per usuari (`localStorage`) associat a l'ID de l'usuari autenticat. No s'ha de confondre amb una base de dades de tasques a Supabase.

## Desenvolupament

La manera més directa de provar les funcions de Vercel és amb `vercel dev`.

Abans de desplegar:

```bash
npm run check
```

Aquest projecte no necessita dependències npm per executar el frontend ni les funcions serverless; el navegador carrega Supabase des de `esm.sh`.

## Desplegament

Puja aquesta carpeta a GitHub i connecta el repositori amb Vercel. Configura les variables d'entorn abans de fer el primer desplegament de producció.
