import { db, admin } from 'hatchable';

export const access = 'member';
export const methods = ['GET'];

export default async function (req, res) {
  if (await admin.check(req)) return res.json({ role:'admin', email:req.member?.email || null, name:req.member?.display_name || req.member?.handle || 'Admin' });
  const email = String(req.member?.email || '').trim().toLowerCase();
  const result = await db.query('SELECT role FROM staff_roles WHERE email = $1', [email]);
  if (!result.rows.length) return res.status(403).json({ error:'Staff access has not been assigned.' });
  res.json({ role:result.rows[0].role, email:req.member?.email || null, name:req.member?.display_name || req.member?.handle || 'Staff' });
}