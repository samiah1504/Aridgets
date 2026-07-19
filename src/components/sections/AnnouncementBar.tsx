export default function AnnouncementBar({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div
      className="sticky top-0 z-50 text-white text-center text-sm py-2.5 px-4 font-semibold tracking-wide"
      style={{ backgroundColor: "var(--product-primary)" }}
    >
      {text}
    </div>
  );
}
