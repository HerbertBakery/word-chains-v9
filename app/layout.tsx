// app/layout.tsx
import "./globals.css";
import PageShell from "./components/PageShell";
import Header from "./components/header";             // Use capital H
import Providers from "./providers";
import { VfxProvider } from "./hooks/useVFX";
import SfxUnlock from "./components/SfxUnlock";
import { ThemeProvider } from "./components/ThemeProvider"; // keep provider

export const metadata = {
  title: "Word Chains",
  description: "Chain words. Stack multipliers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <Providers>
          <SfxUnlock />
          <ThemeProvider>
            <VfxProvider>
              <PageShell>
                {/* Removed extra ThemeToggle here */}
                <Header />
                {children}
              </PageShell>
            </VfxProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
