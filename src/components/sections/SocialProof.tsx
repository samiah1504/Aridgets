interface Testimonial {
  name: string;
  location: string;
  rating: number;
  text: string;
  photo?: string;
}

export default function SocialProof({
  testimonials,
}: {
  testimonials?: Testimonial[];
}) {
  if (!testimonials?.length) return null;
  return (
    <section className="px-4 py-10 bg-gray-50">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          What Our Customers Say
        </h2>
        <div className="space-y-4">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="text-yellow-400 text-base mb-2">
                {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
              </div>
              <p className="text-sm leading-relaxed text-gray-700 mb-3">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "var(--product-primary)" }}
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
