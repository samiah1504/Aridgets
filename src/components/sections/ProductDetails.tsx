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
    <section className="px-4 sp-section">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Product Details</h2>
        {description?.trim() && (
          <div className="space-y-3 text-base leading-relaxed">
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
          <dl className="mt-6 sp-card divide-y sp-border overflow-hidden">
            {rows.map((r) => (
              <div key={r.label} className="flex gap-4 px-4 py-3 text-sm sp-border">
                <dt className="w-28 shrink-0 font-semibold sp-muted">{r.label}</dt>
                <dd className="whitespace-pre-line">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
