import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAgentsChat } from "@/contexts/AgentsChatContext";
import { useStore } from "@/store/useStore";
import { BotMessageSquare, MessageSquareShare, Search, SearchX, TextSearch } from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const SearchPage = () => {
	const { t } = useTranslation();
	const [searchItems, setItems] = useState([]);
	const { agents, query, searchResults, loadingSearch, update } = useStore() as any;
	const navigate = useNavigate();
	const { openModal: openAgentChat } = useAgentsChat();

	useEffect(() => {
		const agentMap = new Map(agents.map(agent => [agent.id, agent.name]));

		const fullResults = searchResults.map(item => {
			const agentName = agentMap.get(item.agent_id) || "";
			if (!item.agent_id) return;
			return {
				...item,
				agent_name: agentName
			};
		});
		setItems(fullResults);

	}, [searchResults, agents]);

	const truncate = (text, len) => {
		if (text.length > len) {
			return text.slice(0, len) + '...';
		}
		return text;
	}

	const handleOpen = (result) => {
		openAgentChat(result.agent_id, result.session_id, result.message);
		navigate("/");
		update("currentQuery", "");
	}

	return (
		<>
			<main className="container pt-5 bg-[#F4F4F5] flex">
				<div
					className="w-full h-full overflow-hidden flex flex-col"
				>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
								<Search className="h-6 w-6 text-primary" />
								{t('search.title')}
							</h1>
							<p className="text-muted-foreground text-sm">
								{t('search.description')}
							</p>
						</div>
					</div>
					{loadingSearch && (
						<div className="h-full flex justify-center items-start pt-[8rem] pb-[3rem] relative">
							<LoadingAnimation
								icon={<TextSearch className="h-[100px] w-[100px] text-primary" />}
								text={<span>{t('search.searching')} "<b>{query}</b>"</span>}
							/>
						</div>
					)}
					{!loadingSearch && (
						searchItems.length === 0 ? (
							<div className="flex align-center justify-center mb-5 w-full h-[80%]">
								<div className="flex flex-col align-center justify-center gap-5 text-center space-y-4">
									<div className="mx-auto w-24 h-24 bg-[#EAEAEA] rounded-full flex items-center justify-center">
										<SearchX className="h-12 w-12 text-muted-foreground" />
									</div>
									<div className="space-y-2">
										<h3 className="text-xl font-semibold">
											{t('search.noMatchesTitle')}
										</h3>
										<p className="text-muted-foreground max-w-md mx-auto">
											{query.length === 0 ? (
												<>
													{t('search.noMatchesEmpty')}
												</>
											) : (
												<>
													{t('search.noMatchesFor')} "<b>{truncate(query, 50)}</b>"
												</>
											)}
										</p>
									</div>
								</div>
							</div>
						) : (
							<div className="py-12">
								<div className="flex align-center justify-start gap-3 text-center mb-5">
									<TextSearch className="h-8 w-8 text-muted-foreground" />
									<h3 className="max-w-[80%] text-xl mt-0">
										{t('search.resultsFor')} "<span className="font-semibold truncate">{truncate(query, 50)}</span>"
									</h3>
								</div>
								<div className="rounded-md">
									<div className="grid gap-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent rounded-lg">
										{searchItems.map((result, index) => (
											<Card key={index} className="duration-200 bg-white/30 hover:bg-white/50 shadow-none">
												<CardContent className="p-4 gap-5 flex items-center justify-between">
													<div className="flex flex-col gap-3 items-start justify-start max-w-[80%]">
														<h3 className="text-xl flex gap-3 items-center">
															<BotMessageSquare className="w-10 h-10 text-brand-yellow rounded-full p-2 bg-white" />
															{t('search.chatWith')}<span className="font-bold">{result.agent_name}</span>
														</h3>
														<h1>
															<b>{result.author === "ai" ? result.agent_name : t('search.you')}</b> {t('search.said')}
														</h1>
														<div
															className="text-lg pl-3 py-2 px-5 bg-white/60"
															style={{ borderLeft: '5px solid #eaeaea', borderRadius: '0 10px 10px 0' }}
														>
															{truncate(result.message, 200)}
														</div>
													</div>
													<div
														className="w-[65px] h-[65px] p-3 mx-5 rounded-full bg-brand-yellow cursor-pointer flex items-center justify-center shadow-md "
														style={{ border: '1px solid #e2e8f0' }}
														onClick={() => handleOpen(result)}
													>
														<MessageSquareShare
															className="w-[45px] h-[45x] text-white"
														/>
													</div>

												</CardContent>
											</Card>
										))}

									</div>
								</div>
							</div>

						)
					)}
				</div >
			</main >
		</>
	);
};

export default SearchPage;
