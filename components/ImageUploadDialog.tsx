'use client';

import React from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Upload } from 'lucide-react';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageUpload: (file: File) => void;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  onImageUpload
}: ImageUploadDialogProps) {
  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImageUpload(file);
      }
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white/95 backdrop-blur-md border-white/30 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">📸 Upload Image to Translate</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 transition-colors duration-200 hover:bg-purple-50/10"
            onClick={handleFileSelect}
          >
            <Upload className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2 font-medium">Click to upload an image</p>
            <p className="text-sm text-gray-500">Supports JPG, PNG, GIF, WebP (max 20MB)</p>
            <p className="text-xs text-gray-400 mt-2">AI-powered text extraction and translation</p>
          </div>
          
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}