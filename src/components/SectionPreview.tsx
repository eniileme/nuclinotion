'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X, FileText } from 'lucide-react';
import { Section } from '@/lib/types';

interface SectionPreviewProps {
  sections: Section[];
  onRename: (sectionId: string, newLabel: string) => void;
  onRepackage: () => void;
  isRepackaging: boolean;
}

export function SectionPreview({ 
  sections, 
  onRename, 
  onRepackage, 
  isRepackaging 
}: SectionPreviewProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEditStart = (section: Section) => {
    setEditingSection(section.id);
    setEditValue(section.label);
  };

  const handleEditSave = () => {
    if (editingSection && editValue.trim()) {
      onRename(editingSection, editValue.trim());
      setEditingSection(null);
      setEditValue('');
    }
  };

  const handleEditCancel = () => {
    setEditingSection(null);
    setEditValue('');
  };

  const totalNotes = sections.reduce((sum, section) => sum + section.notes.length, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Processing Results</CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {sections.length} sections created with {totalNotes} total notes
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <Card key={section.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    {editingSection === section.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-sm font-medium"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave();
                            if (e.key === 'Escape') handleEditCancel();
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEditSave}
                          className="h-6 w-6 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEditCancel}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-sm font-medium truncate">
                          {section.label}
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditStart(section)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <FileText className="h-3 w-3" />
                      <span>{section.notes.length} notes</span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <div className="font-medium mb-1">Sample notes:</div>
                      <div className="space-y-1">
                        {section.notes.slice(0, 3).map((note, index) => (
                          <div key={index} className="truncate">
                            {note.title}
                          </div>
                        ))}
                        {section.notes.length > 3 && (
                          <div className="text-gray-400">
                            +{section.notes.length - 3} more...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {sections.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Ready to download?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your notes have been organized into {sections.length} sections. 
                  You can rename sections above if needed.
                </p>
              </div>
              <Button
                onClick={onRepackage}
                disabled={isRepackaging}
                className="flex items-center gap-2"
              >
                {isRepackaging ? 'Repackaging...' : 'Apply Changes & Download'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
