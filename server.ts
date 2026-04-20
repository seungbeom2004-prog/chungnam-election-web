/**
 * Custom Node.js HTTP server for self-hosted / VPS deployments.
 *
 * On Vercel, this file is NOT used — Vercel's edge network handles TCP
 * connections and mitigates Slowloris at the infrastructure level.
 *
 * When running `npx tsx server.ts` (or compiled `node server.js`) on a VPS /
 * bare-metal server, the following timeouts close slow / stalled connections
 * before they can exhaust the connection pool:
 *
 *   headersTimeout  — max ms to receive complete HTTP request headers.
 *                     Slowloris sends headers byte-by-byte; this closes
 *                     the connection if headers aren't complete in time.
 *
 *   requestTimeout  — max ms between connection open and response end.
 *                     Catches slow-body POST attacks and hung responses.
 *
 *   keepAliveTimeout — ms an idle keep-alive connection stays open.
 *                     Keeping this low drains idle connection slots fast.
 *
 *   maxConnections  — hard cap on simultaneous TCP connections.
 *                     New connections are refused beyond this limit.
 *
 * Usage:
 *   npx tsx server.ts          (development)
 *   npx tsc && node server.js  (production build)
 *
 * Or add to package.json scripts:
 *   "start:custom": "tsx server.ts"
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const app    = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url ?? "/", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Request handler error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // ── Slowloris mitigation ──────────────────────────────────────────────────

  /**
   * headersTimeout (Node.js ≥ 14.11)
   * If a client hasn't sent all HTTP request headers within this window,
   * the server responds with 408 Request Timeout and closes the connection.
   * Slowloris keeps connections alive by sending headers very slowly —
   * this cuts them off at 10 seconds.
   */
  server.headersTimeout = 10_000; // 10 s

  /**
   * requestTimeout (Node.js ≥ 18)
   * Total time allowed from connection open to response completion.
   * Prevents slow-body attacks where headers are sent quickly but the
   * request body trickles in.  After this timeout the socket is destroyed.
   */
  server.requestTimeout = 30_000; // 30 s

  /**
   * keepAliveTimeout
   * How long an idle keep-alive connection is held open waiting for the
   * next request.  A lower value means stale connections are recycled faster,
   * reducing the window an attacker can monopolise a slot.
   * NOTE: must be greater than the upstream load-balancer's keep-alive value
   * to avoid premature 502 errors.  5 s is safe for most setups.
   */
  server.keepAliveTimeout = 5_000; // 5 s

  /**
   * maxConnections
   * Hard cap on simultaneous open TCP connections.
   * New connection attempts beyond this limit are refused immediately,
   * protecting the event loop from being flooded.
   */
  server.maxConnections = 500;

  // ── Startup ───────────────────────────────────────────────────────────────
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port} [${dev ? "dev" : "prod"}]`);
    console.log(`> Slowloris protection: headersTimeout=${server.headersTimeout}ms, ` +
      `requestTimeout=${server.requestTimeout}ms, ` +
      `keepAliveTimeout=${server.keepAliveTimeout}ms, ` +
      `maxConnections=${server.maxConnections}`);
  });

  // Graceful shutdown on SIGTERM (e.g. from systemd / Docker)
  process.on("SIGTERM", () => {
    console.log("SIGTERM received — closing server gracefully");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});
