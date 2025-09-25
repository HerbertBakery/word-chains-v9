'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * Daily Success Page
 * Query params:
 *   - id: date key (e.g. 2025-09-23)
 *   - score: total score (string/number)
 *   - delta: how many to visually add to the header (usually 1 or 0)
 *   - awarded: "1" only if the server actually awarded a piece on submit
 */
export default function DailySuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-10">Loading…</div>}>
      <DailySuccessInner />
    </Suspense>
  );
}

function DailySuccessInner() {
  const sp = useSearchParams();

  const dateKey = sp.get('id') || 'today';
  const delta = Number(sp.get('delta') || 1);
  const awarded = sp.get('awarded') === '1'; // only bump header if true
  const score = sp.get('score') || undefined;

  const [hasFlown, setHasFlown] = useState(false);
  const pieceRef = useRef<HTMLDivElement>(null);

  // Prepare share text/url
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://yourgame.link/daily';
    return `${window.location.origin}/daily`;
  }, []);
  const shareText = useMemo(() => {
    const parts = [
      `I just cleared the Word Chains Daily ${dateKey} and earned a puzzle piece!`,
      score ? `Score: ${Number.isFinite(+score) ? Number(score).toLocaleString() : score}` : undefined,
      'Can you beat it?',
    ].filter(Boolean);
    return parts.join(' ');
  }, [dateKey, score]);

  // Tell the header to pull fresh count from the DB
  const refreshHeader = () => {
    try {
      window.dispatchEvent(new Event('wc:pieces:refresh'));
    } catch {}
  };

  // Visual +1 (only if server really awarded one)
  const bumpHeader = () => {
    try {
      window.dispatchEvent(new CustomEvent('wc:pieces:delta', { detail: { delta } }));
    } catch {}
  };

  // Kick a refresh immediately on mount (useful on reloads / re-visits)
  useEffect(() => {
    refreshHeader();
  }, []);

  // Animate the piece into the header and handle badge updates
  useEffect(() => {
    const pieceEl = pieceRef.current;
    if (!pieceEl) return;

    const target = document.getElementById('piece-tab');
    if (!target) return;

    const run = async () => {
      // compute vector
      const pieceBox = pieceEl.getBoundingClientRect();
      const targetBox = target.getBoundingClientRect();
      const fromX = pieceBox.left + pieceBox.width / 2;
      const fromY = pieceBox.top + pieceBox.height / 2;
      const toX = targetBox.left + targetBox.width / 2;
      const toY = targetBox.top + targetBox.height / 2;
      const dx = toX - fromX;
      const dy = toY - fromY;

      // play fill/spin then fly
      await pieceEl
        .animate(
          [
            { transform: 'translate3d(0,0,0) scale(1) rotateX(15deg) rotateY(0deg)', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,.15))' },
            { offset: 0.7, transform: `translate3d(${dx * 0.9}px, ${dy * 0.85}px, 0) scale(.55) rotateX(35deg) rotateY(20deg)` },
            { transform: `translate3d(${dx}px, ${dy}px, 0) scale(.35) rotateX(60deg) rotateY(35deg)`, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.2))' },
          ],
          { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards', delay: 1100 }
        )
        .finished
        .catch(() => {});
      setHasFlown(true);

      // If server actually awarded a piece, do a visual +1
      if (awarded) {
        const guardKey = `wc_piece_bumped_${dateKey}`;
        if (!sessionStorage.getItem(guardKey)) {
          bumpHeader();
          sessionStorage.setItem(guardKey, '1');
          try {
            target.classList.add('wc-piece-pop');
            setTimeout(() => target.classList.remove('wc-piece-pop'), 800);
          } catch {}
        }
      }

      // Regardless, refresh from DB so the header shows canonical count
      refreshHeader();
    };

    run();
  }, [awarded, dateKey]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Daily Cleared! 🎉</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          You earned <b>{delta}</b> puzzle piece{delta === 1 ? '' : 's'} for <b>{dateKey}</b>.
        </p>
      </div>

      <div className="relative mt-10 flex items-center justify-center">
        {!hasFlown && <PuzzlePiece3D ref={pieceRef} />}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/daily" className="btn-primary text-center">Back to Daily</Link>
        <Link href="/collection" className="btn text-center">View Collection</Link>
      </div>

      <ShareRow className="mt-10" url={shareUrl} text={shareText} />
      <style jsx global>{styles}</style>
    </div>
  );
}

/* ======================== Puzzle piece ======================== */
type PieceProps = React.HTMLAttributes<HTMLDivElement>;
const PuzzlePiece3D = React.forwardRef<HTMLDivElement, PieceProps>(function PuzzlePiece3D(props, ref) {
  return (
    <div
      ref={ref}
      aria-label="Puzzle piece"
      className={[
        'wc-piece relative h-44 w-44',
        'animate-[wc-fill_900ms_ease-out_forwards, wc-spin_1200ms_cubic-bezier(.2,.8,.2,1)_both]',
      ].join(' ')}
      {...props}
    >
      {/* Glow */}
      <div className="absolute inset-0 rounded-[28%] blur-2xl opacity-60 bg-gradient-to-br from-teal-400/40 via-emerald-400/40 to-cyan-400/40" />
      <svg viewBox="0 0 100 100" className="relative z-10 h-full w-full">
        <path
          d="M22,40 c0,-8 8,-8 8,-8 h10 v-8 c0,-6 5,-10 10,-10 s10,4 10,10 v8 h10 c0,0 8,0 8,8 v10 h8 c6,0 10,5 10,10 s-4,10 -10,10 h-8 v10 c0,8 -8,8 -8,8 h-10 v8 c0,6 -5,10 -10,10 s-10,-4 -10,-10 v-8 h-10 c0,0 -8,0 -8,-8 v-10 h-8 c-6,0 -10,-5 -10,-10 s4,-10 10,-10 h8 z"
          fill="url(#fillGrad)"
          stroke="rgba(0,0,0,.35)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          className="wc-piece-fill"
        />
        <defs>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--wc-c1)" />
            <stop offset="100%" stopColor="var(--wc-c2)" />
          </linearGradient>
          <linearGradient id="sheenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,.85)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <clipPath id="fillClip">
            <rect x="0" y="100" width="100" height="100" className="wc-fill-rect" />
          </clipPath>
        </defs>
        {/* rising color fill */}
        <g clipPath="url(#fillClip)">
          <path
            d="M22,40 c0,-8 8,-8 8,-8 h10 v-8 c0,-6 5,-10 10,-10 s10,4 10,10 v8 h10 c0,0 8,0 8,8 v10 h8 c6,0 10,5 10,10 s-4,10 -10,10 h-8 v10 c0,8 -8,8 -8,8 h-10 v8 c0,6 -5,10 -10,10 s-10,-4 -10,-10 v-8 h-10 c0,0 -8,0 -8,-8 v-10 h-8 c-6,0 -10,-5 -10,-10 s4,-10 10,-10 h8 z"
            fill="url(#fillGrad)"
          />
        </g>
        {/* outline */}
        <path
          d="M22,40 c0,-8 8,-8 8,-8 h10 v-8 c0,-6 5,-10 10,-10 s10,4 10,10 v8 h10 c0,0 8,0 8,8 v10 h8 c6,0 10,5 10,10 s-4,10 -10,10 h-8 v10 c0,8 -8,8 -8,8 h-10 v8 c0,6 -5,10 -10,10 s-10,-4 -10,-10 v-8 h-10 c0,0 -8,0 -8,-8 v-10 h-8 c-6,0 -10,-5 -10,-10 s4,-10 10,-10 h8 z"
          fill="none"
          stroke="rgba(0,0,0,.45)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {/* sheen */}
        <path
          d="M22,40 c0,-8 8,-8 8,-8 h10 v-8 c0,-6 5,-10 10,-10 s10,4 10,10 v8 h10 c0,0 8,0 8,8"
          fill="none"
          stroke="url(#sheenGrad)"
          strokeWidth="4"
          opacity=".7"
        />
      </svg>
    </div>
  );
});

/* ======================== Share row ======================== */
function ShareRow({ className = '', url, text }: { className?: string; url: string; text: string }) {
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
      <div className="text-sm font-semibold mb-3">Share your win</div>
      <div className="flex flex-wrap gap-2">
        {canWebShare && <button className="btn-primary" onClick={onWebShare}>Share…</button>}
        <a className="btn" href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className="btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`} target="_blank" rel="noopener noreferrer">Facebook</a>
        <a className="btn" href={messengerDialog} target="_blank" rel="noopener noreferrer">Messenger</a>
        <a className="btn" href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer">X / Twitter</a>
        <a className="btn" href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noopener noreferrer">Telegram</a>
        <button className="btn" onClick={copyToClipboard}>Copy Link</button>
      </div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Tip: On mobile, the native Share menu appears when available.</p>
    </div>
  );
}

/* ======================== Styles ======================== */
const styles = `
.btn {
  @apply rounded-xl px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm;
}
.btn-primary {
  @apply rounded-xl px-3 py-2 border border-black bg-black text-white hover:bg-black/90 transition text-sm;
}
.wc-piece { --wc-c1: #34d399; --wc-c2: #06b6d4; perspective: 600px; will-change: transform; filter: drop-shadow(0 14px 30px rgba(16,185,129,.25)); }
.wc-fill-rect { animation: wc-clip-fill 900ms ease-out forwards; }
@keyframes wc-clip-fill { 0% { transform: translateY(0%); } 100% { transform: translateY(-100%); } }
@keyframes wc-spin { 0% { transform: rotateX(25deg) rotateY(-10deg) scale(.8); opacity: 0; } 30% { opacity: 1; } 100% { transform: rotateX(15deg) rotateY(0) scale(1); opacity: 1; } }
#piece-tab.wc-piece-pop { animation: wc-pop 800ms cubic-bezier(.2,.8,.2,1) 1; }
@keyframes wc-pop { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0); transform: scale(1); } 30% { box-shadow: 0 0 0 8px rgba(16,185,129,.15); transform: scale(1.06); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); transform: scale(1); } }
`;
