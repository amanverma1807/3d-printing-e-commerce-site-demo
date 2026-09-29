// Central site configuration — update these values in one place
export const siteConfig = {
  brand: {
    name: 'E-commerce Store',
    tagline: 'Quality Products. Simple Shopping.',
    description: 'A modern, premium e-commerce store built for high-performance shopping experiences.',
    url: '',
  },
  contact: {
    whatsapp: '',
    whatsappDisplay: '',
    whatsappUrl: '',
    whatsappMessage: "Hi! I'd like to know more about your products.",
    email: '',
    phone: '',
    phoneRaw: '',
    phoneDisplay: '',
  },
  social: {
    instagram: '',
    instagramHandle: '',
    instagramDisplay: '',
  },
  nav: [
    { label: 'Shop', href: '/shop' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Custom Printing', href: '/custom' },
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
  currency: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
  },
  shipping: {
    flatRate: 110,
  },
} as const;

export type Category = typeof siteConfig.categories[number];
export type NavItem = typeof siteConfig.nav[number];

export function formatPrice(price: number): string {
  return new Intl.NumberFormat(siteConfig.currency.locale, {
    style: 'currency',
    currency: siteConfig.currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function getWhatsAppLink(message?: string): string {
  const phone = siteConfig.contact.whatsapp.replace(/\D/g, '');
  if (!phone) return '#';
  if (message && message.trim()) {
    const msg = encodeURIComponent(message.trim());
    return `https://wa.me/${phone}?text=${msg}`;
  }
  return `https://wa.me/${phone}`;
}
