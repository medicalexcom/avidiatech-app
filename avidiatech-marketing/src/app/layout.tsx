import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AvidiaTech — AI-Powered Product Data Automation',
  description:
    'AvidiaTech automates product data for eCommerce stores. Extract structured data from supplier URLs, generate SEO-optimized descriptions, and publish directly to Shopify, BigCommerce, or WooCommerce. Start free.',
  metadataBase: new URL('https://avidiatech.com'),
  keywords: [
    'product data automation',
    'AI product descriptions',
    'ecommerce SEO automation',
    'Shopify product data',
    'BigCommerce product content',
    'bulk product description generator',
    'product data extraction',
    'AvidiaExtract',
    'AvidiaSEO',
  ],
  openGraph: {
    title: 'AvidiaTech — AI-Powered Product Data Automation',
    description:
      'Turn messy supplier data into publish-ready SEO content automatically. Extract → Describe → SEO → Export to Shopify, BigCommerce, WooCommerce.',
    url: 'https://avidiatech.com',
    siteName: 'AvidiaTech',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AvidiaTech — AI Product Data Automation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AvidiaTech — AI-Powered Product Data Automation',
    description:
      'Automate product descriptions, SEO, and catalog management. Works with Shopify, BigCommerce, and WooCommerce.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
