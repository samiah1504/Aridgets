import { toIntlNGPhone } from "@/lib/utils/phone";

interface Props {
  number: string;
  productName: string;
}

// Floating WhatsApp chat button shown on every landing page when the product
// has a WhatsApp number set (Product editor → Basic tab).
export default function WhatsAppButton({ number, productName }: Props) {
  const intl = toIntlNGPhone(number) ?? (
    /^\+?\d{7,15}$/.test(number.replace(/[\s-]/g, ""))
      ? `+${number.replace(/[^\d]/g, "")}`
      : null
  );
  if (!intl) return null;

  const message = `Hello! I'm interested in ${productName}. Please tell me more.`;
  const href = `https://wa.me/${intl.replace("+", "")}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-4 z-50 flex items-center justify-center w-16 h-16 rounded-full bg-[#25D366] text-white shadow-2xl shadow-green-900/40 ring-4 ring-white hover:scale-105 active:scale-95 transition-transform"
    >
      {/* Pulsing glow ring */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30 pointer-events-none"
      />
      <svg viewBox="0 0 32 32" className="w-9 h-9 fill-white relative" aria-hidden>
        <path d="M16.004 3C8.832 3 3 8.83 3 16c0 2.29.6 4.53 1.74 6.5L3 29l6.66-1.72A13.02 13.02 0 0 0 16.004 29C23.17 29 29 23.17 29 16S23.17 3 16.004 3zm0 23.6a10.55 10.55 0 0 1-5.38-1.47l-.39-.23-3.95 1.02 1.06-3.85-.26-.4A10.53 10.53 0 0 1 5.4 16c0-5.84 4.76-10.6 10.6-10.6 5.84 0 10.6 4.76 10.6 10.6 0 5.85-4.76 10.6-10.6 10.6zm5.82-7.93c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.14 3.08 1.3 3.29.16.21 2.25 3.44 5.45 4.82.76.33 1.36.53 1.82.67.77.25 1.46.21 2.01.13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37z" />
      </svg>
    </a>
  );
}
