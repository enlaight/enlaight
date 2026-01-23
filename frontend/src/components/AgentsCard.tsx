import React from 'react';
import { useTranslation } from 'react-i18next';
import dataAnalyst from '@/assets/data-analyst.png';
import supportAssistant from '@/assets/support-assistant.png';
import techExpert from '@/assets/tech-expert.png';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

const images = [
	dataAnalyst,
	supportAssistant,
	techExpert
]

export const AgentsCard: React.FC = ({
	index = 0,
	name = "John",
	expertise = "AI Assistant",
	desc = "This is a helpful AI assistant able to speak in many languages to aid clients based on different projects",
	icon = images[index % images.length],
	onClick = () => { }
}) => {
	const { t } = useTranslation();

	return (
		<div className="relative ml-[8%]">
			<img src={icon} alt="" className="absolute top-[-5%] left-[-25%]" />
			<Card className="w-[376px] h-[235px] opacity-100 gap-0 rounded-lg pt-[20px] pr-[20px] pb-[20px] pl-[111px] border border-solid">
				<CardContent className="flex flex-col gap-3 items-start p-0">
					<div className="flex flex-col gap-1">
						<p className="font-inter font-bold text-[24px] text-gray-900 leading-[125%] tracking-[0.15px]">
							{name}
						</p>
						<p className="font-roboto font-medium text-[16px] leading-[24px] tracking-[0.15px] text-[#FEBC2F] uppercase">
							{expertise || name}
						</p>
					</div>
					<p className="font-inter font-normal text-[14px] leading-[150%] tracking-[0.15px] text-[#6B7280] text-left line-clamp-3">
						{desc}
					</p>
					<Button onClick={onClick}>{t('home.newChat')}</Button>
				</CardContent>
			</Card>
		</div>
	);
};
