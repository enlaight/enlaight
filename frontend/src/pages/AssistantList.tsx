import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bot, BotMessageSquare } from "lucide-react";
import { EnlaightBot } from "@/assets/svgs";
import { BotService } from "@/services/BotService";
import type { Bot as BotType } from "@/types/bots";
import { useBatchTranslation } from "@/hooks/use-batch-translation";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAgentsChat } from "@/contexts/AgentsChatContext";

const PAGE_SIZE = 10;

interface AssistantCardProps {
  bot: BotType;
  onChatClick: (botId: string) => void;
  getTranslation: (text: string) => string;
}

function AssistantCard({ bot, onChatClick, getTranslation }: AssistantCardProps) {
  const { t } = useTranslation();
  const translatedDescription = bot.description ? getTranslation(bot.description) : '';
  const translatedExpertiseName = bot.expertise_area?.name ? getTranslation(bot.expertise_area.name) : '';

  return (
    <div className="w-[32%] flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center space-x-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={bot.image} alt={bot.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {bot.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <h4 className="text-base font-semibold text-foreground">
            {bot.name}
          </h4>

          {bot.description && (
            <p className="w-[90%] text-sm text-muted-foreground line-clamp-3">
              {translatedDescription}
            </p>
          )}

          {bot.expertise_area && (
            <Badge variant="secondary" className="mt-1">
              {translatedExpertiseName}
            </Badge>
          )}
        </div>
      </div>

      <Button onClick={() => onChatClick(bot.id)} className="flex items-center gap-2 rounded-full">
        <BotMessageSquare className="h-4 w-4" />
        {t('listAssistants.chatWithAssistant')}
      </Button>
    </div>
  );
}

const AssistantList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { openModal: openAgentChat } = useAgentsChat();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [count, setCount] = useState(0);
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => setPage(1), [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch bots
        const botPage = await BotService.list({ page, page_size: PAGE_SIZE, search: debouncedSearch || undefined });

        if (!cancelled) {
          const results = Array.isArray(botPage?.results) ? botPage.results : [];
          const total = Number.isFinite(botPage?.count) ? botPage.count : results.length;
          setCount(total);
          setBots(results);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Error fetching assistants");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Collect all texts that need translation
  const textsToTranslate = useMemo(() => {
    const texts: string[] = [];
    bots.forEach(bot => {
      if (bot.description) texts.push(bot.description);
      if (bot.expertise_area?.name) texts.push(bot.expertise_area.name);
    });
    return texts;
  }, [bots]);

  // Get translations for all texts in one batch
  const { getTranslation } = useBatchTranslation(textsToTranslate, "assistants");

  const handleChatClick = (botId: string) => {
    openAgentChat(botId);
    navigate("/");
  };

  return (
    <>
      <main className="container mt-5"
        role="main"
        aria-label={t('listAssistants.title')}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <EnlaightBot size={24} className="text-primary" fill="currentColor" />
                {t('listAssistants.title')}
              </h1>
              <p className="text-gray-600 text-sm">{t('listAssistants.titleDesc')}</p>
            </div>
          </div>
        </div>
        <div className="space-y-6 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('listAssistants.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status */}
          {loading && (
            <div className="text-sm text-muted-foreground">
              {t('listAssistants.loading')}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600">Error: {error}</div>
          )}

          {/* List */}
          {!loading && !error && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('listAssistants.assistantsFound', { count })}
                </p>
              </div>

              <div className="flex flex-wrap justify-start gap-5 max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent rounded-lg">
                {bots.map((bot) => (
                  <AssistantCard
                    key={bot.id}
                    bot={bot}
                    onChatClick={handleChatClick}
                    getTranslation={getTranslation}
                  />
                ))}
              </div>

              {bots.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('listAssistants.noAssistantsFound')}</h3>
                  <p className="text-muted-foreground">{t('listAssistants.tryAdjusting')}</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {t('listAssistants.pageOf', { current: page, total: totalPages })}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('listUsers.previous')}</Button>
                <Button variant="default" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{t('listUsers.next')}</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default AssistantList;
