import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const serverPath = fileURLToPath(new URL("../serve.mjs", import.meta.url));
let serverProcess;
let baseUrl;

async function reservePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return address.port;
}

before(async () => {
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore"
  });

  for (let attempt = 0; attempt < 40; attempt++) {
    if (serverProcess.exitCode !== null) throw new Error(`Servidor encerrou antes de iniciar (código ${serverProcess.exitCode}).`);
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {
      await delay(50);
    }
  }
  throw new Error("Servidor de teste não ficou disponível em 2 segundos.");
});

after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  const exited = once(serverProcess, "exit");
  serverProcess.kill("SIGTERM");
  await Promise.race([exited, delay(2000)]);
});

test("serve a página inicial e aplica cabeçalhos de segurança", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(await response.text(), /DermaVision/);
});

test("serve arquivos estáticos com tipo correto", async () => {
  const response = await fetch(`${baseUrl}/app.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/javascript/);
  assert.match(await response.text(), /handlePhotoUpload/);
});

test("HEAD retorna cabeçalhos sem corpo", async () => {
  const response = await fetch(baseUrl, { method: "HEAD" });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
});

test("recusa métodos HTTP não suportados", async () => {
  const response = await fetch(baseUrl, { method: "POST", body: "test" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});

test("bloqueia traversal e separadores codificados inválidos", async () => {
  const traversal = await fetch(`${baseUrl}/..%2f..%2f..%2fpackage.json`);
  assert.equal(traversal.status, 403);
  const backslash = await fetch(`${baseUrl}/%5c..%5cpackage.json`);
  assert.equal(backslash.status, 400);
});

test("retorna 404 para recursos inexistentes", async () => {
  const response = await fetch(`${baseUrl}/arquivo-que-nao-existe`);
  assert.equal(response.status, 404);
});
