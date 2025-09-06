# Word Chains v6 – Quick changes

- **Multi-category words**: If a word belongs to multiple categories (e.g., a name that’s also an animal), it now **builds all relevant category multipliers** on that turn. Switching logic treats categories you drop as a "switch": without a LINK they reset; with a LINK they freeze and keep their multipliers.
- **Mission panel**: shows **up to 6 missions** at a time. Replacements also keep the list capped at 6.

Run:
```bash
npm i
npm run dev
# http://localhost:3000/word-chains
```

Drop full datasets in `public/wordchains/*.json` (lowercase arrays). 


## v7 tweaks
- Missions now award **0.5 LINK** each (fractional LINKS accumulate). Clearing multiple at once caps at **+1.5 LINKS**.
- Switching categories spends **exactly 1 LINK** to freeze all categories you leave; otherwise those chains reset.
- LINKS display shows one decimal place.
