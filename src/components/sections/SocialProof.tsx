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
    <section className="px-4 sp-section sp-surface">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          What Our Customers Say
        </h2>
        <div className="space-y-4">
          {testimonials.map((t, i) => (
            <div key={i} className="sp-card p-5">
              <div className="text-yellow-400 text-base mb-2">
                {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
              </div>
              <p className="text-sm leading-relaxed mb-3">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center sp-on-primary text-xs font-bold flex-shrink-0"
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs sp-subtle">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
