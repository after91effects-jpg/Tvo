import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ user: vi.fn(), prepare: vi.fn(), all: vi.fn(), get: vi.fn(), run: vi.fn() }));
vi.mock('../api', () => ({ getCurrentUser: mock.user, db: { prepare: mock.prepare }, ok: (data: unknown) => Response.json(data), err: (error: string, status = 400) => Response.json({error}, {status}), jsonParseSafe: (s: string) => JSON.parse(s || '[]'), logAudit: vi.fn(), generateOrderNumber: vi.fn() }));
vi.mock('../order-engine', () => ({ createOrder: vi.fn(), extractPieceCount: vi.fn(), OrderInputError: class extends Error {} }));
vi.mock('../logger', () => ({ logError: vi.fn() }));
vi.mock('../rateLimit', () => ({ rateLimitMiddleware: () => ({ allowed: true }) }));
import { GET, PUT } from '../../../app/api/orders/route';
beforeEach(() => { vi.clearAllMocks(); mock.prepare.mockReturnValue({ all: mock.all, get: mock.get, run: mock.run }); mock.all.mockReturnValue([]); });
describe('Shared admin order queue', () => {
  it.each(['super_admin', 'admin', 'kitchen_manager', 'customer_support'])('lists the shared queue for %s', async role => {
    mock.user.mockReturnValue({ id: 1, email: 'staff@example.com', role });
    await GET(new Request('http://localhost/api/orders'));
    expect(mock.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE 1=1'));
    expect(mock.all).toHaveBeenCalledWith();
  });
  it('keeps customer requests scoped to the signed-in email', async () => {
    mock.user.mockReturnValue({ id: 1, email: 'customer@example.com', role: 'customer' });
    mock.get.mockReturnValue(undefined);
    await GET(new Request('http://localhost/api/orders'));
    expect(mock.prepare).toHaveBeenLastCalledWith(expect.stringContaining('WHERE customer_email=?'));
    expect(mock.all).toHaveBeenCalledWith('customer@example.com');
  });
  it('does not list anonymous orders for an empty session', async () => {
    mock.user.mockReturnValue(null);
    expect(await (await GET(new Request('http://localhost/api/orders'))).json()).toEqual({orders: []});
    expect(mock.prepare).not.toHaveBeenCalled();
  });
  it('rejects changes from support staff who can only view orders', async () => {
    mock.user.mockReturnValue({id: 2, role: 'customer_support'});
    const res = await PUT(new Request('http://localhost/api/orders', {method:'PUT', body: JSON.stringify({action: 'status', orderNumber: 'TVO-1', status: 'Delivered'})}));
    expect(res.status).toBe(403);
    expect(mock.prepare).not.toHaveBeenCalled();
  });
});
