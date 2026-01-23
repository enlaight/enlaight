import React, { useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	// DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { StickyNote, X } from 'lucide-react';

export const NotificationDropdown: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const { t } = useTranslation();

	// const handleMenuClick = async (action: string) => {
	// };

	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<div
						onMouseEnter={() => setIsOpen(true)}
						onMouseLeave={() => setIsOpen(false)}
					>
						<Button onClick={() => setIsOpen(!isOpen)} variant="ghost" size="icon" aria-label="Notifications" className="p-1 rounded-full hover:bg-hover-bg transition-colors text-lg py-0 px-0">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="bell-icon w-6 h-6">
								<path d="M19.079 14.8286C18.4881 14.2473 18.1488 13.4574 18.134 12.6286V10.8286C18.133 9.35176 17.6212 7.92073 16.6855 6.77814C15.7497 5.63556 14.4477 4.85175 13 4.55961V3.09961C13 2.83439 12.8946 2.58004 12.7071 2.3925C12.5196 2.20497 12.2652 2.09961 12 2.09961C11.7348 2.09961 11.4804 2.20497 11.2929 2.3925C11.1054 2.58004 11 2.83439 11 3.09961V4.55961C9.55183 4.85185 8.24937 5.6361 7.31359 6.7793C6.37781 7.92251 5.86635 9.35425 5.866 10.8316V12.4176C5.86607 12.4882 5.87378 12.5586 5.889 12.6276H5.866C5.85125 13.4564 5.51194 14.2463 4.921 14.8276C4.38423 15.3538 4.05692 16.0571 4 16.8066C4 17.3496 4 18.9996 5.538 18.9996H7.746C8.03584 19.8999 8.60385 20.6851 9.36829 21.2421C10.1327 21.7991 11.0542 22.0991 12 22.0991C12.9458 22.0991 13.8673 21.7991 14.6317 21.2421C15.3961 20.6851 15.9642 19.8999 16.254 18.9996H18.462C20 18.9996 20 17.3496 20 16.8066C19.9428 16.0575 19.6156 15.3545 19.079 14.8286V14.8286ZM12 20.0996C11.5932 20.0991 11.1928 19.9985 10.834 19.8067C10.4753 19.6148 10.1693 19.3377 9.943 18.9996H14.057C13.8307 19.3377 13.5247 19.6148 13.166 19.8067C12.8072 19.9985 12.4068 20.0991 12 20.0996ZM18 16.9996H6C6 16.9326 6 16.8636 6 16.8066C6.1063 16.5396 6.26627 16.2973 6.47 16.0946C7.35569 15.1575 7.85559 13.921 7.87 12.6316V10.8316C7.8681 9.71315 8.2954 8.6366 9.06382 7.8239C9.83224 7.0112 10.8832 6.52431 12 6.46361C13.1175 6.52332 14.1695 7.00978 14.9387 7.82258C15.708 8.63538 16.1359 9.7125 16.134 10.8316V12.4176C16.1342 12.4882 16.1416 12.5585 16.156 12.6276H16.134C16.1484 13.917 16.6483 15.1535 17.534 16.0906C17.7377 16.2933 17.8977 16.5356 18.004 16.8026C18 16.8636 18 16.9326 18 16.9996Z" fill="currentColor" />
							</svg>
						</Button>
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-64 bg-popover border-none"
					align="center"
					forceMount
					onMouseEnter={() => setIsOpen(true)}
					onMouseLeave={() => setIsOpen(false)}
				>
					{/* <DropdownMenuSeparator />*/}
					<DropdownMenuItem
						className="flex m-5"
						onClick={() => { }}
					>
						<h2 className="text-md font-semibold text-foreground">{t('notifications.empty')}</h2>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
