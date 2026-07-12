import Hero from '../components/Hero';
import TrustStrip from '../components/TrustStrip';
import Platform from '../components/Platform';
import AIDigestSpotlight from '../components/AIDigestSpotlight';
import PhoneShowcase from '../components/PhoneShowcase';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Pricing from '../components/Pricing';
import CtaBanner from '../components/CtaBanner';

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Platform />
      <AIDigestSpotlight />
      <PhoneShowcase />
      <Features />
      <HowItWorks />
      <Pricing />
      <CtaBanner />
    </>
  );
}
