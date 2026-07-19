export default function Guarantee({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <section className="px-4 py-10 bg-gray-50">
      <div className="max-w-lg mx-auto flex items-start gap-4">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl"
          style={{ backgroundColor: "var(--product-primary)" }}
        >
          🛡
        </div>
        <div>
          <h2 className="font-bold text-lg mb-1">Our Guarantee</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    </section>
  );
}
