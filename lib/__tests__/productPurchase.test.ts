import { getCartUnitPrice } from '../cartPricing';
import { describe, it, expect } from 'vitest';
import { getProductPurchaseProfile as profile } from '../productPurchase';
import { stockUnitsPerOption } from '../productPurchase';
import { getProductOptions } from '../productOptions';

describe('Product-specific purchase options', () => {
  it.each([
    ['Premium Bakery Box','hamper','box'],['Golden Bliss Diwali Hamper','hamper','box'],
    ['Black Forest Cake','weight','kg'],['Black Forest Pastry','piece','piece'],
    ['Center Filled Choco-Cookies 75g','pack','pack'],['Besan Ladoo 200g','pack','pack'],
    ['Scented Jar Candle Set of 3','set','set'],['Coffee Scented Candle single piece','piece','piece'],
    ['Traditional Ganesh Laxmi Idols','set','pair'],['Festive Essentials Bhai Bhabhi Rakhi Set','set','pair'],
    ['Adorable Krishna Rakhi For Kids','piece','piece'],['Space Explorer Rakhi Set Of 2','set','set'],
  ])('%s uses %s', (name, kind, unit) => {
    const result=profile({name,sellingUnit:'kg',category:'birthday-cakes'});
    expect(result.kind).toBe(kind);expect(result.sellingUnit.value).toBe(unit);
  });
  it('counts piece packs and complete sets consistently for inventory', () => {
    expect(stockUnitsPerOption({name:'Pastry',sellingUnit:'piece'},'6 pieces')).toBe(6);
    expect(stockUnitsPerOption({name:'Candle Set of 4',sellingUnit:'set'},'Set of 4')).toBe(1);
    expect(stockUnitsPerOption({name:'Cookies 75g'},'75 g pack')).toBe(1);
  });
  it('keeps the configured hamper total in cart without charging wrapping twice', () => {
    expect(getCartUnitPrice({isCustomHamper:true},148,0,[{price:49}])).toBe(148);
    expect(getCartUnitPrice({},529,50,[{price:20}])).toBe(599);
  });
  it('respects piece-priced pastry records whose imported title says cake', () => {
    expect(profile({name:'Red Velvet Choco Truffle Cake',sellingUnit:'piece'}).kind).toBe('piece');
  });
  it('uses gift contents evidence without treating standalone candles as hampers', () => {
    expect(profile({name:'Assorted Gourmet Dry Fruits',shortDescription:'Products Inside the Hamper: Almonds'}).isHamper).toBe(true);
    expect(profile({name:'Candle Set of 4',description:'Perfect to add to gift hampers'}).isHamper).toBe(false);
  });
  it('replaces imported kg-only options on a hamper without changing its price', () => {
    expect(getProductOptions({name:'Premium Bakery Box',sellingUnit:'kg',price:1499,weightOptions:[{label:'1 kg',weightKg:1,price:1499}]})).toMatchObject([{label:'1 hamper',weightKg:0,price:1499}]);
  });
  it('preserves piece price tiers and pack sizes without inventing more options', () => {
    const options=getProductOptions({name:'Pastry',sellingUnit:'piece',weightOptions:[{label:'1 piece',price:99},{label:'6 pieces',price:549}]});
    expect(options.map(x=>[x.label,x.price])).toEqual([['1 piece',99],['6 pieces',549]]);
    expect(getProductOptions({name:'Cookies 75g',price:299})[0]).toMatchObject({label:'75 g pack',price:299,weightKg:0});
  });
  it('parses grams accurately, removes duplicate weight tiers and leaves unknown sizes unspecified', () => {
    const option={label:'500gm',price:499};
    expect(getProductOptions({name:'Cake',sellingUnit:'kg',weightOptions:[option,option]})).toMatchObject([{weightKg:0.5,price:499}]);
    expect(getProductOptions({name:'Mango Cake',price:799})[0]).toMatchObject({label:'Standard size',weightKg:0,price:799});
  });
});
