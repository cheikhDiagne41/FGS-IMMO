export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="inline-flex items-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5">
      <img
        src="/logo-fgs.jpeg"
        alt="FGS_IMMO"
        style={{ height: size }}
        className="w-auto rounded object-contain"
      />
    </div>
  );
}
