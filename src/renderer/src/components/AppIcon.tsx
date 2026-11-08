import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type {
  IconDefinition,
  SizeProp
} from '@fortawesome/fontawesome-svg-core';

interface AppIconProps {
  icon: IconDefinition;
  size?: SizeProp;
  className?: string;
  title?: string;
  fixedWidth?: boolean;
}

function AppIcon({
  icon,
  size = '1x',
  className,
  title,
  fixedWidth = false
}: AppIconProps) {
  return (
    <FontAwesomeIcon
      icon={icon}
      size={size}
      className={className}
      title={title}
      fixedWidth={fixedWidth}
    />
  );
}

export default AppIcon;