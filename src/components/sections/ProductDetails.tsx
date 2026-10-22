interface ProductDetailsProps {
  description?: string;
  material?: string;
  dimensions?: string;
  deliveryInfo?: string;
}

export default function ProductDetails({ description, material, dimensions, deliveryInfo }: ProductDetailsProps) {
  const rows = [
    material && { label: "Material", value: material },
    dimensions && { label: "Dimensions", value: dimensions },
    deliveryInfo && { label: "Delivery", value: deliveryInfo },
  ].filter(Boolean) as { label: string; value: string }[];

  if (!description?.trim() && !rows.length) return null;

  return (
    <section className="px-4 py-10">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Product Details</h2>
        {description?.trim() && (
          <div className="space-y-3 text-base leading-relaxed text-gray-700">
            {description
              .split(/\n{2,}/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className="whitespace-pre-line">{para}</p>
              ))}
          </div>
        )}
        {rows.length > 0 && (
          <dl className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {rows.map((r) => (
              <div key={r.label} className="flex gap-4 px-4 py-3 text-sm">
                <dt className="w-28 shrink-0 font-semibold text-gray-500">{r.label}</dt>
                <dd className="text-gray-900 whitespace-pre-line">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
