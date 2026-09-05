import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, email, subject, message } = body;
  if (!name || !email || !message) return err('Name, email and message are required');
  try {
    db.prepare('INSERT INTO support_tickets (customer_name, customer_email, subject, message, status) VALUES (?,?,?,?,?)')
      .run(name, email, subject || 'General inquiry', message, 'open');
    return ok({ ok: true, message: 'Message received. Our team will contact you soon at ' + email + '.' });
  } catch (e: any) { return err(e.message, 500); }
}
