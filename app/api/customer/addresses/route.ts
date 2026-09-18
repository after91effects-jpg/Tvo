import { ok, err, db, getCurrentUser } from '../../../../lib/server/api';

export const runtime = 'nodejs';

function resolveCustomer(user: any) {
  if (!user) return null;
  return db.prepare('SELECT * FROM customers WHERE id=? OR user_id=? OR email=?').get(user.id, user.id, user.email) as any;
}

export async function GET(req: Request) {
  const user = getCurrentUser(req);
  if (!user) return err('Login required', 401);

  const cust = resolveCustomer(user);
  if (!cust) return ok({ addresses: [] });

  const rows = db.prepare('SELECT * FROM addresses WHERE customer_id=? ORDER BY is_default DESC, id DESC').all(cust.id) as any[];
  const addresses = rows.map((r) => {
    let fullName = cust.name || '';
    let phone = cust.phone || '';
    let line2 = r.line2 || '';

    // If line2 contains stored contact prefix: "[Name | Phone] ...", parse it safely
    if (line2 && line2.startsWith('⟦') && line2.includes('⟧')) {
      const match = line2.match(/^⟦(.*?) \| (.*?)⟧(.*)$/);
      if (match) {
        fullName = match[1];
        phone = match[2];
        line2 = match[3].trim();
      }
    }

    return {
      id: String(r.id),
      label: r.label || 'home',
      fullName,
      phone,
      line1: r.line1 || '',
      line2: line2 || undefined,
      city: r.city || '',
      state: r.state || '',
      pincode: r.pincode || '',
      isDefault: Boolean(r.is_default),
    };
  });

  return ok({ addresses });
}

export async function POST(req: Request) {
  const user = getCurrentUser(req);
  if (!user) return err('Login required', 401);

  const cust = resolveCustomer(user);
  if (!cust) return err('Customer account not found', 404);

  const body = await req.json().catch(() => ({}));
  const label = body.label || 'home';
  const fullName = (body.fullName || cust.name || '').trim();
  const phone = (body.phone || cust.phone || '').trim();
  const line1 = (body.line1 || '').trim();
  let line2 = (body.line2 || '').trim();
  const city = (body.city || '').trim();
  const state = (body.state || '').trim();
  const pincode = (body.pincode || '').trim();
  const isDefault = body.isDefault ? 1 : 0;

  if (!line1 || line1.length < 5) return err('Valid address line 1 required', 400);
  if (!city) return err('City is required', 400);
  if (!pincode || !/^\d{6}$/.test(pincode)) return err('Valid 6-digit PIN code required', 400);

  // Encode contact overrides into line2 prefix if different from customer profile
  if (fullName || phone) {
    line2 = `⟦${fullName} | ${phone}⟧ ${line2}`.trim();
  }

  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default=0 WHERE customer_id=?').run(cust.id);
  }

  const info = db.prepare(
    'INSERT INTO addresses (customer_id, label, line1, line2, city, state, pincode, is_default) VALUES (?,?,?,?,?,?,?,?)'
  ).run(cust.id, label, line1, line2 || null, city, state, pincode, isDefault);

  return ok({ ok: true, id: String(info.lastInsertRowid) });
}

export async function PUT(req: Request) {
  const user = getCurrentUser(req);
  if (!user) return err('Login required', 401);

  const cust = resolveCustomer(user);
  if (!cust) return err('Customer account not found', 404);

  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (!id) return err('Address ID required', 400);

  const label = body.label || 'home';
  const fullName = (body.fullName || cust.name || '').trim();
  const phone = (body.phone || cust.phone || '').trim();
  const line1 = (body.line1 || '').trim();
  let line2 = (body.line2 || '').trim();
  const city = (body.city || '').trim();
  const state = (body.state || '').trim();
  const pincode = (body.pincode || '').trim();
  const isDefault = body.isDefault ? 1 : 0;

  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default=0 WHERE customer_id=?').run(cust.id);
  }

  if (fullName || phone) {
    line2 = `⟦${fullName} | ${phone}⟧ ${line2}`.trim();
  }

  db.prepare(
    'UPDATE addresses SET label=?, line1=?, line2=?, city=?, state=?, pincode=?, is_default=? WHERE id=? AND customer_id=?'
  ).run(label, line1, line2 || null, city, state, pincode, isDefault, id, cust.id);

  return ok({ ok: true, id: String(id) });
}

export async function DELETE(req: Request) {
  const user = getCurrentUser(req);
  if (!user) return err('Login required', 401);

  const cust = resolveCustomer(user);
  if (!cust) return err('Customer account not found', 404);

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return err('Address ID required', 400);

  db.prepare('DELETE FROM addresses WHERE id=? AND customer_id=?').run(id, cust.id);
  return ok({ ok: true });
}
