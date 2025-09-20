// app/play/chain/layout.tsx
export const dynamic = "force-dynamic"; // or: export const revalidate = 0;

export default function ChainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
