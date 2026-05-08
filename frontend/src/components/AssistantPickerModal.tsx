import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAgents } from '@/hooks/use-agents';
import type { Bot } from '@/types/bots';

interface AssistantPickerModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (agentId: string) => void;
}

export const AssistantPickerModal: React.FC<AssistantPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
	const { agents } = useAgents();

	const handleSelect = (agentId: string) => {
		onSelect(agentId);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md max-h-[80vh] bg-background border border-border">
				<DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
					<DialogTitle className="text-xl font-semibold text-foreground">Choose an assistant</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '50vh' }}>
					{agents.length === 0 && (
						<div className="text-sm text-muted-foreground py-4 text-center">No assistants available</div>
					)}
					{agents.map((agent: Bot) => (
						<button
							key={agent.id}
							onClick={() => handleSelect(agent.id)}
							className="flex items-center gap-3 p-3 rounded border border-border hover:bg-muted transition-colors text-left"
						>
							{agent.image && (
								<img
									src={agent.image}
									alt={agent.name}
									className="w-10 h-10 rounded-full object-cover flex-shrink-0"
								/>
							)}
							<div className="flex flex-col min-w-0">
								<div className="font-medium text-foreground truncate">{agent.name}</div>
								{agent.description && (
									<div className="text-xs text-muted-foreground line-clamp-2">{agent.description}</div>
								)}
							</div>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
};
