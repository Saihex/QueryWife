import * as postgres from "@db/postgres";
import { logError, logWarning } from "saihex/pretty_logs";

const hostname = Deno.env.get("POSTGRES_HOSTNAME") ?? "localhost";
const port = Deno.env.get("POSTGRES_PORT") ?? "5432";
const database_name = Deno.env.get("POSTGRES_DATABASE") ??
  "saihex_public_website";
const database_user = Deno.env.get("POSTGRES_USER");
const database_pass = Deno.env.get("POSTGRES_PASSWORD");
const applicationName = Deno.env.get("POSTGRES_APPNAME") ?? "QueryWife";
const pool_size = parseInt(Deno.env.get("POOL_SIZE") ?? "10") ?? 10;

const clientOptions: postgres.ClientOptions = {
  database: database_name,
  password: database_pass,
  user: database_user,
  hostname: hostname,
  port: port,
  applicationName: applicationName,
  host_type: "tcp",
};

let pool: postgres.Pool;

if (!Deno.args.includes("-container-setup")) {
  if (!database_user || !database_user) {
    logError("MISSING DATABASE USER OR PASSWORD");
    Deno.exit(1);
  }

  pool = new postgres.Pool(clientOptions, 10, true);
} else {
  pool = new postgres.Pool(
    `postgres://dummy:dummy@127.0.0.254:5432/saihex_public_website`,
    1,
    true,
  );
}

/**
 * A wrapper around the standard `queryObject`, using `using` so that manual client release is not needed.
 *
 * If the connection fails (e.g., database is offline), the pool may become exhausted and unable to release clients.
 *
 * To prevent a soft-lock, this function includes a fail-safe that attempts to destroy and recreate the connection pool
 * if a connection error occurs.
 */
const queryObject = async function (
  query: string,
  args?: postgres.QueryArguments,
) {
  let client;

  try {
    client = await pool.connect();
  } catch (_) {
    logWarning(`Database errored > Creating new pool...`);

    try {
      await pool.end();
    } catch (_) {
      /** */
    }

    pool = new postgres.Pool(clientOptions, pool_size, true);

    throw "Database Query Error";
  }

  using _ = client;

  return await client.queryObject(query, args);
};

// Export a *readonly alias* for external usage
const connection_pool = pool as Readonly<typeof pool>;

// ✅ Named exports — backward compatible
export { connection_pool, queryObject };
