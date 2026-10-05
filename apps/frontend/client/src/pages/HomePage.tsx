import { useRef } from "react";
import { CategoryShortcuts } from "../components/CategoryShortcuts.tsx";
import { FeaturedProducts } from "../components/FeaturedProducts.tsx";
import { Header } from "../components/Header.tsx";
import { HomeHero } from "../components/HomeHero.tsx";
import { SiteFooter } from "../components/SiteFooter.tsx";
import { SkipLink } from "../components/SkipLink.tsx";

// Home page layout (Home RNF-4): the skip link is the first focusable element
// and moves focus to <main>, which takes focus by script (tabIndex -1).
export function HomePage() {
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="min-h-screen">
      <SkipLink targetRef={mainRef} />
      <Header showBackButton={false} />
      <main ref={mainRef} tabIndex={-1} className="outline-none">
        <HomeHero />
        <FeaturedProducts />
        <CategoryShortcuts />
      </main>
      <SiteFooter />
    </div>
  );
}
