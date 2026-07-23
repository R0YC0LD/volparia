import assert from "node:assert/strict";
import worker from "./src/index.js";

const env = {
  STOREFRONT_URL: "https://r0yc0ld.github.io/volparia/",
  ALLOWED_ORIGINS: "https://r0yc0ld.github.io"
};

const allowed = await worker.fetch(new Request("https://api.example/api/health", {
  headers: { Origin: "https://r0yc0ld.github.io" }
}), env);
assert.equal(allowed.status, 200);
assert.equal(allowed.headers.get("access-control-allow-origin"), "https://r0yc0ld.github.io");
assert.equal(allowed.headers.get("x-content-type-options"), "nosniff");

const denied = await worker.fetch(new Request("https://api.example/api/health", {
  headers: { Origin: "https://evil.example" }
}), env);
assert.equal(denied.status, 403);
assert.equal(denied.headers.get("access-control-allow-origin"), null);

const products = [
  { id: "shirt", name: "Gömlek", price: 100, sizes: JSON.stringify([{ name: "M", stock: 5 }]) },
  { id: "pants", name: "Pantolon", price: 200, sizes: JSON.stringify([{ name: "M", stock: 5 }]) }
];
const settings = {
  bundles: [{ id: "office", productIds: ["shirt", "pants"], discountPercent: 10, active: true }]
};
const capturedBatches = [];
const DB = {
  prepare(sql) {
    const statement = {
      sql,
      params: [],
      bind(...params) { this.params = params; return this; },
      async run() { return { success: true }; },
      async first() {
        if (sql.includes("FROM request_limits")) return null;
        if (sql.includes("store_settings") && sql.includes("key='store'")) return { value: JSON.stringify(settings) };
        return null;
      },
      async all() {
        if (sql.includes("FROM products WHERE active=1")) return { results: products };
        return { results: [] };
      }
    };
    return statement;
  },
  async batch(statements) {
    capturedBatches.push(statements);
    return statements.map(() => ({ success: true }));
  }
};
const orderResponse = await worker.fetch(new Request("https://api.example/api/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://r0yc0ld.github.io",
    "CF-Connecting-IP": "203.0.113.10"
  },
  body: JSON.stringify({
    id: "attacker-controlled-id",
    orderNo: "attacker-controlled-number",
    customer: {
      firstName: "Ada", lastName: "Lovelace", email: "ada@example.com",
      phone: "5555555555", city: "İstanbul", address: "Test adresi"
    },
    items: [
      { id: "shirt", size: "M", quantity: 1, bundleId: "office" },
      { id: "pants", size: "M", quantity: 1, bundleId: "office" }
    ],
    bundleDiscount: 999999,
    payment: "card"
  })
}), { ...env, DB, SESSION_SECRET: "a-secure-session-secret-with-more-than-32-characters" });
assert.equal(orderResponse.status, 201);
const orderPayload = await orderResponse.json();
assert.equal(orderPayload.order.total, 270);
assert.equal(orderPayload.order.bundleDiscount, 30);
assert.match(orderPayload.order.id, /^ord_[a-f0-9]{32}$/);
assert.notEqual(orderPayload.order.id, "attacker-controlled-id");
assert.match(orderPayload.order.checkoutToken, /^[A-Za-z0-9_-]{40,}$/);
assert.equal(capturedBatches.length, 1);

console.log("Worker origin, order integrity, and security header tests passed.");
