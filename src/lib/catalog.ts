import { supabase } from './supabase';
import type { Product } from '../types';

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface DbHeroSlide {
  id: string;
  image_url: string;
  heading: string | null;
  description: string | null;
  primary_cta_text: string | null;
  primary_cta_link: string | null;
  secondary_cta_text: string | null;
  secondary_cta_link: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  short_description: string;
  description: string;
  images: string[];
  badge: string | null;
  colors: string[];
  material: string | null;
  dimensions: string | null;
  weight: string | null;
  details: string[];
  in_stock: boolean;
  stock_count: number;
  featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * Maps a database product row to the storefront Product interface.
 * Preserves 100% compatibility with cart, checkout, and card components.
 */
export function mapDbProductToProduct(db: DbProduct): Product {
  const categorySlug = db.categories?.slug || 'general';

  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    price: Number(db.price),
    originalPrice: db.original_price ? Number(db.original_price) : undefined,
    shortDescription: db.short_description,
    description: db.description,
    category: categorySlug,
    images: Array.isArray(db.images) && db.images.length > 0
      ? db.images
      : ['/images/products/placeholder.svg'],
    badge: db.badge || undefined,
    colors: Array.isArray(db.colors) ? db.colors : [],
    material: db.material || undefined,
    dimensions: db.dimensions || undefined,
    weight: db.weight || undefined,
    details: Array.isArray(db.details) ? db.details : [],
    inStock: Boolean(db.in_stock),
    stockCount: Number(db.stock_count) || 0,
    featured: Boolean(db.featured),
  };
}

/**
 * Public catalog fetcher: retrieves only active products from Supabase.
 * Respects RLS (anon read only sees is_active = true).
 * Does not fall back to stale static arrays if the database returns 0 products.
 */
export async function getStoreProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        category_id,
        name,
        slug,
        price,
        original_price,
        short_description,
        description,
        images,
        badge,
        colors,
        material,
        dimensions,
        weight,
        details,
        in_stock,
        stock_count,
        featured,
        is_active,
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase products fetch warning:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return (data as unknown as DbProduct[]).map(mapDbProductToProduct);
  } catch (err) {
    console.warn('Error fetching store products:', err);
    return [];
  }
}

/**
 * Public category fetcher: retrieves all categories ordered by display_order.
 */
export async function getStoreCategories(): Promise<DbCategory[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data) {
      if (error) console.warn('Error fetching store categories:', error.message);
      return [];
    }

    return data as DbCategory[];
  } catch (err) {
    console.warn('Error fetching store categories:', err);
    return [];
  }
}

/**
 * Retrieves a single active product by slug.
 * Returns undefined if deleted, inactive, or not found.
 */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        category_id,
        name,
        slug,
        price,
        original_price,
        short_description,
        description,
        images,
        badge,
        colors,
        material,
        dimensions,
        weight,
        details,
        in_stock,
        stock_count,
        featured,
        is_active,
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.warn('Supabase product by slug fetch error:', error.message);
      return undefined;
    }

    if (!data) {
      return undefined;
    }

    return mapDbProductToProduct(data as unknown as DbProduct);
  } catch (err) {
    console.warn('Error fetching product by slug:', err);
    return undefined;
  }
}

/**
 * Retrieves active featured products.
 */
export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        category_id,
        name,
        slug,
        price,
        original_price,
        short_description,
        description,
        images,
        badge,
        colors,
        material,
        dimensions,
        weight,
        details,
        in_stock,
        stock_count,
        featured,
        is_active,
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('featured', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return (data as unknown as DbProduct[]).map(mapDbProductToProduct);
  } catch (err) {
    console.warn('Error fetching featured products:', err);
    return [];
  }
}

/**
 * Retrieves related products in the same category.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await getStoreProducts();
  return all
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
}

/**
 * Public hero slides fetcher: retrieves only active slides ordered by display_order.
 */
export async function getHeroSlides(): Promise<DbHeroSlide[]> {
  try {
    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !data) {
      if (error) console.warn('Error fetching hero slides:', error.message);
      return [];
    }

    return data as DbHeroSlide[];
  } catch (err) {
    console.warn('Error fetching hero slides:', err);
    return [];
  }
}

