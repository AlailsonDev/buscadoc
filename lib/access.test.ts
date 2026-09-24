import test from "node:test";
import assert from "node:assert/strict";
import { MS_PERSONAL_TENANT, decodeJwtPayload, isAdminEmail, isAllowedEmail, isTenantAllowed, parseList } from "./access.ts";

test("parseList aceita vírgula, ponto e vírgula, espaços, aspas e maiúsculas", () => {
  assert.deepEqual(parseList(' Ana@Gmail.com, "bob@outlook.com" ;c@x.org\n'), ["ana@gmail.com", "bob@outlook.com", "c@x.org"]);
  assert.deepEqual(parseList(undefined), []);
});
test("lista vazia não autoriza ninguém (falha segura)", () => {
  assert.equal(isAllowedEmail("a@gmail.com", [], []), false);
});
test("autoriza somente e-mails da lista, sem diferenciar maiúsculas", () => {
  assert.equal(isAllowedEmail("ANA@gmail.com", ["ana@gmail.com"], []), true);
  assert.equal(isAllowedEmail("outra@gmail.com", ["ana@gmail.com"], []), false);
  assert.equal(isAllowedEmail(null, ["ana@gmail.com"], []), false);
  assert.equal(isAllowedEmail("ana@gmail.com.evil.com", ["ana@gmail.com"], []), false);
});
test("administrador é autorizado mesmo fora da lista de acesso", () => {
  assert.equal(isAllowedEmail("adm@gmail.com", [], ["adm@gmail.com"]), true);
  assert.equal(isAdminEmail("ADM@gmail.com", ["adm@gmail.com"]), true);
  assert.equal(isAdminEmail("ana@gmail.com", ["adm@gmail.com"]), false);
});
test("Microsoft: aceita conta pessoal e só os tenants liberados", () => {
  assert.equal(isTenantAllowed(MS_PERSONAL_TENANT, []), true);
  assert.equal(isTenantAllowed("11111111-2222-3333-4444-555555555555", []), false);
  assert.equal(isTenantAllowed("11111111-2222-3333-4444-555555555555", ["11111111-2222-3333-4444-555555555555"]), true);
  assert.equal(isTenantAllowed(undefined, [MS_PERSONAL_TENANT]), false);
});
test("decodeJwtPayload lê claims e tolera lixo", () => {
  const payload = Buffer.from(JSON.stringify({ tid: "abc", preferred_username: "x@outlook.com" })).toString("base64url");
  assert.deepEqual(decodeJwtPayload(`h.${payload}.s`), { tid: "abc", preferred_username: "x@outlook.com" });
  assert.deepEqual(decodeJwtPayload("lixo"), {});
  assert.deepEqual(decodeJwtPayload(undefined), {});
});
