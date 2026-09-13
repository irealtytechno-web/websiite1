import { db, admin } from 'hatchable';

export const access = 'admin';
export const methods = ['GET','POST','DELETE'];

export default async function (req, res) {
  const ok = await admin.check(req);
  if (!ok) return res.status(403).json({ error: 'Admin access required.' });
  if (req.method === 'GET') {
    const result = await db.query('SELECT email,role,created_at FROM staff_roles ORDER BY email');
    return res.json({ staff: result.rows });
  }
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ error:'Valid email is required.' });
  if (req.method === 'DELETE') { await db.query('DELETE FROM staff_roles WHERE email = $1', [email]); return res.json({ok:true}); }
  const role = String(req.body?.role || '').toLowerCase();
  if (!['vp','agent'].includes(role)) return res.status(400).json({ error:'Role must be vp or agent.' });
  await db.query('INSERT INTO staff_roles (email,role) VALUES ($1,$2) ON CONFLICT (email) DO UPDATE SET role=EXCLUDED.role', [email,role]);
  res.json({ok:true,email,role});
}