import { Product } from '../types';
import { CSV_CATEGORIES } from '../csvCategories';
import { CSV_CAKE_PRODUCTS } from './cakes';
import { CSV_DESSERT_PRODUCTS } from './desserts';
import { CSV_HAMPER_PRODUCTS } from './hampers';
import { CSV_RAKHI_PRODUCTS } from './rakhi';

export { CSV_CATEGORIES } from '../csvCategories';
export { CSV_CAKE_PRODUCTS } from './cakes';
export { CSV_DESSERT_PRODUCTS } from './desserts';
export { CSV_HAMPER_PRODUCTS } from './hampers';
export { CSV_RAKHI_PRODUCTS } from './rakhi';

export const ALL_CSV_PRODUCTS: Product[] = [
  ...CSV_CAKE_PRODUCTS,
  ...CSV_DESSERT_PRODUCTS,
  ...CSV_HAMPER_PRODUCTS,
  ...CSV_RAKHI_PRODUCTS,
];
