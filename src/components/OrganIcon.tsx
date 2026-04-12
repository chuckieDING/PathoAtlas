import { SVGProps } from 'react';
import {
  IconOrganBreast,
  IconOrganLung,
  IconOrganGi,
  IconOrganLiver,
  IconOrganKidney,
  IconOrganThyroid,
  IconOrganLymph,
  IconOrganSkin,
  IconOrganGyn,
  IconOrganUrology,
  IconMicroscope,
} from './Icon';

type IconComponent = (props: SVGProps<SVGSVGElement> & { size?: number }) => React.JSX.Element;

const ORGAN_ICON_MAP: Record<string, IconComponent> = {
  breast: IconOrganBreast,
  lung: IconOrganLung,
  gi: IconOrganGi,
  liver: IconOrganLiver,
  kidney: IconOrganKidney,
  thyroid: IconOrganThyroid,
  lymphoma: IconOrganLymph,
  skin: IconOrganSkin,
  gynecology: IconOrganGyn,
  urology: IconOrganUrology,
};

interface OrganIconProps {
  organId: string;
  size?: number;
  color?: string;
  className?: string;
  withBackground?: boolean;
}

/**
 * Renders the themed anatomical SVG icon for an organ module.
 * Falls back to a generic microscope icon for unknown organ IDs.
 */
export function OrganIcon({ organId, size = 28, color, className, withBackground = false }: OrganIconProps) {
  const Component = ORGAN_ICON_MAP[organId] ?? IconMicroscope;
  const icon = <Component size={size} style={color ? { color } : undefined} />;

  if (!withBackground) return <span className={className} style={{ color }}>{icon}</span>;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl ${className ?? ''}`}
      style={{
        width: size + 18,
        height: size + 18,
        background: color ? color + '18' : 'var(--card-hover)',
        color: color ?? 'var(--fg)',
        border: `1px solid ${color ? color + '33' : 'var(--border)'}`,
      }}
    >
      {icon}
    </span>
  );
}
