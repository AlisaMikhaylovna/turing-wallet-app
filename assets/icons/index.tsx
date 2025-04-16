import { theme } from '@/lib/theme';
import Lock from './lock';
import User from './user';

const icons = {
	lock: Lock,
	user: User,
};

const Icon = ({ name, ...props }: { name: keyof typeof icons; [key: string]: any }) => {
	const IconComponent = icons[name];

	if (!IconComponent) return null;

	return (
		<IconComponent
			height={props.size || 24}
			width={props.size || 24}
			strokeWidth={props.strokeWidth || 1.9}
			color={theme.colors.textLight}
			{...props}
		/>
	);
};

export default Icon;
