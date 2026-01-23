import { MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const SessionHistoryItem = ({ session, handleSession, handleEditSession, deleteSession, darkmode = false }) => {
	const [open, setOpen] = useState(false);

	const hoverColor = darkmode ? 'sidebar-accent' : '[#E9E9E9]';
	const borderColor = darkmode ? '#374151' : 'border';
	const textColor = darkmode ? 'white' : '[#8C8C8C]';
	return (
		<div className={`flex w-full items-center relative px-2 py-1.5 rounded-lg cursor-pointer opacity-[0.9] hover:bg-${hoverColor}`}
			onClick={handleSession}
		>
			<div className="flex items-start gap-3 flex-1 min-w-0 justify-between">
				<div>
					<span className={`text-base font-medium leading-5 relative max-sm:text-sm transition-colors break-words hyphens-auto whitespace-normal text-left block min-w-0 text-${textColor}`}>{session.data}</span>
					<span className={`text-[13px] font-medium leading-5 relative max-sm:text-sm transition-colors break-words hyphens-auto whitespace-normal text-left block min-w-0 text-${textColor} opacity-[0.6]`}>{session.agent_name}</span>
				</div>
				<DropdownMenu open={open} onOpenChange={setOpen}>
					<DropdownMenuTrigger asChild>
						<MoreHorizontal className={`text-${textColor}`} onClick={() => { handleEditSession(); setOpen(!open); }} />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="center" className={`min-w-[110px] w-[110px] ${darkmode && "bg-sidebar-accent"} border border-${borderColor}`}
						style={{ borderColor }}
					>
						<DropdownMenuItem
							onClick={(e) => { deleteSession(e, session); setOpen(!open) }}
							className={`text-destructive focus:font-medium focus:text-[#CE0000] ${darkmode && "bg-sidebar-accent hover:bg-neutral-800 focus:bg-neutral-800 active:bg-neutral-800"}`}
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	)
};

export default SessionHistoryItem;
