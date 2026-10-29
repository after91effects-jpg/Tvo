export type CategoryNode = {id:number;parent_id?:number|null;name?:string;slug?:string};
export function categoryDescendants(categories:CategoryNode[], root:number):number[] {
  const found=new Set<number>([root]);let changed=true;
  while(changed){changed=false;for(const category of categories)if(category.parent_id!=null && found.has(Number(category.parent_id))&&!found.has(Number(category.id))){found.add(Number(category.id));changed=true;}}
  return [...found];
}
export function categoryPath(categories:CategoryNode[], category:CategoryNode) {
  const labels:string[]=[];const seen=new Set<number>();let current:CategoryNode|undefined=category;
  while(current&&!seen.has(current.id)){seen.add(current.id);labels.unshift(current.name||current.slug||String(current.id));current=categories.find(p=>p.id===current!.parent_id);}
  return labels.join(' › ');
}

export function categoryAncestorSlugs(categories:CategoryNode[], id:number) {
  const slugs:string[]=[];const seen=new Set<number>();let current=categories.find(c=>c.id===Number(id));
  while(current&&!seen.has(current.id)){seen.add(current.id);if(current.slug)slugs.push(current.slug);current=categories.find(c=>c.id===current!.parent_id);}
  return slugs;
}
