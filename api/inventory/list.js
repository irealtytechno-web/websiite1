import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET'];

export default async function (req, res) {
  const city = req.query?.city || '';
  const type = req.query?.type || '';
  const allowedCities = ['Hyderabad','Bangalore','Delhi'];
  const allowedTypes = ['Open Plot','Agriculture Land','Chance Property','Flat','Villa','Commercial'];
  if (city && !allowedCities.includes(city)) return res.status(400).json({ error: 'Invalid city' });
  if (type && !allowedTypes.includes(type)) return res.status(400).json({ error: 'Invalid property type' });
  const params = [];
  const where = ["status = 'active'"];
  if (city) { params.push(city); where.push(`city = $${params.length}`); }
  if (type) { params.push(type); where.push(`property_type = $${params.length}`); }
  const result = await db.query(`SELECT id,title,property_type,city,locality,area_value,area_unit,price_value,price_unit,bedrooms,description,image_urls->>0 AS image_url,CASE WHEN allow_agent_contact AND agent_phone IS NOT NULL AND agent_phone <> '' THEN agent_phone ELSE '+91 6300181062' END AS contact_phone,created_at FROM inventory WHERE ${where.join(' AND ')} ORDER BY created_at DESC`, params);
  res.json(result.rows);
}