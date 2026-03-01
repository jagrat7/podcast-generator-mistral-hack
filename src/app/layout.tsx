import "~/styles/globals.css"

import { type Metadata } from "next"
import { Geist } from "next/font/google"

import { TRPCReactProvider } from "~/trpc/react"
import { ThemeProvider } from "~/components/theme-provider"
import { Nav } from "~/components/nav"
import { Footer } from "~/components/footer"

export const metadata: Metadata = {
  title: "Podcaster - AI Podcast Generator",
  description: "Generate custom AI podcasts from books with character voices",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TRPCReactProvider>
            <Nav />
            <main>{children}</main>
            <Footer />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
