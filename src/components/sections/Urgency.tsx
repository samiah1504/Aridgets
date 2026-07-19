export default function Urgency({
  text,
  hasCountdown,
}: {
  text?: string;
  hasCountdown?: boolean;
}) {
  if (!text) return null;
  return (
    <section className="px-4 py-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
          <p className="text-amber-800 font-semibold text-sm leading-relaxed">{text}</p>
          {hasCountdown && (
            <p className="mt-2 text-xs text-amber-600">
              Offer expires soon — order now to lock in this price.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
