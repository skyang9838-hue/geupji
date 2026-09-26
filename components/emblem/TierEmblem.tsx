import { brandFacets, crestFacets, type Facet } from "@/lib/emblem/geometry";
import type { TierId } from "@/lib/stats/tiers";

const cache = new Map<string, Facet[]>();

function facetsFor(key: TierId | "brand"): Facet[] {
  let facets = cache.get(key);
  if (!facets) {
    facets = key === "brand" ? brandFacets() : crestFacets(key);
    cache.set(key, facets);
  }
  return facets;
}

/** A tier's crest. Pass `label` when the crest stands in for the tier's name. */
export function TierEmblem({
  tier,
  size = 40,
  label,
  className,
}: {
  tier: TierId | "brand";
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {facetsFor(tier).map((f, i) => (
        <polygon key={i} points={f.points} fill={f.fill} opacity={f.opacity} />
      ))}
    </svg>
  );
}
