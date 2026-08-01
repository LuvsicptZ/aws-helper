import { createClient } from "@supabase/supabase-js";

const requiredEnvironment = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_RESET_TEST_EMAIL",
  "SUPABASE_RESET_TEST_PASSWORD",
];

if (process.env.ALLOW_DESTRUCTIVE_RESET_TEST !== "true") {
  throw new Error(
    "Refusing to reset data. Set ALLOW_DESTRUCTIVE_RESET_TEST=true for a dedicated test user.",
  );
}

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_RESET_TEST_EMAIL;
const password = process.env.SUPABASE_RESET_TEST_PASSWORD;
const verifierExamId = "practice-reset-concurrency-verifier";
const verifierQuestionId = 2_147_483_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseGeneration(value) {
  assert(
    typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0,
    `Invalid generation returned by Supabase: ${String(value)}`,
  );
  return value;
}

async function signIn(client) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  assert(data.user, "Dedicated reset test user did not authenticate");
  return data.user.id;
}

async function runReset(client) {
  const { data, error } = await client.rpc("reset_practice_progress");
  if (error) throw error;
  return parseGeneration(data);
}

async function readGeneration(client, userId) {
  const { data, error } = await client
    .from("practice_progress_state")
    .select("generation")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return parseGeneration(data.generation);
}

async function main() {
  const firstClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const secondClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const firstUserId = await signIn(firstClient);
  const secondUserId = await signIn(secondClient);
  assert(firstUserId === secondUserId, "Both clients must use the same test user");

  const startedAt = new Date().toISOString();
  const { error: examError } = await firstClient.from("exam_sessions").upsert(
    {
      user_id: firstUserId,
      id: verifierExamId,
      question_ids: [1],
      started_at: startedAt,
      submitted_at: startedAt,
      duration_seconds: 1,
      answers: {},
      score: 0,
    },
    { onConflict: "user_id,id" },
  );
  if (examError) throw examError;

  const [firstReset, secondReset] = await Promise.all([
    runReset(firstClient),
    runReset(secondClient),
  ]);
  assert(firstReset !== secondReset, "Concurrent resets reused a generation");
  const afterConcurrentResets = await readGeneration(firstClient, firstUserId);
  assert(
    afterConcurrentResets === Math.max(firstReset, secondReset),
    "Stored generation does not equal the latest concurrent reset",
  );

  for (let iteration = 0; iteration < 10; iteration += 1) {
    const staleGeneration = await readGeneration(firstClient, firstUserId);
    const staleWrite = secondClient.from("question_progress").upsert(
      {
        user_id: firstUserId,
        question_id: verifierQuestionId,
        attempts: 1,
        correct_attempts: 0,
        last_selected: ["A"],
        last_result: "incorrect",
        bookmarked: false,
        note: "reset concurrency verifier",
        updated_at: new Date().toISOString(),
        reset_generation: staleGeneration,
      },
      { onConflict: "user_id,question_id" },
    );

    const [, resetGeneration] = await Promise.all([
      staleWrite,
      runReset(firstClient),
    ]);
    const finalGeneration = await readGeneration(firstClient, firstUserId);
    assert(
      finalGeneration === resetGeneration,
      `Reset generation mismatch in iteration ${iteration}`,
    );

    const { data: staleRows, error: staleRowsError } = await firstClient
      .from("question_progress")
      .select("reset_generation")
      .eq("user_id", firstUserId)
      .eq("question_id", verifierQuestionId)
      .lt("reset_generation", finalGeneration);
    if (staleRowsError) throw staleRowsError;
    assert(
      staleRows.length === 0,
      `A stale progress row survived reset iteration ${iteration}`,
    );
  }

  const { data: preservedExam, error: preservedExamError } = await firstClient
    .from("exam_sessions")
    .select("id")
    .eq("user_id", firstUserId)
    .eq("id", verifierExamId)
    .single();
  if (preservedExamError) throw preservedExamError;
  assert(preservedExam.id === verifierExamId, "Practice reset deleted exam history");

  await Promise.all([firstClient.auth.signOut(), secondClient.auth.signOut()]);
  process.stdout.write("Practice reset concurrency verification passed.\n");
}

await main();
