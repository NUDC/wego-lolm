interface Props {
  size?: number;
  color?: string;
}

/// 和 App 内的品牌标记同形
export function SwapIcon({ size = 24, color = "currentColor" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.8 9.2h15.1M15.4 5.7l3.5 3.5-3.5 3.5" />
      <path d="M20.2 14.8H5.1M8.6 11.3l-3.5 3.5 3.5 3.5" />
    </svg>
  );
}

export function DownloadIcon({ size = 18, color = "currentColor" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.5 15.4v3.3a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8v-3.3" />
      <path d="M7.6 10.6 12 15l4.4-4.4M12 15V3.5" />
    </svg>
  );
}
