import assert from "node:assert/strict";
import { contractRequest, signMarketplaceContract } from "../src/contract_sign.js";

const parsed = contractRequest.safeParse({ sellerAssetKey: "asset-1", buyerName: "Buyer", orderId: "order-1", html: "<p>terms</p>", certPem: "cert", keyPem: "key" });
assert.equal(parsed.success, true);
assert.equal(contractRequest.safeParse({ sellerAssetKey: "", buyerName: "Buyer", orderId: "order-1", html: "x", certPem: "c", keyPem: "k" }).success, false);
console.log("contract request validation passed");

import { InfraiClient } from "../src/infra_client.js";
const calls: { path: string; body: any }[] = [];
class RecordingClient extends InfraiClient {
  constructor() { super("test-key"); }
  override async request<T>(path: string, _method: "POST" | "PUT", body: unknown): Promise<T> {
    calls.push({ path, body });
    return (path === "/v1/pdf/generate" ? { url: "data:application/pdf;base64,generated-bytes" } : { pdf: "signed-bytes" }) as T;
  }
}
async function verifyDefault() {
const result = await signMarketplaceContract({ sellerAssetKey: "asset-1", buyerName: "Buyer", orderId: "order-1", html: "<p>terms</p>", certPem: "cert", keyPem: "key" }, new RecordingClient());
assert.equal("signedPdf" in result && result.signedPdf, "signed-bytes");
assert.deepEqual(calls.map(call => call.path), ["/v1/pdf/generate", "/v1/pdf/sign"]);
assert.equal(calls[1].body.pdf, "data:application/pdf;base64,generated-bytes");
assert.ok(calls.every(call => call.body.store === false));
console.log("default workflow creates no persistent storage resources");

}
verifyDefault().catch(error => { console.error(error); process.exitCode = 1; });
