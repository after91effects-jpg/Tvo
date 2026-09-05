import { ok, err, db, getCurrentUser, jsonParseSafe } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const status = url.searchParams.get('status') || '';
  const user = getCurrentUser(req);
  const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin');
  try {
    if (id) {
      const r = db.prepare('SELECT * FROM custom_requests WHERE id=?').get(id);
      if (!r) return err('Not found', 404);
      return ok({ request: r });
    }
    let rows;
    if (isAdmin) {
      rows = status ? db.prepare('SELECT * FROM custom_requests WHERE status=? ORDER BY created_at DESC').all(status)
                    : db.prepare('SELECT * FROM custom_requests ORDER BY created_at DESC LIMIT 200').all();
    } else {
      if (!user) return err('Login required', 401);
      const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id);
      rows = cust ? db.prepare('SELECT * FROM custom_requests WHERE customer_id=? ORDER BY created_at DESC').all(cust.id) : [];
    }
    return ok({ requests: rows });
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = getCurrentUser(req);
  let customerId = null;
  if (user) customerId = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id)?.id ?? null;
  const action = body.action || 'create';

  try {
    if (action === 'create') {
      const info = db.prepare(`INSERT INTO custom_requests
        (customer_id, customer_name, customer_phone, customer_email, product_type, cake_type, weight, size, flavour,
         filling, frosting, theme, colour, decoration, name_on_cake, message, occasion, reference_image,
         special_instructions, quantity, delivery_date, delivery_time, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(customerId, body.customer_name || body.name || '', body.customer_phone || '', body.customer_email || '',
          body.product_type || '', body.cake_type || '', body.weight || '', body.size || '', body.flavour || '',
          body.filling || '', body.frosting || '', body.theme || '', body.colour || '', body.decoration || '',
          body.name_on_cake || '', body.message || '', body.occasion || '', body.reference_image || '',
          body.special_instructions || '', body.quantity || 1, body.delivery_date || '', body.delivery_time || '',
          'Pending Approval');
      return ok({ ok: true, id: Number(info.lastInsertRowid), status: 'Pending Approval', message: 'Custom order request submitted. Our team will review and confirm.' });
    }
    return err('Unknown action');
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = getCurrentUser(req);
  const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin');
  if (!isAdmin) return err('Admin access required', 403);
  const id = body.id;
  if (!id) return err('id required');
  try {
    const allowed = { status: body.status, quote_price: body.quote_price ?? null, quote_notes: body.quote_notes ?? null };
    const sets = [];
    const params = [];
    if (allowed.status) { sets.push('status=?'); params.push(allowed.status); }
    if (body.quote_price !== undefined) { sets.push('quote_price=?'); params.push(body.quote_price); }
    if (body.quote_notes !== undefined) { sets.push('quote_notes=?'); params.push(body.quote_notes); }
    if (sets.length === 0) return err('Nothing to update');
    sets.push('updated_at=datetime(\'now\')');
    params.push(id);
    db.prepare(`UPDATE custom_requests SET ${sets.join(', ')} WHERE id=?`).run(...params);
    return ok({ ok: true });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
