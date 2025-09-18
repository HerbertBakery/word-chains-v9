import "./globals.css";
import PageShell from "./components/PageShell";
import Header from "./components/header"; // Use capital H
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
      <head>
        {/* Prevent flash of wrong theme on first paint and during route changes */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var stored = localStorage.getItem('theme'); // 'light' | 'dark' | 'system' | null
    var isDark = stored === 'dark' || (
      (stored === null || stored === 'system') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) || stored === null; // default to dark
    var root = document.documentElement;
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    // Hint to browser for correct built-in controls
    var m = document.createElement('meta');
    m.name = 'color-scheme';
    m.content = 'light dark';
    document.head.appendChild(m);
  } catch (_) {}
})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <SfxUnlock />
          <ThemeProvider>
            <VfxProvider>
              <PageShell>
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
