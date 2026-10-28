export async function updateAdminOrderStatus(orderNumber: string, status: string, note: string) {
  const response = await fetch('/api/orders', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', orderNumber, status, note }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false || data.error) {
    throw new Error(data.error || `Failed to update ${orderNumber} (${response.status}).`);
  }
}

export async function updateAdminOrderStatuses<T extends { id: string; orderNumber: string }>(orders: T[], status: string, note: string) {
  const succeeded: T[] = [];
  const failed: T[] = [];
  for (let offset = 0; offset < orders.length; offset += 10) {
    const chunk = orders.slice(offset, offset + 10);
    const results = await Promise.allSettled(chunk.map(order => updateAdminOrderStatus(order.orderNumber, status, note)));
    results.forEach((result, index) => (result.status === 'fulfilled' ? succeeded : failed).push(chunk[index]));
  }
  return { succeeded, failed };
}
