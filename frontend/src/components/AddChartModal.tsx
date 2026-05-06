import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useTranslation } from 'react-i18next';

interface AddChartModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: any) => void;
}

export const AddChartModal: React.FC<AddChartModalProps> = ({ isOpen, onClose, onSave, projectName }) => {
	const { t } = useTranslation();
	const [title, setTitle] = useState('');
	const [subtitle, setSubtitle] = useState('');
	const [n8n, setN8n] = useState('');
	const [html, setHTML] = useState('');

	const [errorMessage, setErrorMessage] = useState('');

	const errorObligatory = t('dashboard.errorObligatory');
	const errorHTML = t('dashboard.errorHTML');

	const handleSave = () => {
		if ((!title) || (!n8n && !html)) {
			return setErrorMessage(errorObligatory);
		}

		if (html !== '') {
			if (typeof html !== 'string') return setErrorMessage(errorHTML);

			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			const parserError = doc.querySelector('parsererror');
			if (parserError) return setErrorMessage(errorHTML);

			const validHTML = doc.body.childNodes.length > 0;
			if (!validHTML) return setErrorMessage(errorHTML);
		}

		onSave({ title, subtitle, n8n, html });
		setErrorMessage('');
		onClose();
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[80vh] bg-background border border-border">
				<DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
					<DialogTitle className="text-xl font-semibold text-foreground">{t('dashboard.addNewChart')}</DialogTitle>
				</DialogHeader>

				<div className="flex" style={{ flexDirection: 'column', gap: 5, marginBottom: 10 }}>
					<h3>{t('dashboard.boardProject')}<span style={{ color: 'red', marginLeft: 2 }}>*</span></h3>
					<Input placeholder={projectName} disabled />
				</div>

				<div className="flex w-full" style={{ gap: 20 }}>
					<div className="flex w-full" style={{ flexDirection: 'column', gap: 5, marginBottom: 10 }}>
						<h3>{t('dashboard.chartTitle')}<span style={{ color: 'red', marginLeft: 2 }}>*</span></h3>
						<Input onChange={(e) => setTitle(e.target.value)} />
					</div>

					<div className="flex w-full" style={{ flexDirection: 'column', gap: 5, marginBottom: 10 }}>
						<h3>{t('dashboard.chartSubtitle')}</h3>
						<Input onChange={(e) => setSubtitle(e.target.value)} />
					</div>
				</div>

				<div className="flex" style={{ flexDirection: 'column', gap: 5, marginBottom: 10 }}>
					<h3>{t('dashboard.n8nURL')}<span style={{ color: 'grey', marginLeft: 2 }}>*</span></h3>
					<Input placeholder={t('dashboard.n8nURL')} onChange={(e) => setN8n(e.target.value)} />
				</div>

				<div className="flex" style={{ flexDirection: 'column', gap: 5, marginBottom: 10 }}>
					<h3>{t('dashboard.htmlCode')}<span style={{ color: 'grey', marginLeft: 2 }}>*</span></h3>
					<Textarea placeholder={t('dashboard.htmlCode')} onChange={(e) => setHTML(e.target.value)} />
				</div>

				<div className="flex items-center" style={{ justifyContent: 'flex-end', gap: 15 }}>
					{errorMessage && (
						<div style={{ fontSize: 12, color: 'red' }}>{errorMessage}</div>
					)}
					<Button variant='secondary' onClick={() => { onClose(); }}>{t('dashboard.cancel')}</Button>
					<Button onClick={handleSave}>{t('dashboard.addChart')}</Button>
				</div>
			</DialogContent>
		</Dialog >
	);
};
