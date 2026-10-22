export default function AnnouncementBar({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div
      className="sticky top-0 z-50 sp-on-primary text-center text-sm py-2.5 px-4 font-semibold tracking-wide"
    >
      {text}
    </div>
  );
}
