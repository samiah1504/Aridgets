export default function Guarantee({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <section className="px-4 sp-section sp-surface">
      <div className="max-w-lg mx-auto flex items-start gap-4">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center sp-on-primary text-2xl"
        >
          🛡
        </div>
        <div>
          <h2 className="font-bold text-lg mb-1">Our Guarantee</h2>
          <p className="sp-muted text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    </section>
  );
}
