import { z } from "zod";
import { InfraiClient } from "./infra_client.js";

export const contractRequest = z.object({
  sellerAssetKey: z.string().min(1), buyerName: z.string().min(1), orderId: z.string().min(1),
  html: z.string().min(1), certPem: z.string().min(1), keyPem: z.string().min(1),
  storageBucket: z.string().min(1).optional()
});
export type ContractRequest = z.infer<typeof contractRequest>;

export async function signMarketplaceContract(input: ContractRequest, client = new InfraiClient()) {
  const request = contractRequest.parse(input);
  const generated = await client.request<{ url: string }>("/v1/pdf/generate", "POST", { html: request.html, page_size: "A4", orientation: "portrait", store: false });
  const signed = await client.request<{ pdf: string }>("/v1/pdf/sign", "POST", { pdf: generated.url, cert_pem: request.certPem, key_pem: request.keyPem, reason: "Marketplace order", location: "Online", store: false }); // pdf.sign
  const handoff = { orderId: request.orderId, buyer: request.buyerName, sellerAssetKey: request.sellerAssetKey };
  if (!request.storageBucket) return { ...handoff, signedPdf: signed.pdf };
  const bucket = request.storageBucket;
  await client.request(`/v1/storage/bucket/create`, "POST", { name: bucket });
  const key = `${request.orderId}/signed-contract.pdf`;
  await client.request(`/v1/storage/object/put/${bucket}/${encodeURIComponent(key)}`, "PUT", { data_base64: signed.pdf, content_type: "application/pdf" });
  const link = await client.request<{ url: string }>(`/v1/storage/object/presign/${bucket}/${encodeURIComponent(key)}`, "POST", { op: "get", expires_seconds: 900, response_disposition: "attachment" });
  return { ...handoff, signedKey: key, downloadUrl: link.url };
}

if (process.argv[1]?.endsWith("contract_sign.ts")) {
  const sample = { sellerAssetKey: "seller-assets/listing-42", buyerName: "Ada Buyer", orderId: "order-1001", html: "<h1>Marketplace contract</h1><p>Order 1001</p>", certPem: process.env.CERT_PEM ?? "", keyPem: process.env.KEY_PEM ?? "" };
  signMarketplaceContract(sample).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
