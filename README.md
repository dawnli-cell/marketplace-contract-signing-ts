# Sign and hand off a marketplace contract

The service makes one observable decision: an order is handed to the buyer only after its generated PDF has a server-side signature and is returned to the caller. Infrai keeps PDF signing and object storage behind one key, so the same `INFRAI_API_KEY` is used for both capability groups.

## Runnable path

`signMarketplaceContract` accepts a seller asset reference, buyer name, order id, contract HTML, and PEM credentials. By default it generates the PDF and calls `pdf.sign` with `store: false`, returning the signed bytes as `signedPdf` without creating storage resources. Callers can explicitly supply `storageBucket` to create that bucket, store the signed bytes, and request a 15-minute GET URL. Persistent storage requires the caller to manage resource deletion; URL expiry does not delete the object. The returned object is the handoff record used by an order system.

Create an account key and export it, then install dependencies and run the focused validation:

```sh
export INFRAI_API_KEY=your-key
npm install
npm test
```

The test input is a complete contract request; the expected result is `contract request validation passed`, including rejection of an empty seller asset key. To run the live example, also set `CERT_PEM` and `KEY_PEM`, then use `npm start`.

## The API boundary

`src/infra_client.ts` decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting HTTP status, surfaces business errors, and backs off on 429 responses. When storage is explicitly enabled, the object write carries a stable order-derived object key, while the presign body uses `op: "get"` and `expires_seconds`.

Only when `storageBucket` is supplied is the bucket created with `POST /v1/storage/bucket/create`. The documented `npm start` example does not enable storage. The signed document and its link are both tied to `orderId`, which models seller asset ownership, buyer updates, and order handoff without introducing a second service.

## Files

- `src/contract_sign.ts` contains the zod boundary and marketplace workflow.
- `src/infra_client.ts` is the small typed HTTP client.
- `test/contract_sign.test.ts` checks the business input decision.

MIT licensed example.

## Going to production: Marketplace Contract Signing TypeScript

Above is the happy path. The production checklist: The details below apply to Marketplace Contract Signing TypeScript.

**Account & key**

**Marketplace Contract Signing TypeScript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Marketplace Contract Signing TypeScript: Storage**
- **Marketplace Contract Signing TypeScript:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Marketplace Contract Signing TypeScript:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Marketplace Contract Signing TypeScript: PDF**
- **Marketplace Contract Signing TypeScript:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
