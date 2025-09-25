'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function DailyFailurePage() {
  const sp = useSearchParams();
  const dateKey = sp.get('id') || 'today';
  const score = sp.get('score') || undefined;

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://yourgame.link/daily';
    return `${window.location.origin}/daily`;
  }, []);
  const shareText = useMemo(() => {
    const parts = [
      `I just tried the Word Chains Daily ${dateKey}… and FAILED! 😅`,
      score ? `Score: ${Number.isFinite(+score) ? Number(score).toLocaleString() : score}` : undefined,
      'Think you can beat it?',
    ].filter(Boolean);
    return parts.join(' ');
  }, [dateKey, score]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <div className="failed-stamp" aria-hidden>FAILED!</div>
        <h1 className="sr-only">Daily Failed</h1>
        <p className="mt-28 text-slate-700 dark:text-slate-300 text-lg">
          No piece today — come back tomorrow for a fresh Daily. 💪
        </p>
        {score && (
          <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
            Your score: <b>{Number(score).toLocaleString()}</b>
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/daily" className="btn-primary text-center">Try Again Tomorrow</Link>
        <Link href="/play" className="btn text-center">Play Other Modes</Link>
      </div>

      <ShareRow
        className="mt-10"
        url={shareUrl}
        text={shareText}
        label="Share the challenge"
        sub="Taunt your friends to see if they can beat it."
      />

      <style jsx global>{styles}</style>
    </div>
  );
}

/* ======================== Share row ======================== */
function ShareRow({
  className = '',
  url,
  text,
  label = 'Share',
  sub,
}: {
  className?: string;
  url: string;
  text: string;
  label?: string;
  sub?: string;
}) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const canWebShare = typeof navigator !== 'undefined' && !!(navigator as any).share;

  const onWebShare = async () => {
    try {
      await (navigator as any).share({ title: 'Word Chains — Daily', text, url });
    } catch {}
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert('Copied to clipboard!');
    } catch {
      alert('Copy failed — please copy manually.');
    }
  };

  const messengerDialog = `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=1234567890&redirect_uri=${encodedUrl}`; // replace app_id

  return (
    <div className={['rounded-2xl border border-slate-200 dark:border-slate-700 p-4', className].join(' ')}>
      <div className="text-sm font-semibold mb-1">{label}</div>
      {sub && <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">{sub}</div>}
      <div className="flex flex-wrap gap-2">
        {canWebShare && <button className="btn-primary" onClick={onWebShare}>Share…</button>}
        <a className="btn" href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className="btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`} target="_blank" rel="noopener noreferrer">Facebook</a>
        <a className="btn" href={messengerDialog} target="_blank" rel="noopener noreferrer">Messenger</a>
        <a className="btn" href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer">X / Twitter</a>
        <a className="btn" href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noopener noreferrer">Telegram</a>
        <button className="btn" onClick={copyToClipboard}>Copy Link</button>
      </div>
    </div>
  );
}

/* ======================== Styles ======================== */
const styles = `
/* buttons */
.btn {
  @apply rounded-xl px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm;
}
.btn-primary {
  @apply rounded-xl px-3 py-2 border border-black bg-black text-white hover:bg-black/90 transition text-sm;
}

/* FAILED! animated stamp */
.failed-stamp {
  position: relative;
  display: inline-block;
  margin-top: 1rem;
  padding: .35em .6em;
  font-weight: 900;
  font-size: clamp(48px, 12vw, 100px);
  letter-spacing: .04em;
  color: #b91c1c; /* red-700 */
  text-transform: uppercase;
  border: 6px solid rgba(239, 68, 68, .7); /* red-500 */
  border-radius: .35rem;
  transform: rotate(-8deg);
  box-shadow: 0 12px 28px rgba(0,0,0,.15), inset 0 0 0 4px rgba(239,68,68,.25);
  background: radial-gradient(ellipse at center, rgba(254,226,226,.25), rgba(254,226,226,0));
  animation: failed-pop 900ms cubic-bezier(.2,.8,.2,1) both, failed-shake 900ms ease-out 300ms 1;
}
@keyframes failed-pop {
  0% { transform: scale(.7) rotate(-15deg); opacity: 0; filter: blur(2px); }
  40% { opacity: 1; filter: blur(0); }
  100% { transform: scale(1) rotate(-8deg); opacity: 1; }
}
@keyframes failed-shake {
  0% { transform: rotate(-8deg) translateX(0); }
  20% { transform: rotate(-9deg) translateX(-4px); }
  40% { transform: rotate(-7deg) translateX(3px); }
  60% { transform: rotate(-9deg) translateX(-2px); }
  80% { transform: rotate(-8deg) translateX(2px); }
  100% { transform: rotate(-8deg) translateX(0); }
}
`;
