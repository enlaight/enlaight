import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAgentsChat } from "@/contexts/AgentsChatContext";
import { ChatInfo, EnlaightBot } from "@/assets/svgs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AgentsCard } from "@/components/AgentsCard";
import { useAgents } from "@/hooks/use-agents";
import { useStore } from "@/store/useStore";
import AgentsChatMount from "@/components/AgentsChatMount";
import dataAnalyst from '@/assets/data-analyst.png';
import supportAssistant from '@/assets/support-assistant.png';
import techExpert from '@/assets/tech-expert.png';
import { Button } from "@/components/ui/button";
import { Bot } from "@/types/bots";
import { Plus, X } from "lucide-react";
import SessionHistoryItem from "@/components/SessionHistoryItem";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChatSessionService } from "@/services/ChatSessionService";
import { useAuth } from "@/hooks/use-auth";
import LoadingAnimation from "@/components/LoadingAnimation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const images = [
	dataAnalyst,
	supportAssistant,
	techExpert
]

const Index = () => {
	const { t } = useTranslation();

	const { user } = useAuth();
	const isAdmin = user?.role === "ADMINISTRATOR";

	const [isLoading, setLoading] = useState(true);
	const [chatOpen, setChat] = useState(false);
	const [timeFilter, setFilter] = useState(t('home.lastDay'));
	const [filteredSessions, setFilteredSessions] = useState([]);
	const [icon, setIcon] = useState(dataAnalyst);

	const [delConfirm, setDelConfirm] = useState(false);
	const [delSession, setDelSession] = useState(null);

	const { agents, loading, deleteSessionFromAgent } = useAgents();
	const { clients, projects } = useStore() as any;
	const [selectedAgent, setSelectedAgent] = useState<Bot>(null);
	const [localSessionKey, setLocalSessionKey] = useState(null);
	const {
		isModalOpen,
		selectedAgentId,
		sessionKey: contextSessionKey,
		isReset,
		scrollSearch,
		closeModal,
		setResetHomepage,
	} = useAgentsChat();

	const memoizedAgentsChat = useMemo(() => {
		if (!selectedAgent) return null;
		return (
			<AgentsChatMount
				webhookUrl={selectedAgent.url_n8n}
				agentId={selectedAgent.id}
				initialMessage={`Hello, I'm ${selectedAgent.name}. How can I assist you today?`}
				metadata={{
					agentName: selectedAgent.name || '',
					specialty: selectedAgent.expertise_area?.name || '',
					agentId: selectedAgent.id || '',
				}}
				sessionKey={localSessionKey}
			/>
		);
	}, [selectedAgent, localSessionKey]);

	const startNewChat = () => {
		const savedAgent = selectedAgent;
		setSelectedAgent(null);
		setTimeout(() => {
			setSelectedAgent(savedAgent);
			setLocalSessionKey(null);
		}, 10);
	}

	useEffect(() => {
		if (isModalOpen && selectedAgentId) {
			const agent = agents.find(a => a.id === selectedAgentId);
			setLoading(true);
			if (agent) {
				if (contextSessionKey) {
					setLocalSessionKey(contextSessionKey);
				}
				handleChat(agent);
				closeModal();
			}
		}
	}, [isModalOpen, selectedAgentId, contextSessionKey, agents, closeModal]);

	useEffect(() => {
		if (isReset) {
			setChat(false);
			setSelectedAgent(null);
			setResetHomepage(false);
		}
	}, [isReset, setResetHomepage])

	useEffect(() => {
		if (isLoading && !isModalOpen && !selectedAgent) {
			setLoading(false);
		}
	}, [isLoading, isModalOpen, selectedAgent])

	const handleChat = (agent) => {
		// Select Chat
		setChat(true);
		setSelectedAgent(agent);
		if (!agent.image) {
			setIcon(images[Math.floor(Math.random() * images.length)]);
		};
		setLoading(false);
		filter(t('home.lastDay'));
	}

	const handleSession = (session) => {
		const agent = agents.find(a => a.id === session.agent_id);
		if (agent) {
			setLocalSessionKey(session.session_key);
			handleChat(agent);
			closeModal();
		}
	}

	const handleEditSession = (e) => {
		e.preventDefault();
		e.stopPropagation();
	}

	const deleteSession = async (e, session) => {
		e.preventDefault();
		e.stopPropagation();

		if (!session.session_key) return;
		try {
			await ChatSessionService.delete(session.session_key, session.agent_id);
			deleteSessionFromAgent(session.agent, session.session_key);
			setFilteredSessions(filteredSessions.filter(s => s.session_key !== session.session_key));
			// Close chat if deleting current session
			if (session.session_key === localSessionKey) closeChat()
		} catch (err) {
			console.error(err);
		}
	}

	const closeChat = () => {
		setLoading(true);
		setChat(false);
		setLocalSessionKey(null);
		setTimeout(() =>
			setLoading(false),
			1000);
	}

	const filter = (period = timeFilter) => {
		const agentSessions = selectedAgent?.chat_sessions || [];
		const now = new Date();
		const fromDate = new Date(now);

		switch (period) {
			case t('home.lastDay'):
				fromDate.setDate(now.getDate() - 1);
				break;
			case t('home.last3Days'):
				fromDate.setDate(now.getDate() - 3);
				break;
			case t('home.lastWeek'):
				fromDate.setDate(now.getDate() - 7);
				break;
			case t('home.Month'):
				fromDate.setMonth(now.getMonth() - 1);
				break;
		}

		// @ts-expect-error: chatsession type
		const filtered = agentSessions.filter(s => new Date(s?.created_at) >= fromDate);
		setFilteredSessions(filtered);
		setFilter(period);
	}

	useEffect(() => {
		filter();
	}, [selectedAgent])

	function scrollToChatMessage(targetText) {
		// Find the container of messages
		const messagesList = document.querySelector('.chat-messages-list');
		if (!messagesList) return;

		// Find all individual messages
		const messages = messagesList.querySelectorAll('.chat-message');

		const scrolltext = targetText.toLowerCase().replace(/\r?\n|\r/g, "").trim();

		// Look for the message containing the text
		let targetMessage = null;
		messages.forEach((msg) => {
			if (msg.textContent.toLowerCase().replace(/\r?\n|\r/g, "").trim().includes(scrolltext)) {
				targetMessage = msg;
			}
		});

		// Scroll the parent .chat-body to the target message
		const chatBody = messagesList.closest('.chat-body');
		if (!chatBody) return;

		// Scroll so the message is visible
		targetMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	useEffect(() => {
		if (!scrollSearch) return;
		setTimeout(() => {
			scrollToChatMessage(scrollSearch);
		}, 2000);
	}, [scrollSearch]);

	return (
		<>
			<main className="container px-0 bg-white flex relative">
				<div
					className={
						`transition-all ease-in-out min-w-[250px] h-full bg-[#F4F4F5] overflow-hidden ${chatOpen ? 'w-[250px]' : 'w-full'
						}`}
					style={{ transitionDuration: '1000ms' }}
				>
					{chatOpen ? (
						<>
							<div className="flex flex-col gap-[50px] items-start px-3 py-4 w-[250px] h-full">
								<div className="flex flex-col justify-between w-full gap-3">
									<div className="flex flex-col justify-between w-full">
										<div className="flex justify-between w-full">
											<div className="font-bold text-2xl leading-[125%] tracking-[0] animate-fade-in">{selectedAgent?.name}</div>
											<TooltipProvider delayDuration={0}>
												<Tooltip>
													<TooltipTrigger asChild>
														<span>
															<ChatInfo size={19} fill='#8C8C8C' />
														</span>
													</TooltipTrigger>
													<TooltipContent style={{ maxWidth: '350px' }} side="right" align="start">
														{selectedAgent?.description}
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<div className="font-roboto font-medium text-base leading-6 tracking-[0.5px] text-[#FEBC2F] uppercase animate-fade-in">{selectedAgent?.expertise_area?.name}</div>
									</div>
									<div className="w-full flex flex-col items-center justify-center animate-fade-in">
										<div className="w-[140px] h-[121px] overflow-hidden">
											<img src={icon} alt="" className="object-cover object-top w-full h-full" />
										</div>
										<Button className="w-[200px] gap-2" onClick={startNewChat}>
											<Plus size={12} />
											{t('nav.newChat')}
										</Button>
									</div>
								</div>
								<div className="w-full flex flex-col gap-4 animate-fade-in">
									<div className="font-medium text-base leading-[150%] tracking-normal text-[#404040]">{t('home.historyWith', { chat_name: (selectedAgent?.name || "Assistant") })}:</div>
									<Accordion
										type="single"
										collapsible
										className="w-full border border-[#8C8C8C] rounded-[20px]"
										value={timeFilter}
										onValueChange={filter}
									>
										<AccordionItem value={t('home.choosePeriod')} className="border-none">
											<AccordionTrigger className="w-full justify-between rounded-[20px] px-4 py-2 hover:bg-[#F9F9F9] hover:no-underline">
												<div className="font-medium">{timeFilter || t('home.choosePeriod')}</div>
											</AccordionTrigger>
											<AccordionContent className="p-0">
												<div className="flex flex-col space-y-2 px-4 py-2">
													{[t('home.lastDay'), t('home.last3Days'), t('home.lastWeek'), t('home.lastMonth')].map((period) => (
														<div
															key={period}
															onClick={() => { filter(period) }}
															className="cursor-pointer hover:bg-[#F9F9F9] rounded-md p-2"
														>
															{period}
														</div>
													))}
												</div>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
									{filteredSessions.slice(0, 5).map((session, index) => (
										<SessionHistoryItem
											key={index}
											session={session}
											handleSession={() => handleSession(session)}
											handleEditSession={handleEditSession}
											deleteSession={(e) => {
												if (session.session_key === localSessionKey) {
													e.preventDefault();
													e.stopPropagation();
													setDelConfirm(true);
													setDelSession(session);
													return;
												}
												deleteSession(e, session);
											}}
										/>
									))}
								</div>
							</div>
						</>
					) : (
						<div className="max-w-[986px] w-[986px] h-full mx-auto ml-[clamp(10rem,auto,auto)] pt-[3rem] flex flex-col gap-[30px]">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								{/* Header */}
								{!isLoading && (
									<div>
										<h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
											<EnlaightBot size={30} fill="#fac114" />
											{t('home.welcomeToWorkspace')}{user && ', ' + user?.first_name}
										</h1>
										{(projects.length > 0 && clients.length > 0 && !isAdmin) ? (
											<p className="text-muted-foreground text-lg mt-2">
												{t('home.viewingContext', {
													project: projects[0]?.name || '',
													client: clients[0]?.name || ''
												})}
											</p>
										) : (
											<p className="text-muted-foreground text-lg">{t('home.selectAssistant')}</p>
										)}
									</div>
								)}
							</div>
							{(loading || isLoading) ? (
								<div className="h-full flex justify-center items-start pt-[8rem] pb-[3rem] relative">
									<LoadingAnimation text={t('home.loadingAgents')} />
								</div>
							) : (
								// Assistants container
								<div className="flex flex-wrap gap-[50px]">
									{agents.slice(0, 4).map((agent, index) => (
										<AgentsCard
											key={index}
											index={index}
											name={agent.name}
											expertise={agent.expertise_area?.name}
											desc={agent.description}
											icon={agent.image}
											onClick={() => handleChat(agent)}
										/>
									))}
								</div>
							)}
						</div>
					)}
				</div>
				{chatOpen && (
					<>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute top-8 box-border right-[102px] bg-transparent flex items-center justify-center"
							style={{ zIndex: 1, padding: '5px 10px', boxSizing: 'border-box' }}
							onClick={closeChat}
						>
							<X style={{ width: 30, height: 30 }} color="#8C8C8C" />
						</Button>

						{memoizedAgentsChat}
					</>
				)}

				<AlertDialog open={delConfirm} onOpenChange={setDelConfirm}>
					<AlertDialogContent className="bg-background border border-border">
						<AlertDialogHeader>
							<AlertDialogTitle className="text-foreground">{t('home.deleteTitle')}</AlertDialogTitle>
							<AlertDialogDescription className="text-muted-foreground">
								{t('home.deleteDesc')}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
								{t('common.cancel')}
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={(e) => { deleteSession(e, delSession); setDelConfirm(false); }}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{t('common.delete')}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</main >
		</>
	);
};

export default Index;
