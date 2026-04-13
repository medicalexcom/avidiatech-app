import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Problem from '@/components/Problem'
import Pipeline from '@/components/Pipeline'
import SocialProof from '@/components/SocialProof'
import HowItWorks from '@/components/HowItWorks'
import Features from '@/components/Features'
import Pricing from '@/components/Pricing'
import CTABanner from '@/components/CTABanner'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Pipeline />
        <SocialProof />
        <HowItWorks />
        <Features />
        <Pricing />
        <CTABanner />
      </main>
      <Footer />
    </>
  )
}
