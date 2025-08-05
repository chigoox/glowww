'use client';

import React, { useState } from 'react';
import { Layers } from '@craftjs/layers';

/**
 * EditorLayers component for rendering the Craft.js Layers panel
 * with enhanced UI and functionality
 */
const EditorLayers = () => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="editor-layers bg-white rounded-lg shadow-lg h-full overflow-hidden flex flex-col">
      <div className="p-3 border-b flex justify-between items-center">
        <h3 className="text-lg font-bold">Layers</h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
        >
          {expanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      
      <div className="flex-grow overflow-auto p-2">
        <Layers expandRootOnLoad={expanded} />
      </div>
      
      <div className="p-2 text-xs text-gray-500 border-t">
        Drag to reorder • Click to select
      </div>
    </div>
  );
};

export default EditorLayers;
