import pg from "pg";

if (typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(".env"); } catch { /* DATABASE_URL may already be provided by the environment. */ }
}

const testerEmail = "noa01mandorf@gmail.com";
const shouldApply = process.argv.includes("--apply");
const confirmedTeamIdsArgument = process.argv.find((argument) => argument.startsWith("--confirm-team-ids="));
const confirmedTeamIds = confirmedTeamIdsArgument
  ? confirmedTeamIdsArgument.slice("--confirm-team-ids=".length).split(",").map((id) => id.trim()).filter(Boolean)
  : [];
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for the tester schedule preflight.");
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const result = await client.query(
    'SELECT "id", "name", "ownerUid", "ownerEmail", "scheduleSetupCompleted" FROM "Team" WHERE LOWER("ownerEmail") = LOWER($1) ORDER BY "createdAt"',
    [testerEmail],
  );

  if (result.rows.length === 0) {
    throw new Error(`No teams matched ${testerEmail}. No data was changed.`);
  }

  if (result.rows.some((team) => team.ownerEmail?.toLowerCase() !== testerEmail)) {
    throw new Error("The tester lookup returned a team without the exact tester email. No data was changed.");
  }

  const ownerUids = [...new Set(result.rows.map((team) => team.ownerUid))];
  if (ownerUids.length !== 1) {
    throw new Error(`The tester lookup matched ${ownerUids.length} owner UIDs. No data was changed.`);
  }

  process.stdout.write(`${JSON.stringify({ testerEmail, ownerUid: ownerUids[0], teams: result.rows, mode: shouldApply ? "apply" : "preflight" }, null, 2)}\n`);

  if (!shouldApply) {
    process.stdout.write(`Preflight only. Re-run with --apply --confirm-team-ids=${result.rows.map((team) => team.id).join(",")} after confirming these exact team IDs.\n`);
  } else {
    const teamIds = result.rows.map((team) => team.id);
    const expected = [...teamIds].sort();
    const confirmed = [...new Set(confirmedTeamIds)].sort();
    if (JSON.stringify(expected) !== JSON.stringify(confirmed)) {
      throw new Error("--apply requires --confirm-team-ids with the exact IDs printed by the preflight. No data was changed.");
    }
    const update = await client.query(
      'UPDATE "Team" SET "scheduleSetupCompleted" = false WHERE "ownerUid" = $1 AND "id" = ANY($2::text[])',
      [ownerUids[0], teamIds],
    );
    if (update.rowCount !== teamIds.length) {
      throw new Error(`Expected to update ${teamIds.length} teams but updated ${update.rowCount}.`);
    }
    process.stdout.write(`Updated ${update.rowCount} tester team(s).\n`);
  }
} finally {
  await client.end();
}
