import localFont from 'next/font/local'
import { Inter } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const zpix = localFont({
  src: '../public/fonts/zpix.ttf',
  variable: '--font-zpix',
  display: 'swap',
}) 