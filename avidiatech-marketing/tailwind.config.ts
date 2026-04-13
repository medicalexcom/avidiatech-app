import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#f8fafc',
          surface: '#ffffff',
          text: '#020617',
          muted: '#64748b',
          primary: '#06b6d4',
          primarySoft: '#ecfeff',
          primaryStrong: '#0891b2',
          secondary: '#22c55e',
          secondarySoft: '#ecfdf5',
          warm: '#f59e0b',
          warmSoft: '#fffbeb',
          ai: '#ec4899',
          aiSoft: '#fdf2f8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #ecfeff 0%, #f0fdf4 50%, #f8fafc 100%)',
        'pipeline-gradient': 'linear-gradient(90deg, #06b6d4, #22c55e)',
      },
    },
  },
  plugins: [],
}

export default config
