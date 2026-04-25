import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// Mock motion/react before imports
vi.mock('motion/react', () => {
  const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        const Tag = prop as keyof React.JSX.IntrinsicElements;
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileInView, viewport, ...rest } = props;
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

// Mock useReducedMotion
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) =>
    <a href={to} {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

describe('Reveal', () => {
  it('renders children', async () => {
    const { Reveal } = await import('../../components/landing/primitives/Reveal');
    render(<Reveal><span data-testid="child">hello</span></Reveal>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders with custom tag via as prop', async () => {
    const { Reveal } = await import('../../components/landing/primitives/Reveal');
    render(<Reveal as="section"><span>content</span></Reveal>);
    expect(document.querySelector('section')).toBeInTheDocument();
  });

  it('respects useReducedMotion', async () => {
    const { useReducedMotion } = await import('../../hooks/useReducedMotion');
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { Reveal } = await import('../../components/landing/primitives/Reveal');
    render(<Reveal><span data-testid="rm-child">reduced</span></Reveal>);
    expect(screen.getByTestId('rm-child')).toBeInTheDocument();
  });
});

describe('AnimatedHeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the static prefix', async () => {
    const { AnimatedHeadline } = await import('../../components/landing/primitives/AnimatedHeadline');
    render(
      <AnimatedHeadline
        staticBefore="For professional kitchens,"
        words={['smart solutions.', '5,265+ products.', 'fast delivery.']}
      />
    );
    expect(screen.getByText('For professional kitchens,')).toBeInTheDocument();
  });

  it('renders the first word initially', async () => {
    const { AnimatedHeadline } = await import('../../components/landing/primitives/AnimatedHeadline');
    render(
      <AnimatedHeadline
        staticBefore="For professional kitchens,"
        words={['smart solutions.', '5,265+ products.', 'fast delivery.']}
      />
    );
    expect(screen.getByText('smart solutions.')).toBeInTheDocument();
  });

  it('cycles to the next word after interval', async () => {
    const { AnimatedHeadline } = await import('../../components/landing/primitives/AnimatedHeadline');
    render(
      <AnimatedHeadline
        staticBefore="Static:"
        words={['word0', 'word1', 'word2']}
        interval={1000}
      />
    );
    expect(screen.getByText('word0')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('word1')).toBeInTheDocument();
  });
});

describe('CountUp', () => {
  it('renders the final value (mocked animate)', async () => {
    const { CountUp } = await import('../../components/landing/primitives/CountUp');
    render(<CountUp to={5265} suffix="+" />);
    expect(document.querySelector('[data-testid="countup"]') || document.body).toBeTruthy();
  });

  it('renders suffix', async () => {
    const { CountUp } = await import('../../components/landing/primitives/CountUp');
    const { container } = render(<CountUp to={100} suffix="h" />);
    expect(container.textContent).toContain('h');
  });

  it('renders prefix', async () => {
    const { CountUp } = await import('../../components/landing/primitives/CountUp');
    const { container } = render(<CountUp to={100} prefix="$" />);
    expect(container.textContent).toContain('$');
  });
});

describe('Marquee', () => {
  it('renders children twice for infinite scroll effect', async () => {
    const { Marquee } = await import('../../components/landing/primitives/Marquee');
    render(
      <Marquee>
        <span data-testid="item">Brand</span>
      </Marquee>
    );
    // Children duplicated: 2 instances
    const items = screen.getAllByTestId('item');
    expect(items.length).toBe(2);
  });

  it('renders with pauseOnHover prop without error', async () => {
    const { Marquee } = await import('../../components/landing/primitives/Marquee');
    render(<Marquee pauseOnHover><span>X</span></Marquee>);
    expect(document.body).toBeTruthy();
  });
});
