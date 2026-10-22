import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { StackMarquee } from "@/components/landing/stack-marquee";
import { Globe } from "@/components/landing/globe";
import { Features } from "@/components/landing/features";
import { RoundTrip } from "@/components/landing/round-trip";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Install } from "@/components/landing/install";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="pa-landing relative isolate min-h-screen bg-charcoal">
      <Nav />
      <Hero />
      <StackMarquee />
      <Globe />
      <Features />
      <RoundTrip />
      <HowItWorks />
      <Install />
      <CTA />
      <Footer />
    </main>
  );
}
