export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  category: string;
  images: string[];
  badge?: string;
  colors?: string[];
  inStock: boolean;
  stockCount?: number;
  featured: boolean;
  details?: string[];
  material?: string;
  dimensions?: string;
  weight?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  slug: string;
  color?: string;
}

export interface CheckoutFormData {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  customer: CheckoutFormData;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  tracking_number?: string;
  createdAt: string;
}
