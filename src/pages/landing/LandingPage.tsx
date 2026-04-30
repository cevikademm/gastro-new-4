import '../auth/welcome-claude.css';
import { LandingNav } from '../../components/landing/LandingNav';
import { AnnouncementBar } from '../../components/landing/sections/AnnouncementBar';
import { HeroSection } from '../../components/landing/sections/HeroSection';
import { BrandStrip } from '../../components/landing/sections/BrandStrip';
import { FlashStrip } from '../../components/landing/sections/FlashStrip';
import { CategoryShowcase } from '../../components/landing/sections/CategoryShowcase';
import { StatsBand } from '../../components/landing/sections/StatsBand';
import { BestSellersSection } from '../../components/landing/sections/BestSellersSection';
import { TestimonialsBand } from '../../components/landing/sections/TestimonialsBand';
import { FinalCTASection } from '../../components/landing/sections/FinalCTASection';
import { FloatingWidgets } from '../../components/landing/sections/FloatingWidgets';
import SiteFooter from '../../components/SiteFooter';

/**
 * 2mc Gastro landing page — e-commerce redesign.
 *
 * Order:
 * 1. Announcement bar (scrolling urgency messages)
 * 2. Navigation
 * 3. Hero (rotating headline + 3D product carousel with €1000+ items)
 * 4. Flash sale strip (48h live countdown)
 * 5. Category showcase (8 categories)
 * 6. Stats band (5.265+ / 15 / 15 / 48h)
 * 7. Best sellers (real products from products.json with social proof + urgency)
 * 8. Final CTA
 * 9. Floating widgets (WhatsApp + live chat)
 */
export default function LandingPage() {
  return (
    <>
      <AnnouncementBar />
      <LandingNav />
      <main className="welcome-claude" id="main-content">
        <HeroSection />
        <BrandStrip />
        <FlashStrip />
        <CategoryShowcase />
        <StatsBand />
        <BestSellersSection />
        <TestimonialsBand />
        <FinalCTASection />
      </main>
      <SiteFooter />
      <FloatingWidgets />
    </>
  );
}
