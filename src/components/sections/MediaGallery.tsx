interface MediaItem {
  id: string;
  url: string;
  alt: string | null;
  kind: string;
  slot: string;
  sort_order: number;
}

export default function MediaGallery({
  media,
  productName,
}: {
  media: MediaItem[];
  productName: string;
}) {
  const images = media
    .filter((m) => m.kind === "image")
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!images.length) return null;

  const hero = images.find((m) => m.slot === "hero") ?? images[0];
  const gallery = images.filter((m) => m !== hero);

  return (
    <section className="px-4 py-6 max-w-lg mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero.url}
        alt={hero.alt ?? productName}
        className="w-full rounded-2xl object-cover aspect-square shadow-md"
        loading="eager"
      />
      {gallery.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {gallery.slice(0, 4).map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.url}
              alt={img.alt ?? productName}
              className="w-full rounded-xl object-cover aspect-square"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </section>
  );
}
