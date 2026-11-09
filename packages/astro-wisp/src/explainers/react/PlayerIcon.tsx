/**
 * 播放器控制条的 Lucide 图标（与主题 Icon.astro 同一套图标、同一描边）。
 * 只内联用到的几个路径，避免把整套图标数据打进客户端。
 */
const PATHS = {
  first: <path d="M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432zM3 20V4" />,
  prev: <path d="m15 18l-6-6l6-6" />,
  play: <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />,
  pause: (
    <>
      <rect width="5" height="18" x="14" y="3" rx="1" />
      <rect width="5" height="18" x="5" y="3" rx="1" />
    </>
  ),
  next: <path d="m9 18l6-6l-6-6" />,
  last: <path d="M21 4v16M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" />,
} as const;

export type PlayerIconName = keyof typeof PATHS;

export default function PlayerIcon({ name }: { name: PlayerIconName }) {
  return (
    <svg
      className="wisp-icon"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
