export function validateReportDates(start: string, end: string) {
  for (const value of [start, end]) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error('Enter valid report dates');
  }
  if (start && end && start > end) throw new Error('Start date must be before the end date');
}

export function productSales(orders: any[], products: any[]) {
  const catalog = new Map(products.map(p => [String(p.id), p]));
  const totals = new Map<string, any>();
  for (const order of orders) {
    if (order.status === 'Cancelled') continue;
    let items;
    try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch { continue; }
    if (!Array.isArray(items)) continue;
    const seen = new Set<string>();
    for (const item of items) {
      const id = String(item.productId ?? item.product_id ?? item.id ?? '');
      const product = catalog.get(id);
      const qty = Number(item.qty ?? item.quantity ?? 0);
      if (!product || !Number.isFinite(qty) || qty <= 0) continue;
      const amount = Number(item.totalPrice ?? item.total_price ?? item.line_total ?? (Number(item.unitPrice ?? item.price ?? 0) * qty));
      const total = totals.get(id) || { id: product.id, name: product.name, category: product.category || 'Specialty', orderCount: 0, revenue: 0 };
      if (!seen.has(id)) total.orderCount++;
      seen.add(id);
      if (Number.isFinite(amount) && amount >= 0) total.revenue += amount;
      totals.set(id, total);
    }
  }
  return [...totals.values()].map(p => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))
    .sort((a, b) => b.orderCount - a.orderCount || b.revenue - a.revenue).slice(0, 10);
}
