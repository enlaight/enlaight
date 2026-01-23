import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAgentsChat } from "@/contexts/AgentsChatContext";
import { useStore } from "@/store/useStore";
import { BookHeart, Heart, HeartOff, MessageCircleHeart, MessageSquareShare, X } from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FavoritesService } from "@/services/FavoritesService";

const Favorites = () => {
	const { t } = useTranslation();
	const [searchItems, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const { agents, favorites, update } = useStore() as any;
	const navigate = useNavigate();
	const { openModal: openAgentChat } = useAgentsChat();

	useEffect(() => {
		// Fetch favorites from API if not in store
		const fetchFavorites = async () => {
			if (favorites.length > 0) return;
			try {
				const favs = await FavoritesService.get();
				update("favorites", favs);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		fetchFavorites();
	}, []);

	useEffect(() => {
		try {
			const agentMap = new Map(agents.map(agent => [agent.id, agent.name]));
			const items = favorites.map(item => {
				const agentName = agentMap.get(item.agent) || "Assistant";
				if (!item.agent) return;
				return {
					...item,
					agent_name: agentName
				};
			});
			setItems(items);
		} catch (err) {
			console.error(err);
			setItems([]);
		}
		setLoading(false);
	}, [favorites, agents]);


	const truncate = (text, len) => {
		if (text.length > len) {
			return text.slice(0, len) + '...';
		}
		return text;
	}

	const handleOpen = (item) => {
		openAgentChat(item.agent, item.session, item.text);
		navigate("/");
	}

	const deleteFavorite = (item) => {
		const deleteAsync = async () => {
			try {
				const success = await FavoritesService.delete(item.message_id);
				if (success) {
					const updatedFavorites = favorites.filter(fav => fav.message_id !== item.message_id);
					update("favorites", updatedFavorites);
				}
			} catch (err) {
				console.error(err);
			}
		};
		deleteAsync();
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
								<MessageCircleHeart className="h-6 w-6 text-primary" />
								{t('favorites.title')}
							</h1>
							<p className="text-muted-foreground text-sm">
								{t('favorites.description')}
							</p>
						</div>
					</div>
					{loading && (
						<div className="h-full flex justify-center items-start pt-[8rem] pb-[3rem] relative">
							<LoadingAnimation
								icon={<MessageCircleHeart className="h-[100px] w-[100px] text-primary" />}
								text={<span>{t('favorites.loading')}</span>}
							/>
						</div>
					)}
					{!loading && (
						searchItems.length === 0 ? (
							<div className="flex align-center justify-center mb-5 w-full h-[80%]">
								<div className="flex flex-col align-center justify-center gap-5 text-center space-y-4">
									<div className="mx-auto w-24 h-24 bg-[#EAEAEA] rounded-full flex items-center justify-center">
										<HeartOff className="h-12 w-12 text-muted-foreground" />
									</div>
									<div className="space-y-2">
										<h3 className="text-xl font-semibold">
											{t('favorites.noFavoritesTitle')}
										</h3>
										<p className="text-muted-foreground max-w-md mx-auto">
											{t('favorites.noFavoritesDescription')}
										</p>
									</div>
								</div>
							</div>
						) : (
							<div className="py-12">
								<div className="flex align-center justify-start gap-3 text-center mb-5">
									<BookHeart className="h-6 w-6 text-muted-foreground" />
									<h3 className="max-w-[80%] text-md mt-0">
										{t('favorites.messagesFound', { count: searchItems.length })}
									</h3>
								</div>
								<div className="rounded-md">
									<div className="grid gap-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent rounded-lg">
										{searchItems.map((item, index) => {
											if (!item) return;
											return (
												<Card key={index} className="duration-200 bg-white/30 hover:bg-white/50 shadow-none">
													<CardContent className="p-4 gap-5 flex items-center justify-between relative">
														<div className="flex flex-col gap-3 items-start justify-start max-w-[80%]">
															<h3 className="text-xl flex gap-3 items-center">
																<Heart className="w-10 h-10 text-brand-yellow rounded-full p-2 bg-white" />
																<span className="font-bold">{item?.agent_name || "Assistant"}</span>
															</h3>
															<div
																className="text-lg pl-3 py-2 px-5 bg-white/60"
																style={{ borderLeft: '5px solid #eaeaea', borderRadius: '0 10px 10px 0' }}
															>
																{truncate(item?.text, 200)}
															</div>

														</div>
														<div className="flex flex-col gap-3">
															<div
																className="w-[65px] h-[65px] p-3 mx-5 rounded-full bg-primary cursor-pointer flex items-center justify-center shadow-md hover:bg-primary/90"
																style={{ border: '1px solid #e2e8f0' }}
																onClick={() => handleOpen(item)}
															>
																<MessageSquareShare
																	className="w-[45px] h-[45x] text-white"
																/>
															</div>
														</div>
														<div className="flex gap-3 items-center text-sm p-1 bg-black/10 rounded-[5px] cursor-pointer absolute right-[10px] top-[10px] hover:bg-destructive/10 hover:text-destructive"
															onClick={() => deleteFavorite(item)}
														>
															<X className="w-3 h-3" />
														</div>
													</CardContent>
												</Card>
											)
										})}

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

export default Favorites;
