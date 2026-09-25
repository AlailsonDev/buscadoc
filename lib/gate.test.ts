import test from "node:test";
import assert from "node:assert/strict";
import { ACCESS_SECONDS, cleanToken, readCookie, signCookie, tokenMatches, verifyCookie } from "./gate.ts";

test("cleanToken remove espaços e aspas coladas", () => {
  assert.equal(cleanToken('  "abc123" '), "abc123");
  assert.equal(cleanToken(undefined), "");
});
test("tokenMatches: só o token certo, e nunca vazio", () => {
  assert.equal(tokenMatches("segredo", ["segredo"]), true);
  assert.equal(tokenMatches(' "segredo" ', ["segredo"]), true);
  assert.equal(tokenMatches("errado", ["segredo"]), false);
  assert.equal(tokenMatches("", [""]), false);
  assert.equal(tokenMatches("segredo", []), false);
  assert.equal(tokenMatches("segredo", ["a", "segredo"]), true);
});
test("cookie assinado é aceito e não contém o token", () => {
  const c = signCookie("segredo");
  assert.equal(verifyCookie(c, ["segredo"]), true);
  assert.equal(c.includes("segredo"), false);
});
test("cookie expira após 8 horas", () => {
  const t0 = 1_000_000_000_000;
  const c = signCookie("segredo", t0);
  assert.equal(verifyCookie(c, ["segredo"], t0 + ACCESS_SECONDS * 1000 - 1), true);
  assert.equal(verifyCookie(c, ["segredo"], t0 + ACCESS_SECONDS * 1000 + 1), false);
});
test("cookie é recusado se o token mudou, foi adulterado ou é lixo", () => {
  const c = signCookie("segredo");
  assert.equal(verifyCookie(c, ["outro-token"]), false); // trocar o token derruba todas as sessões
  const [exp, sig] = c.split(".");
  assert.equal(verifyCookie(`${Number(exp) + 99999999}.${sig}`, ["segredo"]), false); // estender a validade
  assert.equal(verifyCookie(`${exp}.${sig}x`, ["segredo"]), false);
  assert.equal(verifyCookie("lixo", ["segredo"]), false);
  assert.equal(verifyCookie(undefined, ["segredo"]), false);
  assert.equal(verifyCookie(c, []), false);
});
test("readCookie acha o cookie entre outros", () => {
  assert.equal(readCookie("a=1; buscadoc_access=xyz; b=2", "buscadoc_access"), "xyz");
  assert.equal(readCookie("a=1", "buscadoc_access"), undefined);
  assert.equal(readCookie(null, "x"), undefined);
});
