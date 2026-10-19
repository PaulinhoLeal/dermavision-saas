import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const host = "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...headers
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://" + host).pathname);
  } catch {
    send(response, 400, "Invalid URL");
    return;
  }

  if (pathname.includes("\\") || pathname.includes("\0")) {
    send(response, 400, "Invalid path");
    return;
  }
  if (pathname === "/") pathname = "/index.html";

  const target = resolve(root, "." + pathname);
  if (target !== root && !target.startsWith(root + sep)) {
    send(response, 403, "Forbidden");
    return;
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) {
      send(response, 404, "Not found");
      return;
    }
    const body = await readFile(target);
    const headers = { "Content-Type": types[extname(target).toLowerCase()] || "application/octet-stream" };
    response.writeHead(200, {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      ...headers
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error && error.code === "ENOENT") send(response, 404, "Not found");
    else {
      console.error("Erro ao servir arquivo estático:", error);
      send(response, 500, "Internal server error");
    }
  }
});

server.listen(port, host, () => {
  console.log("DermaVision disponível em http://" + host + ":" + port);
  console.log("Use apenas registros fictícios nesta demonstração local.");
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
