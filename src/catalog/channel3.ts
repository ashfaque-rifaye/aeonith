/**
 * Channel3 product catalog (https://api.trychannel3.com). Used for item pools: the agent resolves what the group
 * is buying to a real product with its retail price and image, and that retail price becomes the pool's
 * reference ("retail $419.99 at dell.com") and the ceiling sanity check. Read-only; never touches money.
 */
export interface CatalogHit {
  id: string;
  title: string;
  brand: string;
  priceCents: number;
  compareAtCents?: number;
  image?: string;
  url?: string;
  domain?: string;
}

export class Channel3 {
  constructor(private readonly apiKey: string, private readonly base = "https://api.trychannel3.com") {}

  get enabled() {
    return !!this.apiKey;
  }

  async search(query: string, limit = 6): Promise<CatalogHit[]> {
    if (!this.apiKey) return [];
    const res = await fetch(`${this.base}/v1/search`, {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.slice(0, 200), limit: Math.min(Math.max(limit, 1), 12), config: { country: "US", currency: "USD" } }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Channel3 ${res.status}`);
    const data = (await res.json()) as { products?: Array<Record<string, any>> };
    return (data.products ?? [])
      .map((p) => {
        const offer = (p.offers ?? []).find((o: any) => o.availability === "InStock") ?? (p.offers ?? [])[0];
        const img = (p.images ?? []).find((i: any) => i.is_main_image) ?? (p.images ?? [])[0];
        return {
          id: String(p.id),
          title: String(p.title ?? "").slice(0, 140),
          brand: String(p.brands?.[0]?.name ?? ""),
          priceCents: Math.round(Number(offer?.price?.price ?? 0) * 100),
          compareAtCents: offer?.price?.compare_at_price ? Math.round(Number(offer.price.compare_at_price) * 100) : undefined,
          image: img?.cleaned_url || img?.url,
          url: offer?.url,
          domain: offer?.domain,
        } satisfies CatalogHit;
      })
      .filter((h) => h.priceCents > 0);
  }
}
