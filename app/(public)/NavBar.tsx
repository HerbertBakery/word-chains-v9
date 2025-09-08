"use client";
import AuthGate from "../components/AuthGate";

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <a href="/" className="font-semibold">Word Chains</a>
      <AuthGate />
    </nav>
  );
}
