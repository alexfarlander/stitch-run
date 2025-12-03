/**
 * Test page for MediaPicker component
 */

'use client';

import * as React from 'react';
import { MediaPicker } from '@/components/media/MediaPicker';
import type { StitchMedia } from '@/types/media';
import { Card } from '@/components/ui/card';

export default function TestMediaPickerPage() {
  const [selectedSingle, setSelectedSingle] = React.useState<StitchMedia[]>([]);
  const [selectedMultiple, setSelectedMultiple] = React.useState<StitchMedia[]>([]);
  const [selectedFiltered, setSelectedFiltered] = React.useState<StitchMedia[]>([]);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-8 text-3xl font-bold">MediaPicker Component Test</h1>
      
      <div className="space-y-8">
        {/* Single Selection */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Single Selection Mode</h2>
          <MediaPicker
            allowMultiple={false}
            onSelect={setSelectedSingle}
          />
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium">Selected:</p>
            <pre className="mt-2 text-xs">
              {JSON.stringify(selectedSingle.map(m => ({ id: m.id, name: m.name })), null, 2)}
            </pre>
          </div>
        </Card>
        
        {/* Multiple Selection */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Multiple Selection Mode</h2>
          <MediaPicker
            allowMultiple={true}
            onSelect={setSelectedMultiple}
          />
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium">Selected:</p>
            <pre className="mt-2 text-xs">
              {JSON.stringify(selectedMultiple.map(m => ({ id: m.id, name: m.name })), null, 2)}
            </pre>
          </div>
        </Card>
        
        {/* Filtered by Type */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Filtered by Type (Wireframes Only)</h2>
          <MediaPicker
            mediaType="wireframe"
            allowMultiple={true}
            onSelect={setSelectedFiltered}
          />
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium">Selected:</p>
            <pre className="mt-2 text-xs">
              {JSON.stringify(selectedFiltered.map(m => ({ id: m.id, name: m.name, type: m.media_type })), null, 2)}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
