interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ({ items }: { items?: FAQItem[] }) {
  if (!items?.length) return null;
  return (
    <section className="px-4 py-10">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {items.map((item, i) => (
            <details
              key={i}
              className="group border border-gray-200 rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-3 px-4 py-4 font-semibold text-sm cursor-pointer select-none list-none">
                {item.question}
                <span className="flex-shrink-0 text-gray-400 group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
