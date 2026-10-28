export function getOrderStatusKey(status: string): 'pending' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' {
  const value = (status || '').toLowerCase().trim();
  if (value.includes('cancel') || value.includes('void')) return 'cancelled';
  if (value === 'delivered' || value.includes('completed') || value.includes('received')) return 'delivered';
  if (/transit|out[ _-]for[ _-]delivery|dispatched|en route|delivery fleet/.test(value)) return 'out_for_delivery';
  if (/baking|kitchen|prep|handcraft|icing/.test(value)) return 'preparing';
  return 'pending';
}
