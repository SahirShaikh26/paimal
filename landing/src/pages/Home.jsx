import Hero from '../components/Hero';
import TrustStrip from '../components/TrustStrip';
import AIDigestSpotlight from '../components/AIDigestSpotlight';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Pricing from '../components/Pricing';
import CtaBanner from '../components/CtaBanner';

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <AIDigestSpotlight />
      <Features />
      <HowItWorks />
      <Pricing />
      <CtaBanner />
    </>
  );
}
