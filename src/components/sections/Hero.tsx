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
}: HeroProps) {
  return (
    <section className="px-4 py-8 max-w-lg mx-auto">
      {eyebrow && (
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "var(--product-primary)" }}
        >
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
            {"★".repeat(Math.round(starRating))}
            {"☆".repeat(5 - Math.round(starRating))}
          </span>
          <span className="text-sm text-gray-500 font-medium">
            {starRating.toFixed(1)} rating
          </span>
        </div>
      )}
      {subhead && (
        <p className="text-base text-gray-600 leading-relaxed mb-5">{subhead}</p>
      )}
      <div className="flex items-baseline gap-3 mb-5">
        <span
          className="text-3xl font-extrabold"
          style={{ color: "var(--product-primary)" }}
        >
          {formatNGN(price)}
        </span>
        {compareAtPrice && compareAtPrice > price && (
          <span className="text-lg text-gray-400 line-through">
            {formatNGN(compareAtPrice)}
          </span>
        )}
        {compareAtPrice && compareAtPrice > price && (
          <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
            Save {formatNGN(compareAtPrice - price)}
          </span>
        )}
      </div>
      <a
        href="#order"
        className="block w-full text-white text-center text-lg font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
        style={{ backgroundColor: "var(--product-primary)" }}
      >
        {ctaText ?? "Order Now — Pay on Delivery"}
      </a>
      {trustRow && trustRow.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4 text-sm text-gray-500">
          {trustRow.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-green-500 font-bold">✓</span>
              {item}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
