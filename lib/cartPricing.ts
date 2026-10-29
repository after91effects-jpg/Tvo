/** A custom hamper's configured price already includes its box, contents and wrapping. */
export function getCartUnitPrice(product: { isCustomHamper?: boolean }, optionPrice: number, flavourPrice: number, addons: Array<{ price: number }>) {
  return product.isCustomHamper ? optionPrice : optionPrice + flavourPrice + addons.reduce((sum, addon) => sum + addon.price, 0);
}
