import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { SealReceiptCard } from "@/components/SealReceiptCard";
import { getStore } from "@/data/store";
import { buildReceiptView } from "@/lib/view";
import { resolveBaseUrl, verifyQrDataUrl } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: { hash: string } }) {
  const store = getStore();
  const result = store.getByReceiptHash(params.hash);
  if (!result.found || !result.bundle) notFound();

  const view = buildReceiptView(result.bundle);
  const host = headers().get("host");
  const baseUrl = resolveBaseUrl(host);
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify/${params.hash}`;
  const qr = await verifyQrDataUrl(baseUrl, params.hash);

  return (
    <main>
      <Nav />
      <div className="px-5 pb-20 pt-2">
        <SealReceiptCard view={view} qrDataUrl={qr} verifyUrl={verifyUrl} />
        <div className="mx-auto mt-6 max-w-xl text-center">
          <Link href="/ledger" className="text-xs text-soil-300 underline">
            View this receipt in the tamper-proof ledger →
          </Link>
        </div>
      </div>
    </main>
  );
}
