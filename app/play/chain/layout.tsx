// app/play/chain/layout.tsx
export const dynamic = "force-dynamic"; // (equivalent to revalidate = 0; no caching)

export default function ChainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
