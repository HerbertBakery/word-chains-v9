CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS wordchains_scores (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, score INT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now());
CREATE INDEX IF NOT EXISTS wordchains_scores_score_idx ON wordchains_scores(score DESC);
