// Isolated PostgreSQL verification: cloned TEMP tables inside an outer Drizzle
// rollback transaction; nested repository transactions use savepoints.
import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import bcrypt from "bcryptjs";
import { pool } from "../server/db";
import { passwordRecoveryRepository, storedRecoveryToken } from "../server/passwordRecovery";

if (process.env.NODE_ENV !== "development") throw new Error("Explicit development mode required");
const client = await pool.connect();
const rollback = new Error("fictional rollback sentinel");
try {
  const database = drizzle(client);
  try {
    await database.transaction(async transaction => {
      for (const table of ["users", "sessions"]) {
        await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS) ON COMMIT DROP`);
      }
      await client.query(`
        INSERT INTO users(id,email,first_name,password) VALUES
          ('recovery-fictional-owner','owner@example.invalid','Fictional','fictional-old-hash'),
          ('recovery-fictional-other','other@example.invalid','Fictional','fictional-other-hash');
        INSERT INTO sessions(sid,sess,expire) VALUES
          ('recovery-fictional-session-a','{"userId":"recovery-fictional-owner"}',now()+interval '1 day'),
          ('recovery-fictional-session-b','{"userId":"recovery-fictional-other"}',now()+interval '1 day');
      `);
      const repo = passwordRecoveryRepository(transaction as unknown as typeof import("../server/db").db);
      const now = new Date(), token = "b".repeat(64), secondToken = "c".repeat(64);
      await repo.issue("recovery-fictional-owner", storedRecoveryToken(token), new Date(now.getTime() + 3_600_000));
      const found = await repo.findUser("owner@example.invalid");
      assert.equal(found?.id, "recovery-fictional-owner");
      assert.equal(await repo.consume(storedRecoveryToken(token).slice(7), "fictional-attacker-hash", now), false, "stored hash cannot be used as a reset link");
      assert.equal(await repo.consume("d".repeat(64), "fictional-attacker-hash", now), false);
      const passwordHash = await bcrypt.hash("Fictional-password-123", 10);
      assert.equal(await repo.consume(token, passwordHash, now), true);
      assert.equal(await repo.consume(token, "fictional-reused-hash", now), false);
      const changed = await repo.findUser("owner@example.invalid");
      assert.equal(await bcrypt.compare("Fictional-password-123", changed!.password!), true);
      const sessions = await client.query("SELECT sid FROM sessions ORDER BY sid");
      assert.deepEqual(sessions.rows.map(row => row.sid), ["recovery-fictional-session-b"]);
      await repo.issue("recovery-fictional-owner", storedRecoveryToken(secondToken), new Date(now.getTime() - 1));
      assert.equal(await repo.consume(secondToken, "fictional-expired-hash", now), false);
      // Older, unexpired plaintext tokens remain compatible during rollout.
      await repo.issue("recovery-fictional-owner", secondToken, new Date(now.getTime() + 3_600_000));
      assert.equal(await repo.consume(secondToken, passwordHash, now), true);
      await repo.issue("recovery-fictional-owner", storedRecoveryToken(token), new Date(now.getTime() + 3_600_000));
      await repo.issue("recovery-fictional-owner", storedRecoveryToken(secondToken), new Date(now.getTime() + 3_600_000));
      await repo.revoke("recovery-fictional-owner", storedRecoveryToken(token));
      assert.equal(await repo.consume(secondToken, passwordHash, now), true, "failed earlier delivery cannot revoke a newer link");
      const retryToken = "e".repeat(64);
      await repo.issue("recovery-fictional-owner", storedRecoveryToken(retryToken), new Date(now.getTime() + 3_600_000));
      await client.query("ALTER TABLE pg_temp.sessions RENAME COLUMN sess TO fixture_broken_sess");
      await assert.rejects(repo.consume(retryToken, "fictional-failed-hash", now));
      assert.equal((await repo.findUser("owner@example.invalid"))?.password, passwordHash, "session-revocation failure rolls back the password change");
      await client.query("ALTER TABLE pg_temp.sessions RENAME COLUMN fixture_broken_sess TO sess");
      assert.equal(await repo.consume(retryToken, passwordHash, now), true, "failed transaction preserves the token for retry");
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("PASS password recovery PostgreSQL: hashed tokens, no hash-as-link bypass, invalid/expired/reused links rejected, real bcrypt comparison, session revocation scoped to owner, legacy links compatible, conditional failed-delivery cleanup. TEMP fixtures rolled back; zero real emails/accounts changed.");
} finally {
  client.release();
  await pool.end();
}
