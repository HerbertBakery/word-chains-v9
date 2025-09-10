// app/layout.tsx
import "./globals.css";
import PageShell from "./components/PageShell";
import Header from "./components/header";
import Providers from "./providers"; // ← delete this line & wrapper if not using NextAuth
import { VfxProvider } from "./hooks/useVFX";
import SfxUnlock from "./components/SfxUnlock"; // ← add this

export const metadata = {
  title: "Word Chains",
  description: "Chain words. Stack multipliers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SfxUnlock /> {/* ← unlocks Safari/iOS audio on first user gesture */}
          <VfxProvider>
            <PageShell>
              <Header />
              {children}
            </PageShell>
          </VfxProvider>
        </Providers>
      </body>
    </html>
  );
}
