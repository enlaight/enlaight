import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useTranslation } from 'react-i18next';
import type { Project } from '@/types/projects';

interface AddBoardModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (projectId: string) => void;
	availableProjects: Project[];
}

export const AddBoardModal: React.FC<AddBoardModalProps> = ({ isOpen, onClose, onSave, availableProjects }) => {
	const { t } = useTranslation();
	const [projectId, setProjectId] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	const handleSave = () => {
		if (!projectId) {
			return setErrorMessage(t('dashboard.boardProjectRequired'));
		}
		onSave(projectId);
		setProjectId('');
		setErrorMessage('');
		onClose();
	};

	const handleClose = () => {
		setProjectId('');
		setErrorMessage('');
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-lg bg-background border border-border">
				<DialogHeader className="pb-4 border-b border-border">
					<DialogTitle className="text-xl font-semibold text-foreground">{t('dashboard.addNewBoard')}</DialogTitle>
				</DialogHeader>

				<div className="flex" style={{ flexDirection: 'column', gap: 5, marginBottom: 10 }}>
					<h3>{t('dashboard.boardProject')}<span style={{ color: 'red', marginLeft: 2 }}>*</span></h3>
					<Select value={projectId} onValueChange={setProjectId}>
						<SelectTrigger>
							<SelectValue placeholder={t('dashboard.selectProject')} />
						</SelectTrigger>
						<SelectContent>
							{availableProjects.length === 0 ? (
								<div className="px-2 py-1.5 text-sm text-muted-foreground">{t('dashboard.noAvailableProjects')}</div>
							) : (
								availableProjects.map((p) => (
									<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center" style={{ justifyContent: 'flex-end', gap: 15 }}>
					{errorMessage && <div style={{ fontSize: 12, color: 'red' }}>{errorMessage}</div>}
					<Button variant='secondary' onClick={handleClose}>{t('dashboard.cancel')}</Button>
					<Button onClick={handleSave} disabled={availableProjects.length === 0}>{t('dashboard.createBoard')}</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
