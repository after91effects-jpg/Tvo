export function buildTree(list: any[], parentId: number | null = null): any[] {
  return list
    .filter((c) => (c.parent_id ?? null) === (parentId ?? null))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ ...c, children: buildTree(list, c.id) }));
}