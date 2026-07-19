interface BenefitItem {
  icon?: string;
  text: string;
}

export default function Benefits({ items }: { items?: BenefitItem[] }) {
  if (!items?.length) return null;
  return (
    <section className="px-4 py-10 bg-gray-50">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Why Choose This?</h2>
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: "var(--product-primary)" }}
              >
                {item.icon ?? "✓"}
              </span>
              <span className="text-base leading-snug">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
