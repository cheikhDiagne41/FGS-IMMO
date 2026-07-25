export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <rect width="64" height="64" rx="14" fill="#0f9253" />
        <path
          d="M14 34 L32 18 L50 34 V48 a3 3 0 0 1 -3 3 H17 a3 3 0 0 1 -3 -3 Z"
          fill="#ffffff"
        />
        <rect x="28" y="36" width="8" height="15" fill="#0f9253" />
        <circle cx="32" cy="15" r="4" fill="#f5c451" />
      </svg>
      <span className="text-lg font-extrabold tracking-tight">
        <span className="text-brand-700">FGS</span>
        <span className="text-gold-500">_IMMO</span>
      </span>
    </div>
  );
}
