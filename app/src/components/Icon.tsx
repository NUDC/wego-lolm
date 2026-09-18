import type { ReactNode } from "react";

/// 统一线性图标（24 网格，1.8 描边，currentColor 跟随文字色）。
/// 不用 emoji：emoji 的字重、色彩、渲染在各系统上都不一致，和界面永远对不齐。
export type IconName =
  | "play"
  | "plus"
  | "userPlus"
  | "trash"
  | "chevronRight"
  | "arrowLeft"
  | "check"
  | "alert"
  | "info"
  | "refresh"
  | "lock"
  | "users"
  | "swap";

const ICONS: Record<IconName, ReactNode> = {
  play: <path d="M7.5 4.8v14.4L19 12 7.5 4.8Z" fill="currentColor" stroke="none" />,
  plus: <path d="M12 5v14M5 12h14" />,
  userPlus: (
    <>
      <path d="M15 20v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.2V20" />
      <circle cx="9" cy="7.4" r="3.6" />
      <path d="M18.5 8.2v5.4M21.2 10.9h-5.4" />
    </>
  ),
  trash: (
    <>
      <path d="M3.8 6.3h16.4" />
      <path d="M8.7 6.3V4.8a1.4 1.4 0 0 1 1.4-1.4h3.8a1.4 1.4 0 0 1 1.4 1.4v1.5" />
      <path d="M18.6 6.3 17.8 19a1.9 1.9 0 0 1-1.9 1.8H8.1A1.9 1.9 0 0 1 6.2 19L5.4 6.3" />
    </>
  ),
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  arrowLeft: <path d="M19 12H5M11.5 18.5 5 12l6.5-6.5" />,
  check: <path d="M20 6.5 9.4 17.1 4 11.7" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.8v4.9M12 16.2h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 16.2v-4.9M12 7.8h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.6 12a8.6 8.6 0 1 1-2.5-6.1" />
      <path d="M20.9 4.4v5.2h-5.2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.2" y="10.6" width="15.6" height="10.2" rx="2.2" />
      <path d="M8 10.6V7.4a4 4 0 0 1 8 0v3.2" />
    </>
  ),
  users: (
    <>
      <path d="M15.4 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.2a3.6 3.6 0 0 0-3.6 3.6v1.8" />
      <circle cx="9" cy="7.4" r="3.6" />
      <path d="M21.4 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5M16.1 4a3.6 3.6 0 0 1 0 7" />
    </>
  ),
  /* 与应用图标同形：界面里的品牌标记和桌面图标要认得出是同一个东西 */
  swap: (
    <>
      <path d="M3.8 9.2h15.1M15.4 5.7l3.5 3.5-3.5 3.5" />
      <path d="M20.2 14.8H5.1M8.6 11.3l-3.5 3.5 3.5 3.5" />
    </>
  ),
};

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

export default function Icon({ name, size = 20, className }: Props) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
