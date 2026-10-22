import { formatNGN } from "@/lib/utils/currency";

interface HeroProps {
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  starRating?: number;
  ctaText?: string;
  trustRow?: string[];
  price: number;
  compareAtPrice?: number | null;
  pricePrefix?: string;
}

export default function Hero({
  eyebrow,
  headline,
  subhead,
  starRating,
  ctaText,
  trustRow,
  price,
  compareAtPrice,
  pricePrefix,
}: HeroProps) {
  return (
    <section className="px-4 py-8 max-w-lg mx-auto">
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-widest mb-3 sp-primary-text">
          {eyebrow}
        </p>
      )}
      {headline && (
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-4">
          {headline}
        </h1>
      )}
      {starRating !== undefined && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-yellow-400 text-lg leading-none">
            {"★".repeat(Math.min(5, Math.max(0, Math.round(starRating))))}
            {"☆".repeat(5 - Math.min(5, Math.max(0, Math.round(starRating))))}
          </span>
          <span className="text-sm sp-muted font-medium">
            {starRating.toFixed(1)} rating
          </span>
        </div>
      )}
      {subhead && (
        <p className="text-base sp-muted leading-relaxed mb-5">{subhead}</p>
      )}
      <div className="flex items-baseline gap-3 mb-5">
        {pricePrefix && <span className="text-base font-semibold sp-muted">{pricePrefix}</span>}
        <span className="text-3xl font-extrabold sp-primary-text">
          {formatNGN(price)}
        </span>
        {compareAtPrice && compareAtPrice > price && (
          <>
            <span className="text-lg sp-subtle line-through">
              {formatNGN(compareAtPrice)}
            </span>
            <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
              Save {formatNGN(compareAtPrice - price)}
            </span>
          </>
        )}
      </div>
      <a
        href="#order"
        className="sp-btn block w-full text-center text-lg font-bold py-4 shadow-lg"
      >
        {ctaText ?? "Order Now — Pay on Delivery"}
      </a>
      {trustRow && trustRow.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4 text-sm sp-muted">
          {trustRow.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="sp-primary-text font-bold">✓</span>
              {item}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
