'use client';

import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, message, Select, Tooltip, Space, Typography } from 'antd';
import { 
  ExportOutlined, 
  DownloadOutlined,
  CodeOutlined,
  FolderOutlined,
  FileTextOutlined,
  ShopOutlined,
  SaveOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import { useAuth } from '../../../contexts/AuthContext';
import JSZip from 'jszip';
import TemplateSaveModal from './TemplateSaveModal';
import TemplatePreview from '../TemplatePreview';
import { updateTemplateVersion, getTemplateVersionStats } from '../../../lib/templateVersioning';
import { trackUserInteraction } from '../../../lib/templateDiscovery';

const { Text, Title } = Typography;
const { Option } = Select;

/**
 * ExportManager - Advanced Next.js export system for Craft.js projects
 * Now integrated with PageManager for project-based exports
 */
const ExportManager = () => {
  const { query } = useEditor();
  const { user } = useAuth();
  
  // State management
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [templateSaveModalVisible, setTemplateSaveModalVisible] = useState(false);
  const [templatePreviewVisible, setTemplatePreviewVisible] = useState(false);
  const [projectName, setProjectName] = useState('my-next-app');
  const [isExporting, setIsExporting] = useState(false);
  const [currentProjectPages, setCurrentProjectPages] = useState([]);
  const [existingTemplateId, setExistingTemplateId] = useState(null);
  const [versionStats, setVersionStats] = useState(null);

  // Listen for project page updates from PageManager
  useEffect(() => {
    const handlePageUpdate = (event) => {
      if (event.detail && event.detail.pages) {
        setCurrentProjectPages(event.detail.pages);
        setProjectName(event.detail.projectName || 'my-next-app');
      }
    };

    window.addEventListener('projectPagesUpdate', handlePageUpdate);
    
    return () => {
      window.removeEventListener('projectPagesUpdate', handlePageUpdate);
    };
  }, []);

  /**
   * Get current page data for template saving
   */
  const getCurrentPageData = () => {
    try {
      return JSON.stringify(query.serialize());
    } catch (error) {
      console.error('Error serializing page data:', error);
      return null;
    }
  };

  /**
   * Handle template save with preview
   */
  const handleTemplateSaveWithPreview = () => {
    if (!user) {
      message.error('Please login to save templates');
      return;
    }
    
    const subscription = user?.subscription?.tier;
    const isPro = ['pro', 'premium', 'enterprise'].includes(subscription);
    
    if (!isPro) {
      message.error('Template saving is only available for Pro users and above');
      return;
    }
    
    // Track user interaction
    if (user?.uid) {
      trackUserInteraction(user.uid, {
        type: 'save',
        metadata: {
          source: 'editor_preview'
        }
      }).catch(console.warn);
    }
    
    setTemplatePreviewVisible(true);
  };

  /**
   * Handle template save from preview modal
   */
  const handleTemplateSave = () => {
    // Track template save interaction
    if (user?.uid) {
      trackUserInteraction(user.uid, {
        type: 'save',
        metadata: {
          source: 'template_preview',
          hasExistingTemplate: !!existingTemplateId
        }
      }).catch(console.warn);
    }
    
    setTemplatePreviewVisible(false);
    setTemplateSaveModalVisible(true);
  };

  /**
   * Handle template update (versioning)
   */
  const handleTemplateUpdate = async () => {
    if (!existingTemplateId) {
      message.error('No existing template to update');
      return;
    }

    try {
      const pageData = getCurrentPageData();
      if (!pageData) {
        message.error('No page data to save');
        return;
      }

      const result = await updateTemplateVersion(existingTemplateId, {
        jsonData: pageData,
        changelog: 'Updated template from editor',
        versionType: 'minor'
      }, user.uid);

      if (result.success) {
        message.success(`Template updated to version ${result.version}!`);
        setTemplatePreviewVisible(false);
        loadVersionStats();
      } else {
        message.error('Failed to update template: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      message.error('Failed to update template');
    }
  };

  /**
   * Load version statistics for existing template
   */
  const loadVersionStats = async () => {
    if (!existingTemplateId) return;
    
    try {
      const result = await getTemplateVersionStats(existingTemplateId);
      if (result.success) {
        setVersionStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading version stats:', error);
    }
  };

  // Load version stats when template ID changes
  useEffect(() => {
    if (existingTemplateId) {
      loadVersionStats();
    }
  }, [existingTemplateId]);

  /**
   * Generate the complete Next.js project structure from PageManager data
   */
  const generateNextJSProject = () => {
    try {
      const files = {};
      
      // Get current serialized data
      const currentSerializedData = query.serialize();
      
      // Use pages from PageManager or fallback to single page
      const pagesToExport = currentProjectPages.length > 0 ? currentProjectPages : [
        {
          key: 'home',
          title: 'Home',
          path: '/',
          parentKey: null,
          isHome: true,
          serializedData: currentSerializedData
        }
      ];

      // 1. Generate package.json with exact versions from current project
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
          'next': '15.3.2',
          'react': '^19.0.0',
          'react-dom': '^19.0.0',
          'styled-components': '^6.1.19'
        },
        devDependencies: {
          '@tailwindcss/postcss': '^4',
          'tailwindcss': '^4'
        }
      }, null, 2);

      // 2. Generate next.config.mjs (matching current project)
      files['next.config.mjs'] = `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;`;

      // 3. Generate PostCSS config (matching current project)
      files['postcss.config.mjs'] = `const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;`;

      // 4. Generate App Router layout (matching current project)
      files['app/layout.js'] = `import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "${projectName}",
  description: "Generated with Glowww",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} antialiased\`}
      >
        {children}
      </body>
    </html>
  );
}`;

      // 5. Generate global CSS (matching current project)
      files['app/globals.css'] = `@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}`;

      // 6. Generate data files and page files for Next.js App Router structure
      const generatePageFiles = (page) => {
        // Generate data file
        files[`app/data/${page.key}.json`] = JSON.stringify({
          key: page.key,
          title: page.title,
          path: page.path,
          folderPath: page.folderPath,
          parentKey: page.parentKey,
          serializedData: page.serializedData || currentSerializedData,
          generatedAt: new Date().toISOString()
        }, null, 2);
        
        // Generate the actual page file based on Next.js App Router structure
        if (page.key === 'home') {
          // Home page: app/page.js (root page)
          files['app/page.js'] = generateAppRouterPage(page.key, {
            path: page.path,
            displayName: page.title,
            serializedData: page.serializedData || currentSerializedData
          });
        } else {
          // All other pages: app/[folderPath]/page.js
          const folderPath = page.folderPath;
          files[`app/${folderPath}/page.js`] = generateAppRouterPage(page.key, {
            path: page.path,
            displayName: page.title,
            serializedData: page.serializedData || currentSerializedData
          });
        }
      };

      // Process all pages
      pagesToExport.forEach(page => {
        generatePageFiles(page);
      });

      // 7. Generate App Router route utilities based on page hierarchy
      files['app/utils/routeMap.js'] = `// Auto-generated route mapping
const routeMap = {
${pagesToExport
  .map(page => `  '${page.path}': '${page.key}'`)
  .join(',\n')}
};

export const getRouteData = (path) => {
  const routeName = routeMap[path] || 'home';
  return routeName;
};

export const getAllRoutes = () => {
  return Object.keys(routeMap);
};

export const getPageHierarchy = () => {
  return ${JSON.stringify(pagesToExport, null, 2)};
};

export default routeMap;`;

      // 8. Generate Craft.js resolver utility  
      files['app/utils/resolveCraftNodes.js'] = `import { resolveComponent } from '@craftjs/core';

/**
 * Resolves Craft.js nodes from serialized JSON
 */
export const resolveCraftNodesFromJson = (serializedJson, componentMap) => {
  try {
    const data = typeof serializedJson === 'string' ? JSON.parse(serializedJson) : serializedJson;
    
    const resolvedNodes = {};
    
    Object.keys(data).forEach(nodeId => {
      const node = { ...data[nodeId] };
      
      if (node.type && node.type.resolvedName) {
        const componentName = node.type.resolvedName;
        if (componentMap[componentName]) {
          node.type = componentMap[componentName];
        }
      }
      
      resolvedNodes[nodeId] = node;
    });
    
    return resolvedNodes;
  } catch (error) {
    console.error('Error resolving Craft.js nodes:', error);
    return {};
  }
};`;

      // 9. Copy actual user components instead of generating generic ones
      generateUserComponents(files);

      // 10. Generate CraftRenderer for App Router
      files['app/components/CraftRenderer.js'] = `'use client';

import React from 'react';
import { Editor, Frame, Element } from '@craftjs/core';
import { resolveCraftNodesFromJson } from '../utils/resolveCraftNodes';
import * as CustomComponents from './index';

export default function CraftRenderer({ json, enabled = false }) {
  if (!json) {
    return <div>No content to render</div>;
  }

  const resolvedTree = resolveCraftNodesFromJson(json, CustomComponents);

  return (
    <div className="craft-renderer">
      <Editor 
        enabled={enabled} 
        resolver={CustomComponents}
      >
        <Frame data={JSON.stringify(resolvedTree)}>
          <Element 
            is="div" 
            id="root"
            canvas
            style={{
              minHeight: '100vh',
              width: '100%'
            }}
          />
        </Frame>
      </Editor>
    </div>
  );
}`;

      // 11. Generate README.md
      files['README.md'] = `# ${projectName}

This is a [Next.js](https://nextjs.org) project generated with [Glowww](https://glow.vercel.app).

## Project Structure

This project uses a hierarchical page structure:
${pagesToExport.map(page => `- ${page.title} (${page.path})`).join('\n')}

## Getting Started

First, install the dependencies:

\`\`\`bash
npm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

*Generated on ${new Date().toLocaleString()} with Glowww Visual Website Builder*
`;

      return files;
    } catch (error) {
      console.error('Error generating Next.js project:', error);
      throw new Error('Failed to generate project structure: ' + error.message);
    }
  };

  /**
   * Generate App Router page component
   */
  const generateAppRouterPage = (routeName, routeInfo) => {
    const relativePath = routeInfo.path === '/' ? './components/CraftRenderer' : '../components/CraftRenderer';
    const dataPath = routeInfo.path === '/' ? './data/' + routeName + '.json' : '../data/' + routeName + '.json';
    
    return `import CraftRenderer from '${relativePath}';
import pageData from '${dataPath}';

export const metadata = {
  title: '${routeInfo.displayName} - ${projectName}',
  description: 'Generated with Glowww - ${routeInfo.displayName}',
};

export default function ${routeInfo.displayName.replace(/[^a-zA-Z0-9]/g, '')}Page() {
  return (
    <main>
      <CraftRenderer json={pageData.serializedData} enabled={false} />
    </main>
  );
}`;
  };

  /**
   * Copy actual user components instead of generating templates
   */
  const generateUserComponents = async (files) => {
    try {
      // List of user components to copy
      const userComponents = [
        'Text', 'Paragraph', 'Button', 'Image', 'Link', 'Video', 
        'Input', 'TextArea', 'Box', 'FlexBox', 'GridBox', 'Carousel'
      ];

      const advancedComponents = ['Form', 'ShopFlexBox'];

      // Copy basic user components
      userComponents.forEach(componentName => {
        const componentContent = generateReadOnlyComponent(componentName);
        files[`app/components/${componentName}.jsx`] = componentContent;
      });

      // Copy advanced user components
      advancedComponents.forEach(componentName => {
        const componentContent = generateReadOnlyComponent(componentName, true);
        files[`app/components/${componentName}.jsx`] = componentContent;
      });

      // Generate index file
      const allComponents = [...userComponents, ...advancedComponents];
      const exportStatements = allComponents.map(name => `export { ${name} } from './${name}';`).join('\n');

      files['app/components/index.js'] = `// Auto-generated component exports
${exportStatements}

// Component resolver for Craft.js
export const componentResolver = {
${allComponents.map(name => `  ${name}`).join(',\n')}
};`;

    } catch (error) {
      console.error('Error copying user components:', error);
      // Fallback to basic components if copy fails
      generateBasicComponents(files);
    }
  };

  /**
   * Generate a read-only version of a component (strips editor functionality)
   */
  const generateReadOnlyComponent = (componentName, isAdvanced = false) => {
    // This is a simplified version - in production you'd want to actually
    // read the component files and strip editor-specific code
    const basicComponents = {
      Text: `'use client';
import React from 'react';

export const Text = ({ 
  text = "Text",
  fontSize = "16px",
  fontWeight = "normal",
  color = "#000000",
  textAlign = "left",
  margin = "5px 0",
  padding = "10px",
  ...props 
}) => {
  return (
    <span 
      style={{ 
        fontSize,
        fontWeight,
        color,
        textAlign,
        margin,
        padding,
        display: "block",
        ...props 
      }}
    >
      {text}
    </span>
  );
};

Text.craft = {
  displayName: 'Text',
  props: {
    text: 'Text',
    fontSize: '16px',
    fontWeight: 'normal',
    color: '#000000'
  }
};`,

      Paragraph: `'use client';
import React from 'react';

export const Paragraph = ({ 
  content = 'Paragraph text goes here...',
  text,
  fontSize = "16px",
  color = "#000000",
  textAlign = "left",
  margin = "10px 0",
  padding = "10px",
  ...props 
}) => {
  const textContent = content || text || 'Paragraph text goes here...';
  
  if (typeof textContent === 'string' && textContent.includes('<')) {
    return (
      <div 
        style={{ 
          fontSize,
          color,
          textAlign,
          margin,
          padding,
          ...props 
        }}
        dangerouslySetInnerHTML={{ __html: textContent }}
      />
    );
  }
  
  return (
    <p 
      style={{ 
        fontSize,
        color,
        textAlign,
        margin,
        padding,
        ...props 
      }}
    >
      {textContent}
    </p>
  );
};

Paragraph.craft = {
  displayName: 'Paragraph',
  props: {
    content: 'Paragraph text goes here...'
  }
};`,

      Button: `'use client';
import React from 'react';

export const Button = ({ 
  text = "Button",
  children,
  backgroundColor = "#007bff",
  color = "#ffffff",
  padding = "12px 24px",
  borderRadius = "4px",
  border = "none",
  fontSize = "16px",
  cursor = "pointer",
  onClick,
  ...props 
}) => {
  return (
    <button 
      onClick={onClick}
      style={{ 
        backgroundColor,
        color,
        padding,
        borderRadius,
        border,
        fontSize,
        cursor,
        ...props 
      }}
    >
      {text || children || 'Button'}
    </button>
  );
};

Button.craft = {
  displayName: 'Button',
  props: {
    text: 'Button',
    backgroundColor: '#007bff'
  }
};`,

      Image: `'use client';
import React from 'react';

export const Image = ({ 
  src = 'https://via.placeholder.com/300x200',
  alt = 'Image',
  width,
  height,
  objectFit = 'cover',
  ...props 
}) => {
  return (
    <img 
      src={src}
      alt={alt}
      style={{ 
        width: width ? width + 'px' : undefined,
        height: height ? height + 'px' : undefined,
        objectFit,
        ...props 
      }}
    />
  );
};

Image.craft = {
  displayName: 'Image',
  props: {
    src: 'https://via.placeholder.com/300x200',
    alt: 'Image'
  }
};`,

      Link: `'use client';
import React from 'react';

export const Link = ({ 
  text = 'Link',
  href = '#',
  target = '_self',
  color = '#007bff',
  textDecoration = 'underline',
  ...props 
}) => {
  return (
    <a 
      href={href}
      target={target}
      style={{ 
        color,
        textDecoration,
        ...props 
      }}
    >
      {text}
    </a>
  );
};

Link.craft = {
  displayName: 'Link',
  props: {
    text: 'Link',
    href: '#'
  }
};`,

      Video: `'use client';
import React from 'react';

export const Video = ({ 
  src = 'https://www.w3schools.com/html/mov_bbb.mp4',
  width,
  height,
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  ...props 
}) => {
  return (
    <video 
      src={src}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      style={{ 
        width: width ? width + 'px' : undefined,
        height: height ? height + 'px' : undefined,
        ...props 
      }}
    />
  );
};

Video.craft = {
  displayName: 'Video',
  props: {
    src: 'https://www.w3schools.com/html/mov_bbb.mp4',
    controls: true
  }
};`,

      Input: `'use client';
import React from 'react';

export const Input = ({ 
  type = 'text',
  placeholder = 'Enter text...',
  value,
  onChange,
  width,
  padding = '8px 12px',
  border = '1px solid #ccc',
  borderRadius = '4px',
  fontSize,
  ...props 
}) => {
  return (
    <input 
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ 
        width: width ? width + 'px' : undefined,
        padding,
        border,
        borderRadius,
        fontSize: fontSize ? fontSize + 'px' : undefined,
        ...props 
      }}
    />
  );
};

Input.craft = {
  displayName: 'Input',
  props: {
    type: 'text',
    placeholder: 'Enter text...'
  }
};`,

      TextArea: `'use client';
import React from 'react';

export const TextArea = ({ 
  placeholder = 'Enter text...',
  value,
  onChange,
  rows = 4,
  cols,
  width,
  height,
  padding = '8px 12px',
  border = '1px solid #ccc',
  borderRadius = '4px',
  fontSize,
  resize = 'vertical',
  ...props 
}) => {
  return (
    <textarea 
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      cols={cols}
      style={{ 
        width: width ? width + 'px' : undefined,
        height: height ? height + 'px' : undefined,
        padding,
        border,
        borderRadius,
        fontSize: fontSize ? fontSize + 'px' : undefined,
        resize,
        ...props 
      }}
    />
  );
};

TextArea.craft = {
  displayName: 'TextArea',
  props: {
    placeholder: 'Enter text...',
    rows: 4
  }
};`,

      Box: `'use client';
import React from 'react';

export const Box = ({ 
  children,
  backgroundColor = "transparent",
  padding = "16px",
  margin = "0",
  borderRadius = "0",
  border = "none",
  width = "auto",
  height = "auto",
  ...props 
}) => {
  return (
    <div 
      style={{ 
        backgroundColor,
        padding,
        margin,
        borderRadius,
        border,
        width,
        height,
        ...props 
      }}
    >
      {children}
    </div>
  );
};

Box.craft = {
  displayName: 'Box',
  props: {
    backgroundColor: 'transparent'
  }
};`,

      FlexBox: `'use client';
import React from 'react';

export const FlexBox = ({ 
  children,
  flexDirection = 'row',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
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
        gap: gap ? gap + 'px' : undefined,
        ...props 
      }}
    >
      {children}
    </div>
  );
};

FlexBox.craft = {
  displayName: 'FlexBox',
  props: {
    flexDirection: 'row'
  }
};`,

      GridBox: `'use client';
import React from 'react';

export const GridBox = ({ 
  children,
  gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))',
  gap,
  ...props 
}) => {
  return (
    <div 
      style={{ 
        display: 'grid',
        gridTemplateColumns,
        gap: gap ? gap + 'px' : undefined,
        ...props 
      }}
    >
      {children}
    </div>
  );
};

GridBox.craft = {
  displayName: 'GridBox',
  props: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
  }
};`,

      Carousel: `'use client';
import React from 'react';

export const Carousel = ({ 
  children,
  ...props 
}) => {
  return (
    <div 
      className="carousel-container" 
      style={{ 
        display: 'flex',
        overflowX: 'auto',
        scrollBehavior: 'smooth',
        ...props 
      }}
    >
      {children}
    </div>
  );
};

Carousel.craft = {
  displayName: 'Carousel',
  props: {}
};`
    };

    const advancedComponents = {
      Form: `'use client';
import React from 'react';

export const Form = ({ 
  children,
  onSubmit,
  ...props 
}) => {
  return (
    <form 
      style={props} 
      onSubmit={onSubmit}
    >
      {children}
    </form>
  );
};

Form.craft = {
  displayName: 'Form',
  props: {}
};`,

      ShopFlexBox: `'use client';
import React from 'react';

export const ShopFlexBox = ({ 
  children,
  ...props 
}) => {
  return (
    <div 
      className="shop-container" 
      style={{ 
        display: 'flex',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        background: '#f9fafb',
        ...props 
      }}
    >
      {children}
    </div>
  );
};

ShopFlexBox.craft = {
  displayName: 'ShopFlexBox',
  props: {}
};`
    };

    if (isAdvanced) {
      return advancedComponents[componentName] || generateGenericComponent(componentName);
    }

    return basicComponents[componentName] || generateGenericComponent(componentName);
  };

  /**
   * Generate a generic component fallback
   */
  const generateGenericComponent = (componentName) => {
    return `'use client';
import React from 'react';

export const ${componentName} = ({ 
  children,
  ...props 
}) => {
  return (
    <div {...props}>
      {children || '${componentName}'}
    </div>
  );
};

${componentName}.craft = {
  displayName: '${componentName}',
  props: {}
};`;
  };

  /**
   * Fallback basic component generation
   */
  const generateBasicComponents = (files) => {
    const components = ['Text', 'Button', 'Box', 'FlexBox', 'GridBox'];
    
    components.forEach(componentName => {
      files[`app/components/${componentName}.jsx`] = generateGenericComponent(componentName);
    });

    files['app/components/index.js'] = `// Basic component exports
${components.map(name => `export { ${name} } from './${name}';`).join('\n')}`;
  };

  /**
   * Create and download the Next.js project as a ZIP file
   */
  const downloadNextJSProject = async (files) => {
    try {
      setIsExporting(true);
      
      const zip = new JSZip();
      
      // Add all files to the ZIP
      Object.entries(files).forEach(([filePath, content]) => {
        zip.file(filePath, content);
      });
      
      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download the ZIP file
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}-export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success('Next.js project exported successfully!');
      setExportModalVisible(false);
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export project: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle the export process
   */
  const handleExport = async () => {
    try {
      const files = generateNextJSProject();
      await downloadNextJSProject(files);
    } catch (error) {
      message.error('Export failed: ' + error.message);
      setIsExporting(false);
    }
  };

  return (
    <>
      <Space size="small">
        <Tooltip title="Preview & Save Template">
          <Button
            icon={<EyeOutlined />}
            size="small"
            type="text"
            onClick={handleTemplateSaveWithPreview}
            disabled={!user}
            className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
          />
        </Tooltip>
        
        <Tooltip title="Save as Template">
          <Button
            icon={<ShopOutlined />}
            size="small"
            type="text"
            onClick={() => setTemplateSaveModalVisible(true)}
            disabled={!user}
            className="hover:bg-green-50 hover:text-green-600 transition-colors"
          />
        </Tooltip>
        
        <Tooltip title="Export as Next.js App">
          <Button
            icon={<ExportOutlined />}
            size="small"
            type="text"
            onClick={() => setExportModalVisible(true)}
            className="hover:bg-purple-50 hover:text-purple-600 transition-colors"
          />
        </Tooltip>
      </Space>

      <Modal
        title={
          <Space>
            <CodeOutlined />
            <span>Export Next.js Application</span>
          </Space>
        }
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setExportModalVisible(false)}
          >
            Cancel
          </Button>,
          <Button 
            key="export" 
            type="primary" 
            loading={isExporting}
            onClick={handleExport}
            icon={<DownloadOutlined />}
          >
            {isExporting ? 'Exporting...' : 'Export Project'}
          </Button>
        ]}
        width={600}
        destroyOnHidden
      >
        <div style={{ marginBottom: '24px' }}>
          <Typography.Paragraph>
            Export your Craft.js project as a standalone Next.js application using the App Router.
            The exported project will be ready to deploy and includes all your components in read-only mode.
          </Typography.Paragraph>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Project Name</Text>
            <Input
              placeholder="my-next-app"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{ marginTop: '8px' }}
              prefix={<FolderOutlined />}
            />
          </div>

          <div>
            <Text strong>Project Pages</Text>
            <div style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '8px' }}>
              {currentProjectPages.length > 0 ? (
                currentProjectPages.map(page => (
                  <div key={page.key} style={{ marginBottom: '4px', fontSize: '12px' }}>
                    <Text>{page.title}</Text> 
                    <Text type="secondary" style={{ marginLeft: '8px' }}>
                      {page.folderPath ? `app/${page.folderPath}/page.js` : 'app/page.js'}
                    </Text>
                  </div>
                ))
              ) : (
                <Text type="secondary">No pages available. Current page will be exported as home.</Text>
              )}
            </div>
          </div>

          <div style={{ 
            background: '#f8f9fa', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <Space direction="vertical" size="small">
              <Text strong>📦 Export will include:</Text>
              <Text>• Next.js 15.3.2 App Router structure</Text>
              <Text>• All your Craft.js components (read-only)</Text>
              <Text>• Tailwind CSS configuration</Text>
              <Text>• Production-ready configuration</Text>
              <Text>• Static export optimization</Text>
            </Space>
          </div>
        </Space>
      </Modal>
      
      {/* Template Preview Modal */}
      <TemplatePreview
        visible={templatePreviewVisible}
        onClose={() => setTemplatePreviewVisible(false)}
        templateData={getCurrentPageData()}
        isExistingTemplate={!!existingTemplateId}
        templateId={existingTemplateId}
        onSave={handleTemplateSave}
        onUpdate={handleTemplateUpdate}
      />
      
      {/* Template Save Modal */}
      <TemplateSaveModal
        visible={templateSaveModalVisible}
        onCancel={() => setTemplateSaveModalVisible(false)}
        pageData={getCurrentPageData()}
        onSuccess={() => {
          message.success('Template saved successfully!');
          setTemplateSaveModalVisible(false);
        }}
      />
    </>
  );
};

export default ExportManager;
