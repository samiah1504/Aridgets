export default function Problem({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <section className="sp-inverse px-4 sp-section">
      <div className="max-w-lg mx-auto">
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-60">
          The Problem
        </h2>
        <p className="text-lg leading-relaxed">{text}</p>
      </div>
    </section>
  );
}
