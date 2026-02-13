
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { useAgentsChat } from '@/contexts/AgentsChatContext';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { t } from 'i18next';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	const isMobile = useIsMobile();
	const { isModalOpen } = useAgentsChat();

	const { user } = useAuth();
	const hasPermissions = ["ADMINISTRATOR", "MANAGER"].includes(user?.role);

	const toggleSidebarCollapse = () => {
		setSidebarCollapsed(!sidebarCollapsed);
	};
	const SIDEBAR_WIDTH = '15rem';

	const collapsedPx = 64;
	const expandedPx = parseInt(SIDEBAR_WIDTH) * 16 || 240;

	return (
		<div className="flex w-full h-screen justify-center items-center bg-white">
			<div className="flex w-full h-screen flex-1 flex-col items-start shrink-0">
				<Navbar />
				<div className="flex flex-1 w-full">
					{/* Hide sidebar on mobile when Agents Chat modal is open */}
					{!(isMobile && isModalOpen) && (
						<Sidebar
							isOpen={sidebarOpen}
							onClose={() => setSidebarOpen(false)}
							isCollapsed={sidebarCollapsed}
							onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
						/>
					)}

					<Outlet />

					{/* Desktop toggle button */}
					<button
						onClick={toggleSidebarCollapse}
						aria-label={sidebarCollapsed ? t('dashboard.expandSidebar') : t('dashboard.collapseSidebar')}
						aria-pressed={sidebarCollapsed}
						className={[
							hasPermissions ? 'top-[60%]' : 'top-1/2',
							'fixed -translate-y-1/2 -translate-x-1/2',
							'hidden sm:flex h-9 w-9 items-center justify-center',
							'rounded-full border bg-white text-gray-700',
							'shadow-md hover:shadow-lg',
							'border-gray-200 hover:bg-gray-50',
							'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
							'z-40 transition-all duration-200'
						].join(' ')}
						style={{
							left: sidebarCollapsed ? `${collapsedPx}px` : `${expandedPx}px`
						}}
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
						>
							{sidebarCollapsed ? (
								<path
									d="M9 6l6 6-6 6"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							) : (
								<path
									d="M15 6l-6 6 6 6"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							)}
						</svg>
					</button>
				</div>
			</div>
		</div >
	);
};

export default MainLayout;
