// Central site configuration — template configuration for easy multi-client reusability
export const siteConfig = {
  brand: {
    name: 'Store',
    tagline: 'Precision 3D Printing & Bespoke Fabrication',
    description: 'Precision 3D-printed designs, bespoke additive manufacturing, and engineered physical goods.',
    url: '', // Set client production domain (e.g. 'https://example.com')
  },
  contact: {
    phone: '',
    phoneRaw: '',
    phoneDisplay: '',
    whatsapp: '',
    whatsappDisplay: '',
    whatsappUrl: '',
    whatsappMessage: "Hi! I'd like to know more about your products.",
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
    },
  },
  businessHours: {
    weekday: 'Monday - Saturday: 9:00 AM - 8:00 PM',
    weekend: 'Sunday: 10:00 AM - 6:00 PM',
  },
  social: {
    instagram: '',
    instagramHandle: '',
    instagramDisplay: '',
  },
  currency: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
  },
  shipping: {
    estimatedDays: '2–3 business days',
  },
  features: {
    enableCustomOrders: true,
    enableCOD: true,
    enableOnlinePayment: true,
    enableNewsletter: false,
    enableContactForm: false,
  },
  seo: {
    defaultTitle: 'Store — Quality Products & Modern Essentials',
    defaultDescription: 'Explore our curated catalog of quality items designed for style, durability, and everyday living.',
  },
  policyLastUpdated: 'October 2024',
  nav: [
    { label: 'Shop', href: '/shop' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Custom Orders', href: '/custom' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ] as const,
  legal: [
    { label: 'Return Policy', href: '/return-policy' },
    { label: 'Refund Policy', href: '/refund-policy' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Disclaimer', href: '/disclaimer' },
  ] as const,
  categories: [
    { name: 'Home & Living', slug: 'home-living', description: 'Curated pieces for comfortable modern spaces' },
    { name: 'Office', slug: 'office', description: 'Functional accessories for productive workspaces' },
    { name: 'Accessories', slug: 'accessories', description: 'Everyday carrying essentials and organizers' },
    { name: 'Kitchen', slug: 'kitchen', description: 'Practical and elegant dining essentials' },
    { name: 'Utility', slug: 'utility', description: 'Durable gear and versatile everyday tools' },
  ] as const,
} as const;

export type Category = typeof siteConfig.categories[number];
export type NavItem = typeof siteConfig.nav[number];

export function formatPrice(price: number, options?: Intl.NumberFormatOptions): string {
  const num = typeof price === 'number' && !isNaN(price) ? price : 0;
  return new Intl.NumberFormat(siteConfig.currency.locale, {
    style: 'currency',
    currency: siteConfig.currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(num);
}

export function getWhatsAppLink(message?: string): string {
  const rawPhone = siteConfig.contact.whatsapp || '';
  const phone = rawPhone.replace(/\D/g, '');
  if (!phone) return '';
  if (message && message.trim()) {
    const msg = encodeURIComponent(message.trim());
    return `https://wa.me/${phone}?text=${msg}`;
  }
  return `https://wa.me/${phone}`;
}

export function hasWhatsApp(): boolean {
  const rawPhone = siteConfig.contact.whatsapp || '';
  return Boolean(rawPhone.replace(/\D/g, '').length > 0);
}

export function hasEmail(): boolean {
  return Boolean(siteConfig.contact.email && siteConfig.contact.email.trim().length > 0);
}

export function hasPhone(): boolean {
  const raw = siteConfig.contact.phoneRaw || '';
  const display = siteConfig.contact.phoneDisplay || '';
  return Boolean(raw.trim().length > 0 || display.trim().length > 0);
}

export function hasSocial(platform: keyof typeof siteConfig.social): boolean {
  const val = siteConfig.social[platform];
  return Boolean(typeof val === 'string' && val.trim().length > 0);
}

/**
 * Derives a clean 2-letter uppercase initials monogram from the brand name.
 * e.g., "Atelier Goods" -> "AG", "Store" -> "ST"
 */
export function getBrandInitials(name?: string): string {
  const brandName = (name || siteConfig.brand.name || '').trim();
  if (!brandName) return 'ST';
  const words = brandName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return brandName.slice(0, 2).toUpperCase();
}

