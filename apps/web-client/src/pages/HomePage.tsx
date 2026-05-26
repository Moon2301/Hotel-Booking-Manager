import { SiteHeader } from '../components/landing/SiteHeader';
import { HeroSection } from '../components/landing/HeroSection';
import { AboutSection } from '../components/landing/AboutSection';
import { FeaturesStrip } from '../components/landing/FeaturesStrip';
import { RoomsShowcaseSection } from '../components/landing/RoomsShowcaseSection';
import { AmenitiesShowcaseSection } from '../components/landing/AmenitiesShowcaseSection';
import { ReviewsSection } from '../components/landing/ReviewsSection';
import { SiteFooter } from '../components/landing/SiteFooter';

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-mango-navy-950">
      <SiteHeader />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesStrip />
        <RoomsShowcaseSection />
        <AmenitiesShowcaseSection />
        <ReviewsSection />
      </main>
      <SiteFooter />
    </div>
  );
}
