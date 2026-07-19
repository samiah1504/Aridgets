export default function FeaturesSpecs({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="px-4 py-10 bg-gray-50">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Features & Specs</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span style={{ color: "var(--product-primary)" }} className="font-bold mt-0.5">
                ›
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
