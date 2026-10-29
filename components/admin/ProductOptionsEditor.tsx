'use client';
import React from 'react';
import type { WeightOption } from '../../lib/types';
import type { PurchaseKind } from '../../lib/productPurchase';
export function ProductOptionsEditor({options,onChange,kind,basePrice,baseMrp}:{basePrice:number;baseMrp:number;options:WeightOption[];onChange:(options:WeightOption[])=>void;kind:PurchaseKind}) {
  const update=(index:number,field:string,value:string)=>onChange(options.map((row,i)=>i===index?{...row,[field]:field==='label'?value:Number(value)}:row));
  return <fieldset className="space-y-3 rounded-xl border border-[var(--border)] p-4">
    <legend className="px-2 font-semibold">Purchase options & exact prices</legend>
    <p className="text-xs text-[var(--text-muted)]">The first option is the default. Enter only sizes and prices you actually sell. Empty options use the base price. {kind==='hamper'?'Hamper customization uses the separate Hamper Builder settings.':''}</p>
    {options.map((row,index)=><div key={index} className="grid gap-2 sm:grid-cols-5 items-end">
      <label className="text-xs">{index===0?'Default option':'Option label'}<input aria-label={`Option ${index+1} label`} required value={row.label} onChange={e=>update(index,'label',e.target.value)} className="w-full border rounded-lg p-2 bg-[var(--bg-surface)]" placeholder={kind==='weight'?'0.5 kg':kind==='piece'?'6 pieces':kind==='hamper'?'1 hamper':'1 pack'}/></label>
      {kind==='weight'?<label className="text-xs">Weight (kg)<input aria-label={`Option ${index+1} weight`} type="number" min="0" step="0.001" value={row.weightKg || ''} onChange={e=>update(index,'weightKg',e.target.value)} className="w-full border rounded-lg p-2 bg-[var(--bg-surface)]"/></label>:<span className="text-xs text-[var(--text-muted)]">One complete {kind==='piece'?'piece selection':kind} per quantity.</span>}
      <label className="text-xs">Price ₹<input aria-label={`Option ${index+1} price`} required type="number" min="0" step="0.01" value={row.price} onChange={e=>update(index,'price',e.target.value)} className="w-full border rounded-lg p-2 bg-[var(--bg-surface)]"/></label>
      <label className="text-xs">MRP ₹<input aria-label={`Option ${index+1} MRP`} required type="number" min="0" step="0.01" value={row.mrp} onChange={e=>update(index,'mrp',e.target.value)} className="w-full border rounded-lg p-2 bg-[var(--bg-surface)]"/></label>
      <button type="button" className="text-sm text-[var(--danger)] p-2" onClick={()=>onChange(options.filter((_,i)=>i!==index))}>Remove option {index+1}</button>
    </div>)}
    <button type="button" className="text-sm font-semibold text-[var(--primary)]" onClick={()=>onChange([...options,{label:'',weightKg:0,price:options.length?0:basePrice,mrp:options.length?0:baseMrp}])}>+ Add purchase option</button>
  </fieldset>;
}
