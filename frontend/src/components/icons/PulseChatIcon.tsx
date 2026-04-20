import React, { useId } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

type Props = {
  /** Pixel size (nav uses 22). */
  size?: number;
  sx?: SxProps<Theme>;
};

/**
 * Rounded square with purple→blue gradient and white pulse mark (same path as logo).
 * Uses a plain <svg> so Mui SvgIcon color/currentColor never hides the gradient.
 */
const PulseChatIcon: React.FC<Props> = ({ size = 22, sx }) => {
  const gid = useId().replace(/:/g, '');
  const gradId = `pulseChatIconGrad-${gid}`;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        flexShrink: 0,
        lineHeight: 0,
        verticalAlign: 'middle',
        width: size,
        height: size,
        ...sx,
      }}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a08fff" />
            <stop offset="55%" stopColor="#7c6cff" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="5.5"
          fill={`url(#${gradId})`}
        />
        <g transform="translate(4.25, 3.75) scale(0.52)">
          <path
            fill="#ffffff"
            d="M2 12h3l2-6 4 12 3-10 2 6h6v2h-7l-1-3-3 10-4-14-1 3H2v-2Z"
          />
        </g>
      </svg>
    </Box>
  );
};

export default PulseChatIcon;
