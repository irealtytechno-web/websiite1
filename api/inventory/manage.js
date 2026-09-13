import { db, admin } from 'hatchable';

export const access = 'member';
export const methods = ['GET','POST','PUT','DELETE'];

async function getRole(req) {
  if (await admin.check(req)) return 'admin';
  const email = String(req.member?.email || '').trim().toLowerCase();
  if (!email) return 'none';
  const result = await db.query('SELECT role FROM staff_roles WHERE email = $1', [email]);
  return result.rows[0]?.role || 'none';
}

function clean(v, max=4000) { return v == null ? null : String(v).trim().slice(0,max); }
function num(v) { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function images(v) { return Array.isArray(v) ? v.map(x=>String(x).trim()).filter(Boolean).slice(0,8) : []; }

export default async function (req, res) {
  const role = await getRole(req);
  if (role === 'none') return res.status(403).json({ error: 'Staff access has not been assigned.' });
  const email = String(req.member?.email || '').trim().toLowerCase();

  if (req.method === 'GET') {
    const result = await db.query('SELECT id,title,property_type,city,locality,area_value,area_unit,price_value,price_unit,bedrooms,description,features,image_urls,status,agent_name,agent_phone,agent_email,created_by_email,allow_agent_contact,created_at,updated_at FROM inventory ORDER BY created_at DESC');
    const rows = result.rows.map(r => role === 'admin' ? r : ({...r, agent_phone:null, agent_email:null, created_by_email:null, is_mine:String(r.created_by_email).toLowerCase()===email}));
    return res.json({ role, inventory: rows });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const title = clean(b.title, 180);
    const propertyType = clean(b.property_type, 40);
    const city = clean(b.city, 40);
    if (!title || !propertyType || !city) return res.status(400).json({ error: 'Title, property type and city are required.' });
    if (!['Open Plot','Agriculture Land','Chance Property','Flat','Villa','Commercial'].includes(propertyType)) return res.status(400).json({ error: 'Invalid property type.' });
    if (!['Hyderabad','Bangalore','Delhi'].includes(city)) return res.status(400).json({ error: 'Invalid city.' });
    const result = await db.query('INSERT INTO inventory (title,property_type,city,locality,area_value,area_unit,price_value,price_unit,bedrooms,description,features,image_urls,status,agent_name,agent_phone,agent_email,created_by_email,allow_agent_contact) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id,title', [title,propertyType,city,clean(b.locality,160),num(b.area_value),clean(b.area_unit,30)||'sq.ft',num(b.price_value),clean(b.price_unit,30)||'total',b.bedrooms===''||b.bedrooms==null?null:Math.max(0,Math.min(50,parseInt(b.bedrooms,10))),clean(b.description,4000),clean(b.features,1000),JSON.stringify(images(b.image_urls)),['active','sold','draft'].includes(b.status)?b.status:'active',clean(b.agent_name,120),role==='admin'?clean(b.agent_phone,40):null,role==='admin'?clean(b.agent_email,180):null,email,role==='admin'&&Boolean(b.allow_agent_contact)]);
    return res.status(201).json({ ok:true, role, inventory: result.rows[0] });
  }

  const id = String(req.body?.id || req.query?.id || '');
  if (!id) return res.status(400).json({ error: 'Inventory id is required.' });
  const current = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);
  if (!current.rows.length) return res.status(404).json({ error: 'Inventory not found.' });
  if (role === 'agent' && String(current.rows[0].created_by_email).toLowerCase() !== email) return res.status(403).json({ error: 'Agents can edit or delete only their own inventory.' });

  if (req.method === 'DELETE') {
    await db.query('DELETE FROM inventory WHERE id = $1', [id]);
    return res.json({ ok:true });
  }

  const b = req.body || {};
  const title = clean(b.title,180); const propertyType=clean(b.property_type,40); const city=clean(b.city,40);
  if (!title || !propertyType || !city) return res.status(400).json({error:'Title, property type and city are required.'});
  const allowContact = role === 'admin' ? Boolean(b.allow_agent_contact) : current.rows[0].allow_agent_contact;
  await db.query('UPDATE inventory SET title=$1,property_type=$2,city=$3,locality=$4,area_value=$5,area_unit=$6,price_value=$7,price_unit=$8,bedrooms=$9,description=$10,features=$11,image_urls=$12,status=$13,agent_name=$14,agent_phone=$15,agent_email=$16,allow_agent_contact=$17,updated_at=NOW() WHERE id=$18', [title,propertyType,city,clean(b.locality,160),num(b.area_value),clean(b.area_unit,30)||'sq.ft',num(b.price_value),clean(b.price_unit,30)||'total',b.bedrooms===''||b.bedrooms==null?null:Math.max(0,Math.min(50,parseInt(b.bedrooms,10))),clean(b.description,4000),clean(b.features,1000),JSON.stringify(images(b.image_urls)),['active','sold','draft'].includes(b.status)?b.status:'active',clean(b.agent_name,120),role==='admin'?clean(b.agent_phone,40):current.rows[0].agent_phone,role==='admin'?clean(b.agent_email,180):current.rows[0].agent_email,allowContact,id]);
  res.json({ ok:true });
}