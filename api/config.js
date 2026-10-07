export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return res.status(503).json({
      error: 'Supabase no està configurat al servidor.'
    });
  }

  return res.status(200).json({
    supabaseUrl: url,
    supabasePublishableKey: publishableKey
  });
}
