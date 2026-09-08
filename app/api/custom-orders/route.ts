import { ok, err, db, getCurrentUser, logAudit } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const status = url.searchParams.get('status') || '';
  const user = getCurrentUser(req);
  const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin');

  try {
    if (id) {
      const r = db.prepare('SELECT * FROM custom_requests WHERE id=?').get(id) as any;
      if (!r) return err('Not found', 404);

      // Ownership enforcement
      if (!isAdmin) {
        if (!user) return err('Login required', 401);
        const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id) as any;
        const isOwner = (cust && r.customer_id === cust.id) || (user.email && r.customer_email?.toLowerCase() === user.email.toLowerCase());
        if (!isOwner) return err('Unauthorized to view this custom request', 403);
      }
      return ok({ request: r });
    }

    let rows;
    if (isAdmin) {
      rows = status ? db.prepare('SELECT * FROM custom_requests WHERE status=? ORDER BY created_at DESC').all(status)
                    : db.prepare('SELECT * FROM custom_requests ORDER BY created_at DESC LIMIT 200').all();
    } else {
      if (!user) return err('Login required', 401);
      const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id) as any;
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
  if (user) {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id) as any;
    customerId = cust?.id ?? null;
  }
  const action = body.action || 'create';

  try {
    if (action === 'create') {
      const name = (body.customer_name || body.name || user?.name || '').trim();
      if (!name || name.length < 2) return err('Customer name is required', 400);

      const phone = (body.customer_phone || user?.phone || '').trim().replace(/\D/g, '');
      if (!phone || phone.length < 10) return err('Valid 10-digit mobile number required', 400);

      const email = (body.customer_email || user?.email || '').trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Valid email address required', 400);

      const info = db.prepare(`INSERT INTO custom_requests
        (customer_id, customer_name, customer_phone, customer_email, product_type, cake_type, weight, size, flavour,
         filling, frosting, theme, colour, decoration, name_on_cake, message, occasion, reference_image,
         special_instructions, quantity, delivery_date, delivery_time, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(
          customerId, name, phone, email,
          body.product_type || 'Custom Cake', body.cake_type || '', body.weight || '', body.size || '', body.flavour || '',
          body.filling || '', body.frosting || '', body.theme || '', body.colour || '', body.decoration || '',
          body.name_on_cake || '', body.message || '', body.occasion || '', body.reference_image || '',
          body.special_instructions || '', Number(body.quantity) || 1, body.delivery_date || '', body.delivery_time || '',
          'Pending Approval'
        );

      const newId = Number(info.lastInsertRowid);
      logAudit(user, 'CUSTOM_REQUEST_CREATE', 'CustomRequest', String(newId), `By ${name}`);
      return ok({ ok: true, id: newId, status: 'Pending Approval', message: 'Custom order request submitted. Our team will review and confirm.' });
    }
    return err('Unknown action', 400);
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
  if (!id) return err('id required', 400);

  try {
    const allowed = { status: body.status, quote_price: body.quote_price ?? null, quote_notes: body.quote_notes ?? null };
    const sets = [];
    const params: any[] = [];
    if (allowed.status) { sets.push('status=?'); params.push(allowed.status); }
    if (body.quote_price !== undefined) { sets.push('quote_price=?'); params.push(body.quote_price); }
    if (body.quote_notes !== undefined) { sets.push('quote_notes=?'); params.push(body.quote_notes); }
    if (sets.length === 0) return err('Nothing to update', 400);
    sets.push("updated_at=datetime('now')");
    params.push(id);
    db.prepare(`UPDATE custom_requests SET ${sets.join(', ')} WHERE id=?`).run(...params);
    logAudit(user, 'CUSTOM_REQUEST_UPDATE', 'CustomRequest', String(id), `Status: ${body.status || 'updated'}`);
    return ok({ ok: true });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
