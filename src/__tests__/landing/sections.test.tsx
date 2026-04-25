import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock motion/react
vi.mock('motion/react', () => {
  const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        const Tag = prop as keyof React.JSX.IntrinsicElements;
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileInView, viewport, ...rest } = props as Record<string, unknown>;
          void initial; void animate; void exit; void transition; void whileHover; void whileInView; void viewport;
          return React.createElement(Tag, { ...rest, ref } as Record<string, unknown>);
        });
      },
    }
  );
  const useMotionValue = (initial: number) => ({ get: () => initial, set: vi.fn(), on: vi.fn() });
  const useInView = () => true;
  const animate = vi.fn();
  return { motion, AnimatePresence, useMotionValue, useInView, animate };
});

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'landing.hero.eyebrow': "Europe's Commercial Kitchen Platform",
        'landing.hero.headline.static': 'For professional kitchens,',
        'landing.hero.headline.words.0': 'smart solutions.',
        'landing.hero.headline.words.1': '5,265+ products.',
        'landing.hero.headline.words.2': 'fast delivery.',
        'landing.hero.sub': 'Explore 15 brands in one platform.',
        'landing.hero.cta.primary': 'Start Your Project',
        'landing.hero.cta.secondary': 'Watch Demo',
        'landing.hero.trust.products': '5,265+ Products',
        'landing.hero.trust.brands': '15 Brands',
        'landing.hero.trust.countries': '15 Countries',
        'landing.hero.trust.delivery': '24-48h Delivery',
        'landing.stats.eyebrow': '2mc-gastro by the numbers',
        'landing.stats.products.label': 'Products',
        'landing.stats.brands.label': 'Brands',
        'landing.stats.countries.label': 'Active Countries',
        'landing.stats.delivery.label': 'Delivery Hours',
        'landing.categories.eyebrow': 'Equipment Categories',
        'landing.categories.heading': 'Every kitchen need,',
        'landing.categories.heading.accent': 'one platform.',
        'landing.categories.cooling': 'Cooling',
        'landing.categories.cooking': 'Cooking',
        'landing.categories.prep': 'Preparation',
        'landing.categories.pizza': 'Pizza',
        'landing.categories.selfservice': 'Self Service',
        'landing.categories.dynamic': 'Dynamic',
        'landing.categories.icecream': 'Ice Cream',
        'landing.categories.coffee': 'Coffee',
        'landing.finalcta.heading': 'Start your project today',
        'landing.finalcta.heading.accent': 'fast and free.',
        'landing.finalcta.sub': 'Free to register · No credit card required',
        'landing.finalcta.register': 'Register Free',
        'landing.finalcta.quote': 'Request a Quote',
        'landing.nav.login': 'Log In',
        'landing.nav.register': 'Register',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) =>
    <a href={to} {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock('../../components/LanguageSelector', () => ({
  default: () => <div data-testid="lang-selector" />,
}));

vi.mock('../../components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));

describe('HeroSection', () => {
  it('renders the eyebrow text', async () => {
    const { HeroSection } = await import('../../components/landing/sections/HeroSection');
    render(<HeroSection />);
    expect(screen.getByText("Europe's Commercial Kitchen Platform")).toBeInTheDocument();
  });

  it('renders primary CTA with correct href', async () => {
    const { HeroSection } = await import('../../components/landing/sections/HeroSection');
    render(<HeroSection />);
    const primary = screen.getByText('Start Your Project').closest('a');
    expect(primary).toHaveAttribute('href', '/register');
  });

  it('renders secondary CTA with correct href', async () => {
    const { HeroSection } = await import('../../components/landing/sections/HeroSection');
    render(<HeroSection />);
    const secondary = screen.getByText('Watch Demo').closest('a');
    expect(secondary).toHaveAttribute('href', '/welcome');
  });

  it('renders 4 trust strip items', async () => {
    const { HeroSection } = await import('../../components/landing/sections/HeroSection');
    render(<HeroSection />);
    const trustItems = [
      '5,265+ Products',
      '15 Brands',
      '15 Countries',
      '24-48h Delivery',
    ];
    trustItems.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });
});

describe('StatsBand', () => {
  it('renders 4 stat items', async () => {
    const { StatsBand } = await import('../../components/landing/sections/StatsBand');
    render(<StatsBand />);
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Brands')).toBeInTheDocument();
    expect(screen.getByText('Active Countries')).toBeInTheDocument();
    expect(screen.getByText('Delivery Hours')).toBeInTheDocument();
  });
});

describe('CategoryShowcase', () => {
  it('renders 8 category cards', async () => {
    const { CategoryShowcase } = await import('../../components/landing/sections/CategoryShowcase');
    render(<CategoryShowcase />);
    const categories = ['Cooling', 'Cooking', 'Preparation', 'Pizza', 'Self Service', 'Dynamic', 'Ice Cream', 'Coffee'];
    categories.forEach((cat) => {
      expect(screen.getByText(cat)).toBeInTheDocument();
    });
  });

  it('each card links to correct href', async () => {
    const { CategoryShowcase } = await import('../../components/landing/sections/CategoryShowcase');
    render(<CategoryShowcase />);
    const coolingLink = screen.getByText('Cooling').closest('a');
    expect(coolingLink).toHaveAttribute('href', '/products?category=cooling');
  });
});

describe('FinalCTASection', () => {
  it('renders register and quote CTAs', async () => {
    const { FinalCTASection } = await import('../../components/landing/sections/FinalCTASection');
    render(<FinalCTASection />);
    expect(screen.getByText('Register Free').closest('a')).toHaveAttribute('href', '/register');
    expect(screen.getByText('Request a Quote').closest('a')).toHaveAttribute('href', '/rfq');
  });
});

describe('LandingNav', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders logo with 2mc and gastro text', async () => {
    const { LandingNav } = await import('../../components/landing/LandingNav');
    render(<LandingNav />);
    expect(screen.getByText('2mc')).toBeInTheDocument();
    expect(screen.getByText('gastro')).toBeInTheDocument();
  });

  it('renders register link', async () => {
    const { LandingNav } = await import('../../components/landing/LandingNav');
    render(<LandingNav />);
    const registerLink = screen.getByText('Register').closest('a');
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('renders language selector', async () => {
    const { LandingNav } = await import('../../components/landing/LandingNav');
    render(<LandingNav />);
    expect(screen.getByTestId('lang-selector')).toBeInTheDocument();
  });
});

describe('LandingPage integration', () => {
  it('renders all Phase 1 sections', async () => {
    const { default: LandingPage } = await import('../../pages/landing/LandingPage');
    render(<LandingPage />);
    expect(screen.getByText("Europe's Commercial Kitchen Platform")).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Cooling')).toBeInTheDocument();
    expect(screen.getByText('Register Free')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
  });
});
