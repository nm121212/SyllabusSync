import React, { useId } from 'react';
import { SvgIcon, type SvgIconProps } from '@mui/material';

/**
 * Rounded square with purple→blue gradient and a white pulse line — matches
 * the Cadence brand mark used for Chat in the sidebar and hero.
 */
const PulseChatIcon: React.FC<SvgIconProps> = (props) => {
  const gid = useId().replace(/:/g, '');
  const gradId = `pulseChatIconGrad-${gid}`;
  return (
    <SvgIcon viewBox="0 0 24 24" {...props} sx={{ fontSize: 'inherit', ...props.sx }}>
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
      {/* Pulse / rhythm — same path as the Cadence logo mark */}
      <g transform="translate(4.25, 3.75) scale(0.52)">
        <path
          fill="#ffffff"
          d="M2 12h3l2-6 4 12 3-10 2 6h6v2h-7l-1-3-3 10-4-14-1 3H2v-2Z"
        />
      </g>
    </SvgIcon>
  );
};

export default PulseChatIcon;
