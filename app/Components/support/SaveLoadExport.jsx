'use client';

import React, { useState } from 'react';
import { Button, Modal, Input, message, Dropdown, Tooltip } from 'antd';
import { 
  SaveOutlined, 
  FolderOpenOutlined, 
  ExportOutlined, 
  CopyOutlined,
  DownloadOutlined,
  FileTextOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import { renderToStaticMarkup } from 'react-dom/server';
import pako from 'pako';
import copy from 'copy-to-clipboard';

const SaveLoadExport = () => {
  const { actions, query } = useEditor();
  
  // State for modals
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  
  // State for inputs
  const [saveData, setSaveData] = useState('');
  const [loadData, setLoadData] = useState('');
  const [projectName, setProjectName] = useState('my-website');

  // Compression functions
  const compressData = (jsonString) => {
    try {
      const compressed = pako.deflate(jsonString);
      return btoa(String.fromCharCode.apply(null, compressed));
    } catch (error) {
      console.error('Compression error:', error);
      throw new Error('Failed to compress data');
    }
  };

  const decompressData = (compressedString) => {
    try {
      const binaryString = atob(compressedString);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decompressed = pako.inflate(bytes, { to: 'string' });
      return decompressed;
    } catch (error) {
      console.error('Decompression error:', error);
      throw new Error('Failed to decompress data - invalid format');
    }
  };

  // Save functionality
  const handleSave = () => {
    try {
      const serialized = query.serialize();
      const compressed = compressData(serialized);
      setSaveData(compressed);
      setSaveModalVisible(true);
    } catch (error) {
      message.error('Failed to save: ' + error.message);
    }
  };

  const copyToClipboard = () => {
    copy(saveData);
    message.success('Saved state copied to clipboard!');
    setSaveModalVisible(false);
  };

  const downloadSaveFile = () => {
    const blob = new Blob([saveData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-save.glow`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('Save file downloaded!');
    setSaveModalVisible(false);
  };

  // Load functionality
  const handleLoad = () => {
    setLoadData('');
    setLoadModalVisible(true);
  };

  const loadFromData = () => {
    try {
      if (!loadData.trim()) {
        message.error('Please paste the save data');
        return;
      }
      
      const decompressed = decompressData(loadData.trim());
      actions.deserialize(decompressed);
      message.success('Project loaded successfully!');
      setLoadModalVisible(false);
      setLoadData('');
    } catch (error) {
      message.error('Failed to load: ' + error.message);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLoadData(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Generate Next.js app export with Craft.js read-only rendering
  const generateNextJSExport = () => {
    try {
      const serialized = query.serialize();
      const nodes = JSON.parse(serialized);
      
      // For this implementation, we'll assume a single page for now
      // In a real multi-page app, you'd have multiple serialized states for different pages
      const pages = {
        'index': { nodes, name: 'Home' },
        // Future pages would be added here: 'shop', 'about', etc.
      };

      const files = {};

      // Generate package.json
      files['package.json'] = JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint'
        },
        dependencies: {
          '@craftjs/core': '^0.2.12',
          'next': '^14.0.0',
          'react': '^18.0.0',
          'react-dom': '^18.0.0',
          'styled-components': '^6.1.19'
        },
        devDependencies: {
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          'eslint': '^8',
          'eslint-config-next': '14.0.0',
          'typescript': '^5'
        }
      }, null, 2);

      // Generate next.config.js
      files['next.config.js'] = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true
  },
  compiler: {
    styledComponents: true
  }
};

module.exports = nextConfig;`;

      // Generate components for Craft.js
      files['components/craft/Text.jsx'] = `'use client';
import React from 'react';

export const Text = ({ text, fontSize, fontWeight, color, textAlign, ...props }) => {
  return (
    <span 
      style={{ 
        fontSize: fontSize ? \`\${fontSize}px\` : undefined,
        fontWeight,
        color,
        textAlign,
        ...props 
      }}
    >
      {text || 'Text'}
    </span>
  );
};`;

      files['components/craft/Paragraph.jsx'] = `'use client';
import React from 'react';

export const Paragraph = ({ content, text, fontSize, fontWeight, color, textAlign, ...props }) => {
  const textContent = content || text || 'Paragraph';
  
  if (typeof textContent === 'string' && textContent.includes('<')) {
    return (
      <div 
        style={{ 
          fontSize: fontSize ? \`\${fontSize}px\` : undefined,
          fontWeight,
          color,
          textAlign,
          ...props 
        }}
        dangerouslySetInnerHTML={{ __html: textContent }}
      />
    );
  }
  
  return (
    <p 
      style={{ 
        fontSize: fontSize ? \`\${fontSize}px\` : undefined,
        fontWeight,
        color,
        textAlign,
        ...props 
      }}
    >
      {textContent}
    </p>
  );
};`;

      files['components/craft/Button.jsx'] = `'use client';
import React from 'react';

export const Button = ({ text, children, onClick, ...props }) => {
  return (
    <button 
      style={props}
      onClick={onClick}
    >
      {text || children || 'Button'}
    </button>
  );
};`;

      files['components/craft/Image.jsx'] = `'use client';
import React from 'react';

export const Image = ({ src, alt, width, height, ...props }) => {
  return (
    <img 
      src={src || '/placeholder.jpg'}
      alt={alt || ''}
      style={{ width, height, ...props }}
    />
  );
};`;

      files['components/craft/Link.jsx'] = `'use client';
import React from 'react';

export const Link = ({ href, text, children, target, ...props }) => {
  return (
    <a 
      href={href || '#'}
      target={target}
      style={props}
    >
      {text || children || 'Link'}
    </a>
  );
};`;

      files['components/craft/Video.jsx'] = `'use client';
import React from 'react';

export const Video = ({ src, controls = true, width, height, ...props }) => {
  return (
    <video 
      controls={controls}
      style={{ width, height, ...props }}
    >
      <source src={src || ''} />
      Your browser does not support the video tag.
    </video>
  );
};`;

      files['components/craft/Input.jsx'] = `'use client';
import React from 'react';

export const Input = ({ type = 'text', placeholder, value, ...props }) => {
  return (
    <input 
      type={type}
      placeholder={placeholder}
      defaultValue={value}
      style={props}
    />
  );
};`;

      files['components/craft/TextArea.jsx'] = `'use client';
import React from 'react';

export const TextArea = ({ placeholder, value, rows = 4, ...props }) => {
  return (
    <textarea 
      placeholder={placeholder}
      defaultValue={value}
      rows={rows}
      style={props}
    />
  );
};`;

      files['components/craft/Box.jsx'] = `'use client';
import React from 'react';

export const Box = ({ children, ...props }) => {
  return <div style={props}>{children}</div>;
};`;

      files['components/craft/FlexBox.jsx'] = `'use client';
import React from 'react';

export const FlexBox = ({ 
  children, 
  flexDirection = 'row', 
  justifyContent, 
  alignItems, 
  gap, 
  ...props 
}) => {
  return (
    <div 
      style={{ 
        display: 'flex',
        flexDirection,
        justifyContent,
        alignItems,
        gap: gap ? \`\${gap}px\` : undefined,
        ...props 
      }}
    >
      {children}
    </div>
  );
};`;

      files['components/craft/GridBox.jsx'] = `'use client';
import React from 'react';

export const GridBox = ({ 
  children, 
  gridTemplateColumns, 
  gap, 
  ...props 
}) => {
  return (
    <div 
      style={{ 
        display: 'grid',
        gridTemplateColumns: gridTemplateColumns || 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: gap ? \`\${gap}px\` : undefined,
        ...props 
      }}
    >
      {children}
    </div>
  );
};`;

      files['components/craft/Form.jsx'] = `'use client';
import React from 'react';

export const Form = ({ children, onSubmit, ...props }) => {
  return (
    <form style={props} onSubmit={onSubmit}>
      {children}
    </form>
  );
};`;

      files['components/craft/Carousel.jsx'] = `'use client';
import React from 'react';

export const Carousel = ({ children, ...props }) => {
  return (
    <div className="carousel" style={props}>
      {children}
    </div>
  );
};`;

      files['components/craft/ShopFlexBox.jsx'] = `'use client';
import React from 'react';

export const ShopFlexBox = ({ children, ...props }) => {
  return (
    <div 
      className="shop-container" 
      style={{ display: 'flex', ...props }}
    >
      {children}
    </div>
  );
};`;

      // Generate component mapping
      files['components/craft/index.js'] = `export { Text } from './Text';
export { Paragraph } from './Paragraph';
export { Button } from './Button';
export { Image } from './Image';
export { Link } from './Link';
export { Video } from './Video';
export { Input } from './Input';
export { TextArea } from './TextArea';
export { Box } from './Box';
export { FlexBox } from './FlexBox';
export { GridBox } from './GridBox';
export { Form } from './Form';
export { Carousel } from './Carousel';
export { ShopFlexBox } from './ShopFlexBox';`;

      // Generate CraftRenderer component
      files['components/CraftRenderer.jsx'] = `'use client';
import React from 'react';
import { Frame, Element, useEditor } from '@craftjs/core';
import * as CraftComponents from './craft';

// Component resolver for Craft.js
const componentMap = {
  Text: CraftComponents.Text,
  Paragraph: CraftComponents.Paragraph,
  Button: CraftComponents.Button,
  Image: CraftComponents.Image,
  Link: CraftComponents.Link,
  Video: CraftComponents.Video,
  Input: CraftComponents.Input,
  TextArea: CraftComponents.TextArea,
  Box: CraftComponents.Box,
  FlexBox: CraftComponents.FlexBox,
  GridBox: CraftComponents.GridBox,
  Form: CraftComponents.Form,
  Carousel: CraftComponents.Carousel,
  ShopFlexBox: CraftComponents.ShopFlexBox
};

export const CraftRenderer = ({ serializedNodes }) => {
  return (
    <div className="craft-renderer">
      <Frame data={serializedNodes}>
        <Element 
          is="div" 
          id="root"
          canvas
        />
      </Frame>
    </div>
  );
};

// Make components available to Craft.js
CraftRenderer.craft = {
  resolver: componentMap
};`;

      // Generate app layout
      files['app/layout.js'] = `import './globals.css';

export const metadata = {
  title: '${projectName}',
  description: 'Generated with Glow - Visual Website Builder',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

      // Generate global CSS
      files['app/globals.css'] = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #fff;
}

/* Interactive elements */
button {
  cursor: pointer;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 16px;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
  outline: none;
}

button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

input, textarea {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 14px;
  color: #374151;
  background: #ffffff;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  outline: none;
}

input:focus, textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

a {
  color: #3b82f6;
  text-decoration: none;
  transition: color 0.2s ease-in-out;
}

a:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* Carousel styles */
.carousel {
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Shop container styles */
.shop-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

/* Responsive design */
@media (max-width: 768px) {
  body {
    font-size: 14px;
  }
  
  button {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  input, textarea {
    padding: 6px 10px;
    font-size: 13px;
  }
}`;

      // Generate pages for each route
      Object.entries(pages).forEach(([pageKey, pageData]) => {
        const pageName = pageKey === 'index' ? '' : pageKey;
        const fileName = pageName ? \`app/\${pageName}/page.js\` : 'app/page.js';
        
        files[fileName] = \`'use client';
import React from 'react';
import { Editor } from '@craftjs/core';
import { CraftRenderer } from '../components/CraftRenderer';
import * as CraftComponents from '../components/craft';

// Serialized page data
const pageData = \${JSON.stringify(pageData.nodes, null, 2)};

export default function \${pageData.name.replace(/[^a-zA-Z0-9]/g, '')}Page() {
  return (
    <div className="page-container">
      <Editor
        resolver={CraftComponents}
        enabled={false} // Read-only mode
      >
        <CraftRenderer serializedNodes={JSON.stringify(pageData)} />
      </Editor>
    </div>
  );
}\`;
      });

      // Generate README
      files['README.md'] = \`# \${projectName}

This Next.js application was generated with **Glow - Visual Website Builder**.

## Getting Started

1. Install dependencies:
\\\`\\\`\\\`bash
npm install
\\\`\\\`\\\`

2. Run the development server:
\\\`\\\`\\\`bash
npm run dev
\\\`\\\`\\\`

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Pages

\${Object.entries(pages).map(([key, data]) => \`- **\${data.name}**: /\${key === 'index' ? '' : key}\`).join('\\n')}

## Built with

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Craft.js](https://craft.js.org/)
- [Glow Visual Website Builder](https://github.com/yourusername/glow)

## Features

- Server-side rendering with Next.js
- Read-only Craft.js rendering for perfect fidelity
- Responsive design
- Modern styling and interactions

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
\`;

      return files;
    } catch (error) {
      console.error('Next.js export error:', error);
      throw new Error('Failed to generate Next.js export: ' + error.message);
    }
  };

  // Create and download Next.js project as zip file
  const downloadNextJSProject = async (files) => {
    try {
      // Check if JSZip is available
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add all files to zip
      Object.entries(files).forEach(([filePath, content]) => {
        zip.file(filePath, content);
      });

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download zip file
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}-nextjs-app.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success('Next.js project exported successfully!');
    } catch (error) {
      console.error('ZIP creation error:', error);
      message.error('Failed to create project zip: ' + error.message);
    }
  };

  const handleExport = async (type) => {
    try {
      if (type === 'nextjs') {
        const nextjsFiles = generateNextJSExport();
        await downloadNextJSProject(nextjsFiles);
      }
      setExportModalVisible(false);
    } catch (error) {
      message.error('Export failed: ' + error.message);
    }
  };

  // Export dropdown menu
  const exportMenuItems = [
    {
      key: 'nextjs',
      label: (
        <div className="flex items-center space-x-2">
          <CodeOutlined />
          <span>Export as Next.js App</span>
        </div>
      ),
      onClick: () => handleExport('nextjs')
    }
  ];

  return (
    <div className="flex items-center space-x-1">
      {/* Save Button */}
      <Tooltip title="Save current project">
        <Button
          icon={<SaveOutlined />}
          size="small"
          type="text"
          onClick={handleSave}
          className="hover:bg-green-50 hover:text-green-600 transition-colors"
        />
      </Tooltip>

      {/* Load Button */}
      <Tooltip title="Load saved project">
        <Button
          icon={<FolderOpenOutlined />}
          size="small"
          type="text"
          onClick={handleLoad}
          className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
        />
      </Tooltip>

      {/* Export Dropdown */}
      <Dropdown
        menu={{ items: exportMenuItems }}
        placement="bottomLeft"
        trigger={['click']}
      >
        <Tooltip title="Export project">
          <Button
            icon={<ExportOutlined />}
            size="small"
            type="text"
            className="hover:bg-purple-50 hover:text-purple-600 transition-colors"
          />
        </Tooltip>
      </Dropdown>

      {/* Save Modal */}
      <Modal
        title="Save Project"
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={copyToClipboard}>
            Copy to Clipboard
          </Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={downloadSaveFile}>
            Download File
          </Button>
        ]}
        width={600}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Project Name:</label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Save Data:</label>
          <Input.TextArea
            value={saveData}
            readOnly
            rows={6}
            placeholder="Your compressed save data will appear here..."
          />
          <p className="text-xs text-gray-500 mt-2">
            This compressed data contains your entire project. Save it to load your project later.
          </p>
        </div>
      </Modal>

      {/* Load Modal */}
      <Modal
        title="Load Project"
        open={loadModalVisible}
        onCancel={() => setLoadModalVisible(false)}
        onOk={loadFromData}
        okText="Load Project"
        width={600}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Upload Save File:</label>
          <input
            type="file"
            accept=".glow,.txt"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Or Paste Save Data:</label>
          <Input.TextArea
            value={loadData}
            onChange={(e) => setLoadData(e.target.value)}
            rows={6}
            placeholder="Paste your saved project data here..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Paste the compressed data from a previous save or upload a .glow file.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SaveLoadExport;
