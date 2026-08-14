import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Ticker } from "@/components/landing/ticker";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StatsBand } from "@/components/landing/stats-band";
import { Features } from "@/components/landing/features";
import { Testimonials } from "@/components/landing/testimonials";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: "var(--pa-bg)" }}>
      <Nav />
      <Hero />
      <Ticker />
      <HowItWorks />
      <StatsBand />
      <Features />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
