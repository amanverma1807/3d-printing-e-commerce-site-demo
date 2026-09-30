import { supabase } from './supabase';

import type { CartItem } from '../types';
export type { CartItem };

const CART_KEY = 'cart';

/**
 * Safely reads the cart array from localStorage.
 */
export function getLocalCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Saves the cart array to localStorage and notifies listeners.
 */
export function saveLocalCart(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  dispatchCartUpdated();
}

/**
 * Dispatches custom event for same-window sync.
 */
export function dispatchCartUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cart:updated'));
}

/**
 * Updates the navbar cart count badge if present in the DOM.
 */
export function updateNavbarCartBadge(): void {
  if (typeof window === 'undefined') return;
  const cart = getLocalCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) {
    cartCountEl.textContent = String(count);
    if (count > 0) {
      cartCountEl.classList.remove('hidden');
    } else {
      cartCountEl.classList.add('hidden');
    }
  }
}

/**
 * Validates local cart items against the authoritative Supabase catalog.
 * - Removes products that no longer exist or have is_active = false.
 * - Synchronizes current DB price, name, slug, and image.
 * - Preserves item quantities and selected colors.
 * - Handles network/Supabase errors gracefully without wiping the user's cart.
 */
export async function validateAndUpdateCart(): Promise<{
  cart: CartItem[];
  removedItems: CartItem[];
  hasChanges: boolean;
}> {
  const currentCart = getLocalCart();
  if (currentCart.length === 0) {
    return { cart: [], removedItems: [], hasChanges: false };
  }

  const ids = Array.from(new Set(currentCart.map((item) => item.id).filter(Boolean)));

  if (ids.length === 0) {
    saveLocalCart([]);
    return { cart: [], removedItems: currentCart, hasChanges: true };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, price, shipping_fee, images, is_active, in_stock')
      .in('id', ids);

    // If Supabase returns an error (network drop, downtime), do NOT wipe local items
    if (error) {
      console.warn('Cart validation network error, preserving local cart:', error.message);
      return { cart: currentCart, removedItems: [], hasChanges: false };
    }

    // Build map of active products from database
    const activeProductMap = new Map<string, any>();
    if (Array.isArray(data)) {
      for (const p of data) {
        if (p.is_active) {
          activeProductMap.set(p.id, p);
        }
      }
    }

    const updatedCart: CartItem[] = [];
    const removedItems: CartItem[] = [];
    let hasChanges = false;

    for (const item of currentCart) {
      const dbProd = activeProductMap.get(item.id);
      if (!dbProd) {
        // Product was deleted from database OR is inactive (is_active = false)
        removedItems.push(item);
        hasChanges = true;
      } else {
        const freshPrice = Number(dbProd.price);
        const freshShippingFee = Number(dbProd.shipping_fee || 0);
        const freshName = dbProd.name;
        const freshSlug = dbProd.slug;
        const freshImage =
          Array.isArray(dbProd.images) && dbProd.images.length > 0
            ? dbProd.images[0]
            : item.image;

        if (
          item.price !== freshPrice ||
          item.shippingFee !== freshShippingFee ||
          item.name !== freshName ||
          item.slug !== freshSlug ||
          item.image !== freshImage
        ) {
          hasChanges = true;
        }

        updatedCart.push({
          ...item,
          name: freshName,
          price: freshPrice,
          shippingFee: freshShippingFee,
          slug: freshSlug,
          image: freshImage,
          // Preserves user quantity and selected color
        });
      }
    }

    if (hasChanges) {
      saveLocalCart(updatedCart);
      updateNavbarCartBadge();
    }

    return { cart: updatedCart, removedItems, hasChanges };
  } catch (err) {
    console.warn('Exception during cart validation, preserving local cart:', err);
    return { cart: currentCart, removedItems: [], hasChanges: false };
  }
}

/**
 * Calculates total product-level shipping fees for a cart.
 *
 * DETERMINISTIC CALCULATION RULE:
 * Each distinct product line's configured charge (shipping_fee) is applied ONCE,
 * regardless of the unit quantity for that product.
 *
 * Example:
 * - Product A (price ₹500, shipping ₹50, quantity 3) -> shipping = ₹50 (not ₹150)
 * - Product B (price ₹300, shipping ₹80, quantity 1) -> shipping = ₹80
 * Total shipping = ₹130.
 */
export function calculateCartShipping(cart: CartItem[]): number {
  if (!cart || cart.length === 0) return 0;

  const seenIds = new Set<string>();
  let totalShipping = 0;

  for (const item of cart) {
    if (item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      totalShipping += Number(item.shippingFee || 0);
    }
  }

  return Math.round(totalShipping * 100) / 100;
}
