import * as db from "~/src/database_pool.ts";
import * as pretty_print from "saihex/pretty_logs";
import { abortController } from "~/singleton/abortController.ts";

interface queryRequest {
  query: string;
  values: (string | number)[];
}

function serializeRow(row: unknown): Record<string, unknown> {
  if (typeof row !== "object" || row === null) {
    // If row is not an object, just return it as-is wrapped in an object for consistency
    return { value: row };
  }

  const serialized: Record<string, unknown> = {};
  for (const key in row as Record<string, unknown>) {
    const val = (row as Record<string, unknown>)[key];
    if (val instanceof Uint8Array) {
      serialized[key] = btoa(String.fromCharCode(...val));
    } else if (typeof val == "bigint") {
      serialized[key] = val.toString();
    } else {
      serialized[key] = val;
    }
  }
  return serialized;
}

function serializeRows(rows: unknown[]): Record<string, unknown>[] {
  return rows.map(serializeRow);
}

async function serveHandler(
  req: Request,
  _connInfo: Deno.ServeHandlerInfo<Deno.NetAddr>,
): Promise<Response> {
  const _url = new URL(req.url);
  if (_url.pathname == "/health") {
    try {
      await db.queryObject("SELECT 1");
    } catch (e) {
      return new Response(`DATABASE ERROR: ${e}`, {
        status: 500,
      });
    }

    return new Response("I'm alright, honey!", {
      status: 200,
    });
  }

  let body: queryRequest;

  try {
    body = await req.json();
  } catch (e) {
    return new Response(`UNABLE TO READ REQUEST BODY: ${e}`, {
      status: 500,
    });
  }

  if (!body.query || typeof body.query !== "string") {
    return new Response(`INVALID QUERY STRING`, {
      status: 500,
    });
  }

  let response;

  try {
    response = await db.queryObject(body.query, body.values);
  } catch (e) {
    return new Response(`QUERY FAILED: ${e}`, {
      status: 500,
    });
  }

  const serializedRows = serializeRows(response.rows);

  const Json = JSON.stringify(serializedRows);

  return new Response(Json, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// Server

{
  // 48 hours → milliseconds
  const RESTART_INTERVAL = 48 * 60 * 60 * 1000; // more readable than 3.6e+6

  setTimeout(async () => {
    pretty_print.log("♻️ RESTARTING NOW: 48-hour auto-restart triggered");

    abortController.abort("48-HOUR RESTART");

    try {
      await db.connection_pool.end();
    } catch (_) {
      //
    }

    // Optional delay to let logs flush / services wind down
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Let Docker do the actual restart
    Deno.exit(1);
  }, RESTART_INTERVAL);
}

async function SeverCleanup() {
  pretty_print.log("Starting cleanup... 🧹😸");

  try {
    await db.connection_pool.end();
  } catch (_) {
    //
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
  pretty_print.log("Cleanup completed, exiting...");
  Deno.exit(0);
}

function setupGracefulShutdown() {
  const signals: Deno.Signal[] = ["SIGTERM", "SIGINT"];

  for (const sig of signals) {
    Deno.addSignalListener(sig, async () => {
      pretty_print.log(`Received ${sig}, starting graceful shutdown...`);
      abortController.abort("SERVER SHUTTING DOWN");
      await SeverCleanup();
    });
  }
}

setupGracefulShutdown();
Deno.serve(
  { port: 8080, hostname: "0.0.0.0", signal: abortController.signal },
  serveHandler,
);
