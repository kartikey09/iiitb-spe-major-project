-- =============================================================
-- PET / OJ — Schema (Postgres 16+)
-- Run order: 01_schema.sql first, then 02_seed_data.sql
-- =============================================================
--
-- Differences from the design-doc schema, for local dev:
--   1. `users.password_hash` added so you can log in without
--      Microsoft OAuth while developing. `ms_oid` is now nullable.
--      In prod, you'll auth via MS and `password_hash` stays NULL.
--   2. `test_cases.input_data` and `test_cases.expected_output`
--      added so test cases can live inline for small inputs.
--      `input_path` / `output_path` stay nullable for large blobs
--      that belong on disk / MinIO.
--   3. `submissions.judge0_token` added for the Judge0 callback
--      flow (from the revised design).
-- =============================================================

-- For gen_random_uuid() — built into PG 13+, but extension is harmless
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Clean slate (dev only — don't run this against prod)
DROP TABLE IF EXISTS submissions    CASCADE;
DROP TABLE IF EXISTS test_cases     CASCADE;
DROP TABLE IF EXISTS problems       CASCADE;
DROP TABLE IF EXISTS contest_users  CASCADE;
DROP TABLE IF EXISTS contests       CASCADE;
DROP TABLE IF EXISTS users          CASCADE;

-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ms_oid          TEXT UNIQUE,                            -- nullable for dev
    email           TEXT UNIQUE NOT NULL,
    username        TEXT UNIQUE NOT NULL,                   -- login id for dev mode
    password_hash   TEXT,                                   -- bcrypt; null when ms_oid set
    display_name    TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'admin')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- exactly one auth method must be present
    CONSTRAINT users_auth_method_chk
        CHECK (ms_oid IS NOT NULL OR password_hash IS NOT NULL)
);

-- -------------------------------------------------------------
-- contests
-- -------------------------------------------------------------
CREATE TABLE contests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT,
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ NOT NULL,
    created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT contests_time_chk CHECK (ends_at > starts_at)
);

-- -------------------------------------------------------------
-- contest_users (many-to-many: who's registered for which contest)
-- -------------------------------------------------------------
CREATE TABLE contest_users (
    contest_id      UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (contest_id, user_id)
);

-- -------------------------------------------------------------
-- problems
-- -------------------------------------------------------------
CREATE TABLE problems (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id      UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    slug            TEXT NOT NULL,
    title           TEXT NOT NULL,
    statement_md    TEXT NOT NULL,
    input_format    TEXT,
    output_format   TEXT,
    constraints_md  TEXT,
    time_limit_ms   INT  NOT NULL DEFAULT 2000,
    memory_limit_mb INT  NOT NULL DEFAULT 256,
    points          INT  NOT NULL DEFAULT 100,
    checker         TEXT NOT NULL DEFAULT 'exact'
                    CHECK (checker IN ('exact', 'token', 'float_eps')),
    order_idx       INT  NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (contest_id, slug),
    UNIQUE (contest_id, order_idx)
);

-- -------------------------------------------------------------
-- test_cases
-- -------------------------------------------------------------
CREATE TABLE test_cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    idx             INT  NOT NULL,
    is_sample       BOOLEAN NOT NULL DEFAULT FALSE,         -- shown to user?
    input_data      TEXT,                                   -- inline for small inputs
    expected_output TEXT,                                   -- inline expected stdout
    input_path      TEXT,                                   -- when blobs live on disk
    output_path     TEXT,
    weight          INT  NOT NULL DEFAULT 1,                -- for partial scoring
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (problem_id, idx),
    -- must have data either inline or on disk, not neither
    CONSTRAINT test_cases_data_chk
        CHECK (
            (input_data IS NOT NULL AND expected_output IS NOT NULL)
            OR
            (input_path IS NOT NULL AND output_path IS NOT NULL)
        )
);

-- -------------------------------------------------------------
-- submissions
-- -------------------------------------------------------------
CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    problem_id      UUID NOT NULL REFERENCES problems(id),
    contest_id      UUID NOT NULL REFERENCES contests(id),
    language        TEXT NOT NULL
                    CHECK (language IN ('cpp17', 'python3', 'java17')),
    source_code     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN (
                        'queued', 'judging', 'accepted', 'wrong_answer',
                        'tle', 'mle', 're', 'ce', 'internal_error'
                    )),
    judge0_token    TEXT,                                   -- Judge0 submission token
    verdict_meta    JSONB,                                  -- per-tc results, full Judge0 response
    score           INT NOT NULL DEFAULT 0,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    judged_at       TIMESTAMPTZ
);

-- -------------------------------------------------------------
-- Indexes that matter (from the design doc)
-- -------------------------------------------------------------
CREATE INDEX idx_submissions_user_problem      ON submissions (user_id, problem_id, submitted_at DESC);
CREATE INDEX idx_submissions_contest_status    ON submissions (contest_id, status);
CREATE INDEX idx_submissions_problem_score     ON submissions (problem_id, score DESC, submitted_at ASC);
CREATE INDEX idx_submissions_judge0_token      ON submissions (judge0_token);
CREATE INDEX idx_test_cases_problem            ON test_cases (problem_id, idx);

-- =============================================================
-- Done. Run 02_seed_data.sql next.
-- =============================================================
