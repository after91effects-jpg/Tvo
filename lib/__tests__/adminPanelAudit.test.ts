import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateAdminOrderStatus, updateAdminOrderStatuses } from '../adminOrderUpdates';
import { normalizePagination } from '../pagination';
import { formatLocalDate } from '../localDate';

afterEach(() => vi.unstubAllGlobals());

describe('Admin order status updates', () => {
  it('uses the status-update endpoint contract', async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', request);
    await updateAdminOrderStatus('TVO-42', 'Baking in Kitchen', 'Preparing');
    const [url, options] = request.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ action: 'status', orderNumber: 'TVO-42', status: 'Baking in Kitchen', note: 'Preparing' });
  });
  it('rejects HTTP failures instead of reporting success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Admin access required' }, { status: 403 })));
    await expect(updateAdminOrderStatus('TVO-42', 'Delivered', '')).rejects.toThrow('Admin access required');
  });
  it('reports partial success and identifies only failed orders for retry', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json({ error: 'Invalid transition' }, { status: 400 }))
      .mockRejectedValueOnce(new Error('Network error')));
    const orders = [{ id: '1', orderNumber: 'A' }, { id: '2', orderNumber: 'B' }, { id: '3', orderNumber: 'C' }];
    const result = await updateAdminOrderStatuses(orders, 'Delivered', 'test');
    expect(result.succeeded).toEqual([orders[0]]);
    expect(result.failed).toEqual([orders[1], orders[2]]);
  });
  it('does not send an order-create request for an empty selection', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    expect(await updateAdminOrderStatuses([], 'Delivered', '')).toEqual({ succeeded: [], failed: [] });
    expect(request).not.toHaveBeenCalled();
  });
});

describe('Admin pagination', () => {
  it.each([[undefined, undefined, 50, 1], [-10, -1, 50, 1], [Infinity, Infinity, 50, 1], [501, 2.9, 500, 2], [200, 3, 200, 3], [1.5, 1, 1, 1]])('normalizes %s / %s', (rawLimit, rawPage, limit, page) => {
    expect(normalizePagination(rawLimit, rawPage)).toEqual({ limit, page, offset: (page - 1) * limit });
  });
});

describe('Admin calendar date filters', () => {
  it('keeps the local date at early morning instead of using the previous UTC day', () => {
    expect(formatLocalDate(new Date(2026, 9, 28, 0, 15))).toBe('2026-10-28');
  });
  it('formats month boundaries as date-input values', () => {
    expect(formatLocalDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});
