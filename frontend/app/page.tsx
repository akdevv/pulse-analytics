import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Install } from "@/components/landing/install";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="pa-landing relative isolate min-h-screen bg-charcoal">
      <Nav />
      <Hero />
      <HowItWorks />
      <Features />
      <Install />
      <CTA />
      <Footer />
    </main>
  );
}
