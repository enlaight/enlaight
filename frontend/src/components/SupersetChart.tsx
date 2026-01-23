import { useRef, useEffect } from 'react';
import { embedDashboard } from '@superset-ui/embedded-sdk';
import { BoardsService } from '@/services/BoardsService';

const supersetDomain = 'https://superset.enlaight.ai';

export const SupersetChart = ({ dashboardId = '' }) => {
	const containerRef = useRef(null);

	useEffect(() => {
		if (!containerRef.current || !dashboardId) return;

		const fetchGuestToken = async () => {
			try {
				const data = await BoardsService.get_token(dashboardId);
				return data.token;
			} catch (err) {
				return '';
			}
		};

		embedDashboard({
			id: dashboardId,
			supersetDomain,
			mountPoint: containerRef.current,
			fetchGuestToken,
			dashboardUiConfig: {
				hideTitle: true,
				hideTab: true,
				hideChartControls: true,
				filters: {
					expanded: false,
					visible: true,
				},
				urlParams: {
					standalone: 2,
				}
			},
			// iframeSandboxExtras: ['allow-top-navigation', 'allow-popups-to-escape-sandbox'],
		});

	}, [dashboardId]);

	// Necessary to make superset chart take up all space of card
	useEffect(() => {
		const iframeSuperset = containerRef.current.children[0];

		if (iframeSuperset) {
			iframeSuperset['width'] = "100%";
			iframeSuperset['height'] = "100%";
		}
	});

	return (
		<div ref={containerRef} style={{ width: '100%', height: '100%' }} />
	);
};
