interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ({ items }: { items?: FAQItem[] }) {
  if (!items?.length) return null;
  return (
    <section className="px-4 sp-section">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {items.map((item, i) => (
            <details
              key={i}
              className="group sp-card overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-3 px-4 py-4 font-semibold text-sm cursor-pointer select-none list-none">
                {item.question}
                <span className="flex-shrink-0 sp-subtle group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <div className="px-4 pb-4 text-sm sp-muted leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
