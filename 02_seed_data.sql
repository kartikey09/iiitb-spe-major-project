-- =============================================================
-- PET / OJ — Seed Data
-- Run after 01_schema.sql
--
-- All 10 users share the password "password123" (bcrypt cost 10).
-- The hash below is real and will verify against bcrypt libraries
-- in Go (golang.org/x/crypto/bcrypt), Node (bcrypt), Python (bcrypt), etc.
--
-- UUIDs are hardcoded so foreign keys stay consistent across reruns
-- and so you can reference specific rows from your application code
-- during testing.
-- =============================================================

-- -------------------------------------------------------------
-- USERS
--   Login with username + password "password123"
-- -------------------------------------------------------------
INSERT INTO users (id, email, username, password_hash, display_name, role) VALUES
    -- admins
    ('11111111-1111-1111-1111-000000000001',
     'admin@petcollege.edu',       'admin1',   '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Site Admin',                 'admin'),
    ('11111111-1111-1111-1111-000000000002',
     'prof.smith@petcollege.edu',  'prof_smith','$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Prof. Smith',                'admin'),

    -- students
    ('22222222-2222-2222-2222-000000000001',
     'aarav.k@petcollege.edu',     'aarav',    '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Aarav Kumar',                'student'),
    ('22222222-2222-2222-2222-000000000002',
     'priya.s@petcollege.edu',     'priya',    '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Priya Sharma',               'student'),
    ('22222222-2222-2222-2222-000000000003',
     'rohan.m@petcollege.edu',     'rohan',    '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Rohan Mehta',                'student'),
    ('22222222-2222-2222-2222-000000000004',
     'isha.p@petcollege.edu',      'isha',     '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Isha Patel',                 'student'),
    ('22222222-2222-2222-2222-000000000005',
     'vihaan.r@petcollege.edu',    'vihaan',   '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Vihaan Reddy',               'student'),
    ('22222222-2222-2222-2222-000000000006',
     'ananya.g@petcollege.edu',    'ananya',   '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Ananya Gupta',               'student'),
    ('22222222-2222-2222-2222-000000000007',
     'kabir.n@petcollege.edu',     'kabir',    '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Kabir Nair',                 'student'),
    ('22222222-2222-2222-2222-000000000008',
     'meera.j@petcollege.edu',     'meera',    '$2b$12$ALrSGgnxueamJ3bYhr6Rb.31bcwpbsWnslDgkzhBT2Vu0tIr6ECUC',
     'Meera Joshi',                'student');


-- -------------------------------------------------------------
-- CONTEST
--   One live contest. Adjust starts_at/ends_at if you want it
--   to be live "now" for your local clock.
-- -------------------------------------------------------------
INSERT INTO contests (id, title, description, starts_at, ends_at, created_by) VALUES
    ('33333333-3333-3333-3333-000000000001',
     'PET Coding Contest 2026 — Mock 1',
     'Six warm-up problems. Two-hour window. Solve in any of C++17, Python 3, Java 17.',
     now() - interval '10 minutes',
     now() + interval '2 hours',
     '11111111-1111-1111-1111-000000000002');


-- -------------------------------------------------------------
-- CONTEST REGISTRATIONS
--   All 8 students registered. Admins typically aren't.
-- -------------------------------------------------------------
INSERT INTO contest_users (contest_id, user_id) VALUES
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000001'),
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000002'),
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000003'),
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000004'),
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000005'),
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000006'),
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000007'),
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000008');


-- =============================================================
-- PROBLEMS (6 total)
-- =============================================================

-- -------------------------------------------------------------
-- Problem 1: Sum of Two Numbers
-- -------------------------------------------------------------
INSERT INTO problems (id, contest_id, slug, title, statement_md, input_format, output_format, constraints_md, points, order_idx) VALUES
    ('44444444-4444-4444-4444-000000000001',
     '33333333-3333-3333-3333-000000000001',
     'add-two-numbers',
     'A. Sum of Two Numbers',
     'Read two integers **a** and **b** from standard input on a single line, separated by a space. Print their sum.',
     'A single line with two space-separated integers a and b.',
     'A single integer: a + b.',
     '-10^9 <= a, b <= 10^9',
     100, 1);

-- TC 1 (sample, visible)
INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000001', 1, TRUE,  '3 5',                '8');

-- Hidden TCs
INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000001', 2, FALSE, '100 200',            '300'),
    ('44444444-4444-4444-4444-000000000001', 3, FALSE, '-5 5',               '0'),
    ('44444444-4444-4444-4444-000000000001', 4, FALSE, '0 0',                '0'),
    ('44444444-4444-4444-4444-000000000001', 5, FALSE, '1000000000 1000000000', '2000000000'),
    ('44444444-4444-4444-4444-000000000001', 6, FALSE, '-1000000000 -1000000000', '-2000000000');


-- -------------------------------------------------------------
-- Problem 2: Even or Odd
-- -------------------------------------------------------------
INSERT INTO problems (id, contest_id, slug, title, statement_md, input_format, output_format, constraints_md, points, order_idx) VALUES
    ('44444444-4444-4444-4444-000000000002',
     '33333333-3333-3333-3333-000000000001',
     'even-or-odd',
     'B. Even or Odd',
     'Read an integer **n**. Print `Even` if it is even, `Odd` if it is odd. Note that 0 is even.',
     'A single integer n.',
     'A single line containing either "Even" or "Odd".',
     '-10^9 <= n <= 10^9',
     100, 2);

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000002', 1, TRUE,  '4',     'Even');

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000002', 2, FALSE, '7',     'Odd'),
    ('44444444-4444-4444-4444-000000000002', 3, FALSE, '0',     'Even'),
    ('44444444-4444-4444-4444-000000000002', 4, FALSE, '-3',    'Odd'),
    ('44444444-4444-4444-4444-000000000002', 5, FALSE, '-100',  'Even'),
    ('44444444-4444-4444-4444-000000000002', 6, FALSE, '999999999', 'Odd');


-- -------------------------------------------------------------
-- Problem 3: Maximum of Three
-- -------------------------------------------------------------
INSERT INTO problems (id, contest_id, slug, title, statement_md, input_format, output_format, constraints_md, points, order_idx) VALUES
    ('44444444-4444-4444-4444-000000000003',
     '33333333-3333-3333-3333-000000000001',
     'max-of-three',
     'C. Maximum of Three',
     'Read three integers on a single line separated by spaces. Print the largest of the three.',
     'Three space-separated integers a, b, c.',
     'A single integer — the maximum of a, b, c.',
     '-10^9 <= a, b, c <= 10^9',
     100, 3);

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000003', 1, TRUE,  '1 2 3',         '3');

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000003', 2, FALSE, '5 5 5',         '5'),
    ('44444444-4444-4444-4444-000000000003', 3, FALSE, '-1 -2 -3',      '-1'),
    ('44444444-4444-4444-4444-000000000003', 4, FALSE, '10 100 50',     '100'),
    ('44444444-4444-4444-4444-000000000003', 5, FALSE, '0 0 1',         '1'),
    ('44444444-4444-4444-4444-000000000003', 6, FALSE, '-1000000000 0 1000000000', '1000000000');


-- -------------------------------------------------------------
-- Problem 4: FizzBuzz (single number)
-- -------------------------------------------------------------
INSERT INTO problems (id, contest_id, slug, title, statement_md, input_format, output_format, constraints_md, points, order_idx) VALUES
    ('44444444-4444-4444-4444-000000000004',
     '33333333-3333-3333-3333-000000000001',
     'fizzbuzz-single',
     'D. FizzBuzz',
     'Read a positive integer **n**. If it is divisible by 15, print `FizzBuzz`. Otherwise, if divisible by 3, print `Fizz`. Otherwise, if divisible by 5, print `Buzz`. Otherwise, print the number itself.',
     'A single positive integer n.',
     'One line: "FizzBuzz", "Fizz", "Buzz", or the integer.',
     '1 <= n <= 10^6',
     150, 4);

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000004', 1, TRUE,  '15',  'FizzBuzz');

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000004', 2, FALSE, '3',   'Fizz'),
    ('44444444-4444-4444-4444-000000000004', 3, FALSE, '5',   'Buzz'),
    ('44444444-4444-4444-4444-000000000004', 4, FALSE, '7',   '7'),
    ('44444444-4444-4444-4444-000000000004', 5, FALSE, '30',  'FizzBuzz'),
    ('44444444-4444-4444-4444-000000000004', 6, FALSE, '1',   '1'),
    ('44444444-4444-4444-4444-000000000004', 7, FALSE, '999999', 'Fizz');


-- -------------------------------------------------------------
-- Problem 5: Reverse a String
-- -------------------------------------------------------------
INSERT INTO problems (id, contest_id, slug, title, statement_md, input_format, output_format, constraints_md, points, order_idx) VALUES
    ('44444444-4444-4444-4444-000000000005',
     '33333333-3333-3333-3333-000000000001',
     'reverse-string',
     'E. Reverse a String',
     'Read a single line containing a non-empty string (letters and digits only, no spaces). Print the string reversed.',
     'A single string s.',
     'The reversed string on one line.',
     '1 <= |s| <= 1000; s contains only A-Z, a-z, 0-9.',
     150, 5);

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000005', 1, TRUE,  'hello',         'olleh');

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000005', 2, FALSE, 'a',             'a'),
    ('44444444-4444-4444-4444-000000000005', 3, FALSE, 'Programming',   'gnimmargorP'),
    ('44444444-4444-4444-4444-000000000005', 4, FALSE, '12345',         '54321'),
    ('44444444-4444-4444-4444-000000000005', 5, FALSE, 'AbCdEf',        'fEdCbA'),
    ('44444444-4444-4444-4444-000000000005', 6, FALSE, 'racecar',       'racecar');


-- -------------------------------------------------------------
-- Problem 6: Factorial
-- -------------------------------------------------------------
INSERT INTO problems (id, contest_id, slug, title, statement_md, input_format, output_format, constraints_md, time_limit_ms, points, order_idx) VALUES
    ('44444444-4444-4444-4444-000000000006',
     '33333333-3333-3333-3333-000000000001',
     'factorial',
     'F. Factorial',
     'Read an integer **n** and print **n!** (n factorial). Note that 0! = 1.',
     'A single integer n.',
     'A single integer: n!',
     '0 <= n <= 20 (result fits in 64-bit signed integer)',
     2000, 200, 6);

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000006', 1, TRUE,  '5',    '120');

INSERT INTO test_cases (problem_id, idx, is_sample, input_data, expected_output) VALUES
    ('44444444-4444-4444-4444-000000000006', 2, FALSE, '0',    '1'),
    ('44444444-4444-4444-4444-000000000006', 3, FALSE, '1',    '1'),
    ('44444444-4444-4444-4444-000000000006', 4, FALSE, '10',   '3628800'),
    ('44444444-4444-4444-4444-000000000006', 5, FALSE, '15',   '1307674368000'),
    ('44444444-4444-4444-4444-000000000006', 6, FALSE, '20',   '2432902008176640000');


-- =============================================================
-- SUBMISSIONS (sample — demonstrate the leaderboard shape)
-- =============================================================
-- A mix of verdicts so the UI has something to render. Real
-- submissions will be inserted by Contest-API once Judge0 is wired up.

INSERT INTO submissions (id, user_id, problem_id, contest_id, language, source_code, status, score, judge0_token, submitted_at, judged_at, verdict_meta) VALUES
    -- Aarav: solved P1 cleanly in Python
    ('55555555-5555-5555-5555-000000000001',
     '22222222-2222-2222-2222-000000000001',
     '44444444-4444-4444-4444-000000000001',
     '33333333-3333-3333-3333-000000000001',
     'python3',
     'a, b = map(int, input().split())' || E'\n' || 'print(a + b)',
     'accepted', 100,
     'tok-aarav-p1-001',
     now() - interval '8 minutes',
     now() - interval '8 minutes' + interval '1 second',
     '{"time_ms": 42, "memory_kb": 8400, "test_cases": [{"idx":1,"status":"AC"},{"idx":2,"status":"AC"},{"idx":3,"status":"AC"},{"idx":4,"status":"AC"},{"idx":5,"status":"AC"},{"idx":6,"status":"AC"}]}'::jsonb),

    -- Aarav: solved P2
    ('55555555-5555-5555-5555-000000000002',
     '22222222-2222-2222-2222-000000000001',
     '44444444-4444-4444-4444-000000000002',
     '33333333-3333-3333-3333-000000000001',
     'python3',
     'n = int(input())' || E'\n' || 'print("Even" if n % 2 == 0 else "Odd")',
     'accepted', 100,
     'tok-aarav-p2-001',
     now() - interval '6 minutes',
     now() - interval '6 minutes' + interval '1 second',
     '{"time_ms": 38, "memory_kb": 8200}'::jsonb),

    -- Priya: solved P1 in C++
    ('55555555-5555-5555-5555-000000000003',
     '22222222-2222-2222-2222-000000000002',
     '44444444-4444-4444-4444-000000000001',
     '33333333-3333-3333-3333-000000000001',
     'cpp17',
     '#include <iostream>' || E'\n' || 'int main(){long long a,b;std::cin>>a>>b;std::cout<<a+b;return 0;}',
     'accepted', 100,
     'tok-priya-p1-001',
     now() - interval '7 minutes',
     now() - interval '7 minutes' + interval '500 milliseconds',
     '{"time_ms": 4, "memory_kb": 3600}'::jsonb),

    -- Rohan: WA on P3 (typo — used min instead of max)
    ('55555555-5555-5555-5555-000000000004',
     '22222222-2222-2222-2222-000000000003',
     '44444444-4444-4444-4444-000000000003',
     '33333333-3333-3333-3333-000000000001',
     'python3',
     'a,b,c = map(int, input().split())' || E'\n' || 'print(min(a,b,c))',
     'wrong_answer', 0,
     'tok-rohan-p3-001',
     now() - interval '5 minutes',
     now() - interval '5 minutes' + interval '1 second',
     '{"time_ms": 40, "memory_kb": 8300, "failed_tc": 1}'::jsonb),

    -- Rohan: retried P3, accepted
    ('55555555-5555-5555-5555-000000000005',
     '22222222-2222-2222-2222-000000000003',
     '44444444-4444-4444-4444-000000000003',
     '33333333-3333-3333-3333-000000000001',
     'python3',
     'a,b,c = map(int, input().split())' || E'\n' || 'print(max(a,b,c))',
     'accepted', 100,
     'tok-rohan-p3-002',
     now() - interval '4 minutes',
     now() - interval '4 minutes' + interval '1 second',
     '{"time_ms": 41, "memory_kb": 8300}'::jsonb),

    -- Isha: TLE on factorial (used naïve recursion without memoization, hit time limit on N=20 in slow Python)
    ('55555555-5555-5555-5555-000000000006',
     '22222222-2222-2222-2222-000000000004',
     '44444444-4444-4444-4444-000000000006',
     '33333333-3333-3333-3333-000000000001',
     'python3',
     'import sys' || E'\n' || 'sys.setrecursionlimit(100000)' || E'\n' || 'def f(n):' || E'\n' || '    import time; time.sleep(10)' || E'\n' || '    return 1 if n<=1 else n*f(n-1)' || E'\n' || 'print(f(int(input())))',
     'tle', 0,
     'tok-isha-p6-001',
     now() - interval '3 minutes',
     now() - interval '3 minutes' + interval '2 seconds',
     '{"time_ms": 2000, "memory_kb": 9000, "failed_tc": 2}'::jsonb),

    -- Vihaan: CE on P1 in Java (missing semicolon)
    ('55555555-5555-5555-5555-000000000007',
     '22222222-2222-2222-2222-000000000005',
     '44444444-4444-4444-4444-000000000001',
     '33333333-3333-3333-3333-000000000001',
     'java17',
     'public class Main { public static void main(String[] a) { System.out.println("hi") } }',
     'ce', 0,
     'tok-vihaan-p1-001',
     now() - interval '2 minutes',
     now() - interval '2 minutes' + interval '3 seconds',
     '{"compile_error": "Main.java:1: error: '';'' expected"}'::jsonb),

    -- Ananya: queued (Judge0 hasn''t called back yet)
    ('55555555-5555-5555-5555-000000000008',
     '22222222-2222-2222-2222-000000000006',
     '44444444-4444-4444-4444-000000000005',
     '33333333-3333-3333-3333-000000000001',
     'python3',
     's = input()' || E'\n' || 'print(s[::-1])',
     'queued', 0,
     'tok-ananya-p5-001',
     now() - interval '10 seconds',
     NULL,
     NULL);


-- =============================================================
-- Sanity queries you can run after loading
-- =============================================================
-- Check counts:
--   SELECT
--     (SELECT COUNT(*) FROM users)          AS users,
--     (SELECT COUNT(*) FROM contests)       AS contests,
--     (SELECT COUNT(*) FROM problems)       AS problems,
--     (SELECT COUNT(*) FROM test_cases)     AS test_cases,
--     (SELECT COUNT(*) FROM submissions)    AS submissions;
--
-- Expected: 10, 1, 6, 37, 8
--
-- Leaderboard preview (won''t match the Redis ZSET exactly, but
-- gives you the same shape from raw Postgres):
--   SELECT u.username, SUM(s.score) AS total
--   FROM submissions s
--   JOIN users u ON u.id = s.user_id
--   WHERE s.status = 'accepted'
--   GROUP BY u.username
--   ORDER BY total DESC;
--
-- Visible vs hidden TC breakdown:
--   SELECT p.slug,
--          COUNT(*) FILTER (WHERE tc.is_sample) AS visible,
--          COUNT(*) FILTER (WHERE NOT tc.is_sample) AS hidden
--   FROM problems p JOIN test_cases tc ON tc.problem_id = p.id
--   GROUP BY p.slug ORDER BY p.slug;
-- =============================================================
