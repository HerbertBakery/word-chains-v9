// app/layout.tsx
import "./globals.css";
import PageShell from "./components/PageShell";
import Header from "./components/header";
import Providers from "./providers"; // ← delete this line & wrapper if not using NextAuth

export const metadata = {
  title: "Word Chains",
  description: "Chain words. Stack multipliers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <PageShell>
            <Header />
            {children}
          </PageShell>
        </Providers>
      </body>
    </html>
  );
}
