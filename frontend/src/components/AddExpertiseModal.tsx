import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { X } from 'lucide-react';

interface AddExpertiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expertise: { name: string; description: string }) => void;
}

export const AddExpertiseModal: React.FC<AddExpertiseModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      return;
    }

    onSave({
      name: formData.name.trim(),
      description: formData.description.trim()
    });

    // Reset form
    setFormData({ name: '', description: '' });
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border border-border z-[60]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Add New Expertise
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expertise-name">Expertise Area Name *</Label>
            <Input
              id="expertise-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Legal Assistant, Medical Support"
              className="bg-background border-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expertise-description">Description (Optional)</Label>
            <Textarea
              id="expertise-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this expertise area"
              className="bg-background border-input min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Save Expertise
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
