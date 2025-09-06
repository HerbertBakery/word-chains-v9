export default function Page(){
  return (<div className="grid gap-8 md:grid-cols-2 items-center">
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Chain words. Stack multipliers.</h1>
      <p className="text-lg text-gray-600">Start with the last letter and include the first letter of the previous word. Build per‑category multipliers and watch them add into one massive total multiplier.</p>
      <div className="flex gap-3"><a href="/word-chains" className="btn btn-primary">Play now</a><a href="/leaderboard" className="btn btn-ghost">Leaderboard</a><a href="/stats" className="btn btn-ghost">Stats</a></div>
    </div>
    <div className="card">
      <ul className="list-disc pl-6 text-sm space-y-2">
        <li><b>Chains:</b> Names, Animals, Countries (Same-Letter is a bonus).</li>
        <li><b>LINKS:</b> Preserve multipliers when switching categories.</li>
        <li><b>Missions:</b> Progressive challenges that earn LINKS.</li>
      </ul>
    </div>
  </div>);
}
