type Props = { items: string[] };

export default function Marquee({ items }: Props) {
  return (
    <div className="relative overflow-hidden">
      <div className="animate-marquee whitespace-nowrap">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="mx-6 inline-block text-sm text-white/60">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}


