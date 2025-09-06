"use client";
import React, { useEffect, useState } from "react";

type Stats = {
  totalWords: number;
  animals: number;
  countries: number;
  names: number;
  sameLetterWords: number;
  longestAnimalStreak: number;
  longestCountryStreak: number;
  longestNameStreak: number;
  highestWordScore: number;
  switches: number;
  linksEarned: number;
  linksSpent: number;
  powerups: Record<string, number>;
};

export default function StatsPage(){
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(()=>{
    const raw = localStorage.getItem("wc_stats");
    if (raw) setStats(JSON.parse(raw));
  },[]);
  if(!stats) return <div className="card">No stats yet. Play a game first!</div>;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h1 className="text-2xl font-bold mb-2">Overall</h1>
        <ul className="space-y-1 text-sm">
          <li>Total valid words: <b>{stats.totalWords}</b></li>
          <li>Animals: <b>{stats.animals}</b> • Countries: <b>{stats.countries}</b> • Names: <b>{stats.names}</b></li>
          <li>Same-letter words: <b>{stats.sameLetterWords}</b></li>
          <li>Switches (category changes): <b>{stats.switches}</b></li>
          <li>Links earned: <b>{stats.linksEarned}</b> • Links spent: <b>{stats.linksSpent}</b></li>
        </ul>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Records</h2>
        <ul className="space-y-1 text-sm">
          <li>Longest Animal streak: <b>{stats.longestAnimalStreak}</b></li>
          <li>Longest Country streak: <b>{stats.longestCountryStreak}</b></li>
          <li>Longest Name streak: <b>{stats.longestNameStreak}</b></li>
          <li>Highest single-word score: <b>{stats.highestWordScore}</b></li>
        </ul>
      </div>
      <div className="card md:col-span-2">
        <h2 className="text-xl font-semibold mb-2">Power-ups Used</h2>
        <ul className="space-y-1 text-sm">
          {Object.entries(stats.powerups || {}).map(([k,v]) => (<li key={k}>{k}: <b>{v}</b></li>))}
        </ul>
      </div>
    </div>
  );
}
