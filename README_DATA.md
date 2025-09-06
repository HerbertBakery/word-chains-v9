# Data: loading full lists

This project ships with small sample lists so you can test immediately.
Use these commands to load **full** datasets:

## Countries (automatic)
```bash
npm run build:data:countries
```
This fetches all country names from **REST Countries** and writes to `public/wordchains/countries.json`.

## Dictionary (automatic)
```bash
npm run build:data:dictionary
```
Downloads a large English word list (SCOWL mirror) and writes to `public/wordchains/dictionary.json`.
> Check the license at https://github.com/en-wl/wordlist before using in production.

## Names (semi-automatic)
1. Download the SSA "names" archive (yobYYYY.txt files) and extract into `data/ssa/`  
2. Then run:
```bash
npm run build:data:names
```
It will aggregate unique given names and write `public/wordchains/names.json`.

## Animals (semi-automatic)
Create `data/animals.txt` with one common animal name per line (singular). Then run:
```bash
npm run build:data:animals
```
This writes `public/wordchains/animals.json`. Plurals are accepted in-game.
