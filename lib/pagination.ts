export function normalizePagination(rawLimit: unknown, rawPage: unknown, defaultLimit = 50) {
  const limitValue = Number(rawLimit);
  const pageValue = Number(rawPage);
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(500, Math.max(1, Math.floor(limitValue))) : defaultLimit;
  const page = Number.isFinite(pageValue) && pageValue >= 1 ? Math.floor(pageValue) : 1;
  return { limit, page, offset: (page - 1) * limit };
}
