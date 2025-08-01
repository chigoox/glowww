'use client'

import React, { useState } from 'react';
import { useEditor } from "@craftjs/core";
import { Layers, useLayer, DefaultLayerHeader, EditableLayerName } from "@craftjs/layers";
import { 
  DownOutlined,
  RightOutlined,
  DeleteOutlined,
  EditOutlined,
  DragOutlined,
  FileOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { Button, Input, Typography, Tooltip, Space } from 'antd';

const { Text } = Typography;

// Component icon mapping
const getComponentIcon = (componentType) => {
  const iconMap = {
    'Box': '📦',
    'FlexBox': '📐',
    'GridBox': '⚏',
    'Text': '📝',
    'Image': '🖼️',
    'Button': '🔘',
    'Link': '🔗',
    'Video': '🎥',
    'TextArea': '📄',
    'Paragraph': '📖',
    'ShopFlexBox': '🛍️',
    'FormInput': '📝',
    'ROOT': '🏠'
  };
  return iconMap[componentType] || '🔧';
};

// Custom Layer Header Component
// Custom Layer Header Component
const CustomLayerHeader = () => {
  const {
    id,
    depth,
    expanded,
    layer,
    connectors,
    actions
  } = useLayer((layer) => ({
    expanded: layer.expanded
  }));

  const { node, isSelected, isHovered } = useEditor((state) => {
    const node = state.nodes[id];
    
    // Check if this layer is selected
    let isNodeSelected = false;
    const selected = state.events.selected;
    
    if (selected) {
      if (typeof selected === 'string') {
        isNodeSelected = selected === id;
      } else if (selected.has && typeof selected.has === 'function') {
        isNodeSelected = selected.has(id);
      } else if (Array.isArray(selected)) {
        isNodeSelected = selected.includes(id);
      }
    }

    return {
      node,
      isSelected: isNodeSelected,
      isHovered: state.events.hovered === id
    };
  });

  const { actions: editorActions } = useEditor();

  if (!node) return null;

  const componentType = node.data.type || node.data.name;
  const nodeName = node.data.custom?.displayName || 
                   node.data.displayName || 
                   componentType || 
                   'Unknown';

  const hasChildren = node.data.nodes && node.data.nodes.length > 0;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (id !== 'ROOT') {
      editorActions.delete(id);
    }
  };

  const handleSelect = () => {
    editorActions.selectNode(id);
  };

  return (
    <div
      ref={(ref) => {
        if (ref && connectors?.layerHeader && connectors?.drag) {
          return connectors.layerHeader(connectors.drag(ref, id), id);
        }
        return ref;
      }}
      className={`
        flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 transition-colors
        ${isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : ''}
        ${isHovered ? 'bg-gray-50' : ''}
      `}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={handleSelect}
    >
      {/* Expand/Collapse Button */}
      <div className="w-4 h-4 flex items-center justify-center mr-1">
        {hasChildren && (
          <Button
            type="text"
            size="small"
            className="!p-0 !w-4 !h-4 !min-w-0 hover:bg-gray-200"
            icon={expanded ? <DownOutlined /> : <RightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              if (actions?.toggleLayer) {
                actions.toggleLayer();
              }
            }}
          />
        )}
      </div>

      {/* Component Icon */}
      <span className="mr-2 text-sm text-gray-500">
        {hasChildren ? 
          (expanded ? <FolderOpenOutlined /> : <FolderOutlined />) : 
          <FileOutlined />
        }
      </span>

      {/* Component Type Icon */}
      <span className="mr-2">{getComponentIcon(componentType)}</span>

      {/* Drag Handle */}
      <span className="mr-2 text-gray-400 cursor-move text-xs">
        <DragOutlined />
      </span>

      {/* Editable Name */}
      <div className="flex-1 min-w-0">
        <EditableLayerName
          style={{
            fontSize: '12px',
            color: '#374151',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            width: '100%'
          }}
        />
      </div>

      {/* Actions */}
      {isSelected && (
        <Space size="small" className="ml-2">
          {id !== 'ROOT' && (
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                className="!p-0 !w-4 !h-4 !min-w-0 !text-red-500 hover:bg-red-50"
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              />
            </Tooltip>
          )}
        </Space>
      )}
    </div>
  );
};


// Custom Layer Component
const CustomLayer = ({ children }) => {
  const {
    id,
    expanded,
    connectors
  } = useLayer((layer) => ({
    expanded: layer.expanded
  }));

  return (
    <div ref={(ref) => ref && connectors?.layer && connectors.layer(ref, id)}>
      <CustomLayerHeader />
      {expanded && children}
    </div>
  );
};

// Main Layers Panel Component
export const EditorLayers = ({ expandRootOnLoad = true }) => {
  const { nodes } = useEditor((state) => ({
    nodes: state.nodes
  }));

  const [searchTerm, setSearchTerm] = useState('');

  // Check if we have any nodes
  if (!nodes || Object.keys(nodes).length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FileOutlined className="text-2xl mb-2" />
        <div className="text-sm">No layers available</div>
        <div className="text-xs mt-1">Add components to see the layer structure</div>
      </div>
    );
  }

  return (
    <div className=" max-h-[45rem] border shadow rounded h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <Text strong className="text-sm">Layers</Text>
          <Text className="text-xs text-gray-500">
            {Object.keys(nodes).length} items
          </Text>
        </div>
        
        {/* Search */}
        <Input
          size="small"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          className="text-xs"
        />
      </div>

      {/* Layers Tree */}
      <div className="flex-1 overflow-y-auto">
        <Layers
          expandRootOnLoad={expandRootOnLoad}
          renderLayer={CustomLayer}
        />
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <Text className="text-xs text-gray-500">
          💡 Click to select • Drag to reorder • Double-click to rename
        </Text>
      </div>
    </div>
  );
};

// Export default for easier importing
export default EditorLayers;