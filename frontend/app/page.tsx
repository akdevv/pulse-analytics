import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { StackMarquee } from "@/components/landing/stack-marquee";
import { RoundTrip } from "@/components/landing/round-trip";
import { Globe } from "@/components/landing/globe";
import { TypeWall } from "@/components/landing/type-wall";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Install } from "@/components/landing/install";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="pa-landing relative isolate min-h-screen bg-charcoal">
      <Nav />
      <div aria-hidden className="pa-progress" />
      <Hero />
      <StackMarquee />
      <RoundTrip />
      <HowItWorks />
      <Globe />
      <Features />
      <Install />
      <TypeWall />
      <CTA />
      <Footer />
    </main>
  );
}
