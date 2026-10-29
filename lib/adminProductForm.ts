import type { WeightOption } from './types';
import type { PurchaseKind } from './productPurchase';
export const PURCHASE_TYPES: Array<{value: PurchaseKind; label: string; unit: string}> = [
  {value:'weight',label:'Cake / sold by weight',unit:'kg'}, {value:'piece',label:'Pastry / individual pieces',unit:'piece'},
  {value:'pack',label:'Fixed pack / jar / bottle',unit:'pack'}, {value:'set',label:'Set / pair',unit:'set'},
  {value:'hamper',label:'Gift hamper / gift box',unit:'box'}, {value:'quantity',label:'Other / custom quantity',unit:'piece'},
];
export function validateProductPrices(price: unknown, mrp: unknown) {
  const sale=Number(price), regular=Number(mrp);
  if (price === '' || mrp === '' || !Number.isFinite(sale) || !Number.isFinite(regular) || sale<0 || regular<0) throw new Error('Enter valid non-negative selling price and MRP.');
  if (sale>regular) throw new Error('Selling price cannot exceed MRP.');
  return {price:sale,mrp:regular};
}
export function validateProductOptions(raw: unknown): WeightOption[] {
  const parsed=typeof raw==='string'?JSON.parse(raw):raw;
  const rows=Array.isArray(parsed)?parsed:parsed?.options;
  if (!Array.isArray(rows)) throw new Error('Product options must be an array.');
  const labels=new Set<string>();
  return rows.map((row, index)=>{
    const label=String(row.label || row.value || '').trim();
    if (!label || labels.has(label.toLowerCase())) throw new Error('Each product option needs a unique label.');
    labels.add(label.toLowerCase());
    const prices=validateProductPrices(row.price,row.mrp ?? row.price);
    const weight=Number(row.weightKg ?? 0);
    if (!Number.isFinite(weight)||weight<0) throw new Error('Option weight must be a valid non-negative number.');
    return {...row,label,value:label,weightKg:weight,price:prices.price,mrp:prices.mrp,isDefault:index===0};
  });
}
