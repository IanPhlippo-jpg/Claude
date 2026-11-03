import { Icon } from '../../ui/icons';
import type { Mate } from '../../core/document/types';

/** the tree icon per mate type (shared by the assembly tree and the breadcrumbs; its own module so the tree can load late) */
export const MATE_ICON: Partial<Record<Mate['type'], React.ReactNode>> = {
  coincident: <Icon.MateCoincident />,
  parallel: <Icon.MateParallel />,
  perpendicular: <Icon.MatePerpendicular />,
  tangent: <Icon.MateTangent />,
  concentric: <Icon.MateConcentric />,
  lock: <Icon.MateLock />,
  distance: <Icon.MateDistance />,
  angle: <Icon.MateAngle />,
};
