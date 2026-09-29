-- ============================================================================
-- Hero Slides Database Migration
-- Migration: 20260927_hero_slides
-- Description: Create public.hero_slides table with RLS and seed initial slides
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  heading TEXT,
  description TEXT,
  primary_cta_text TEXT,
  primary_cta_link TEXT,
  secondary_cta_text TEXT,
  secondary_cta_link TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for storefront query performance
CREATE INDEX IF NOT EXISTS idx_hero_slides_is_active_order 
  ON public.hero_slides (is_active, display_order);

-- Automatic updated_at trigger using existing helper function
DROP TRIGGER IF EXISTS set_hero_slides_updated_at ON public.hero_slides;
CREATE TRIGGER set_hero_slides_updated_at
  BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hero_slides' AND policyname = 'Public can view active hero slides'
  ) THEN
    CREATE POLICY "Public can view active hero slides"
      ON public.hero_slides FOR SELECT
      TO anon, authenticated
      USING (is_active = true OR public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hero_slides' AND policyname = 'Admins can insert hero slides'
  ) THEN
    CREATE POLICY "Admins can insert hero slides"
      ON public.hero_slides FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hero_slides' AND policyname = 'Admins can update hero slides'
  ) THEN
    CREATE POLICY "Admins can update hero slides"
      ON public.hero_slides FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hero_slides' AND policyname = 'Admins can delete hero slides'
  ) THEN
    CREATE POLICY "Admins can delete hero slides"
      ON public.hero_slides FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- Seed initial slides if table is currently empty
INSERT INTO public.hero_slides (
  image_url,
  heading,
  description,
  primary_cta_text,
  primary_cta_link,
  secondary_cta_text,
  secondary_cta_link,
  display_order,
  is_active
)
SELECT * FROM (
  VALUES
    (
      '/assets/p1.png',
      'Quality Products. Designed to Stand Out.',
      'Discover curated essentials and handcrafted pieces made with premium materials and meticulous attention to detail.',
      'Shop Collection',
      '/shop',
      'Explore Catalog',
      '/shop',
      1,
      true
    ),
    (
      '/assets/p2.png',
      'New Arrivals & Featured Collection',
      'Explore our latest releases crafted with modern aesthetics, exceptional durability, and precision.',
      'Shop New Arrivals',
      '/shop',
      'View Details',
      '/shop',
      2,
      true
    ),
    (
      '/assets/p3.png',
      'Everyday Essentials for Modern Living',
      'Thoughtfully designed products that bring functional beauty and minimalist elegance to your daily routine.',
      'Browse Essentials',
      '/shop',
      'Learn More',
      '/about',
      3,
      true
    ),
    (
      '/assets/p4.png',
      'Workspace & Lifestyle Upgrades',
      'Elevate your everyday environment with sleek organizers, statement pieces, and purposeful accessories.',
      'View Collection',
      '/shop',
      'Contact Us',
      '/contact',
      4,
      true
    ),
    (
      '/assets/p5.png',
      'Custom Orders & Special Requests',
      'Looking for tailored solutions or bespoke requests? Reach out to our team to discuss your project requirements.',
      'Get in Touch',
      '/contact',
      'Contact Support',
      '/contact',
      5,
      true
    )
) AS v(image_url, heading, description, primary_cta_text, primary_cta_link, secondary_cta_text, secondary_cta_link, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.hero_slides);
