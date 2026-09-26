export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#fff" />
      <circle cx="19.5" cy="18" r="8.5" fill="#070708" />
      <circle cx="21" cy="19.5" r="3.2" fill="#fff" />
    </svg>
  );
}
