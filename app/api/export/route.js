import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

/**
 * POST /api/export - Export project with actual file copying
 */
export async function POST(request) {
  try {
    const { 
      projectName, 
      projectData, 
      componentList = [],
      exportType = 'complete' 
    } = await request.json();
    
    const zip = new JSZip();
    const projectRoot = process.cwd();
    
    console.log(`📦 Starting ${exportType} export for project: ${projectName}`);
    
    // Copy entire Components folder structure
    await copyCompleteComponentsFolder(zip, projectRoot);
    
    // Copy public folder
    await copyPublicFolder(zip, projectRoot);
    
    // Generate project structure files
    await generateCompleteProjectStructure(zip, projectName, projectData);
    
    // Generate the ZIP buffer
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    console.log(`✅ Export completed successfully: ${projectName}-complete-export.zip`);
    
    // Return the ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${projectName}-complete-export.zip"`
      }
    });
    
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export project', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Copy entire Components folder structure (excluding Editor/Preview folders)
 */
async function copyCompleteComponentsFolder(zip, projectRoot) {
  const componentsPath = path.join(projectRoot, 'app', 'Components');
  
  if (!fs.existsSync(componentsPath)) {
    console.warn('⚠ Components folder not found, creating placeholder');
    zip.file('app/Components/README.md', `# Components Folder

Please copy your Components folder from the original project here.
`);
    return;
  }
  
  await copyFolderRecursively(zip, componentsPath, 'app/Components', (relativePath) => {
    // Exclude Editor and Preview folders
    if (relativePath.includes('/Editor/') || 
        relativePath.includes('/Preview/') ||
        relativePath.includes('\\Editor\\') || 
        relativePath.includes('\\Preview\\')) {
      return false;
    }
    
    // Exclude any page.js or page.jsx files that could conflict with [[...slug]] routing
    const fileName = path.basename(relativePath);
    const isPageFile = fileName === 'page.js' || fileName === 'page.jsx';
    
    // Skip page files that would be placed in the app root or could conflict with routing
    if (isPageFile) {
      const targetPath = relativePath.replace(/^.*app[\\\/]Components[\\\/]/, 'app/Components/');
      // Don't copy page files that would end up in problematic locations
      if (targetPath.match(/^app\/(page\.(js|jsx)|Components\/page\.(js|jsx))$/)) {
        console.log(`⏭ Skipping conflicting page file: ${relativePath}`);
        return false;
      }
    }
    
    return true;
  });
  
  console.log('✅ Complete Components folder copied');
}

/**
 * Copy public folder structure
 */
async function copyPublicFolder(zip, projectRoot) {
  const publicPath = path.join(projectRoot, 'public');
  
  if (!fs.existsSync(publicPath)) {
    console.warn('⚠ Public folder not found, creating placeholder');
    zip.file('public/README.md', `# Public Assets

Please copy your public folder from the original project here.
`);
    return;
  }
  
  await copyFolderRecursively(zip, publicPath, 'public');
  console.log('✅ Public folder copied');
}

/**
 * Recursively copy folder contents
 */
async function copyFolderRecursively(zip, sourceFolder, targetFolder, filterFn = () => true) {
  try {
    const items = fs.readdirSync(sourceFolder);
    
    for (const item of items) {
      const sourcePath = path.join(sourceFolder, item);
      const relativePath = path.relative(process.cwd(), sourcePath);
      
      // Apply filter
      if (!filterFn(relativePath)) {
        console.log(`⏭ Skipping: ${relativePath}`);
        continue;
      }
      
      const stat = fs.statSync(sourcePath);
      
      if (stat.isDirectory()) {
        // Recursively copy subdirectory
        await copyFolderRecursively(zip, sourcePath, `${targetFolder}/${item}`, filterFn);
      } else if (stat.isFile()) {
        // Copy file exactly as is - no processing
        const fileContent = fs.readFileSync(sourcePath, 'utf8');
        const targetPath = `${targetFolder}/${item}`;
        
        // Additional check: Don't create conflicting page routes
        const fileName = path.basename(targetPath);
        const isPageFile = fileName === 'page.js' || fileName === 'page.jsx';
        
        // Prevent creating app/page.js or app/page.jsx that would conflict with [[...slug]]
        if (isPageFile && targetPath === 'app/page.js' || targetPath === 'app/page.jsx') {
          console.log(`⏭ Skipping conflicting root page file: ${targetPath}`);
          continue;
        }
        
        // Copy all files exactly as they are without any modifications
        zip.file(targetPath, fileContent);
        
        console.log(`✓ Copied: ${targetPath}`);
      }
    }
  } catch (error) {
    console.error(`Error copying folder ${sourceFolder}:`, error);
  }
}

/**
 * Generate complete project structure with data folder approach
 */
async function generateCompleteProjectStructure(zip, projectName, projectData) {
  // Copy existing package.json exactly as it is
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const existingPackageJson = fs.readFileSync(packageJsonPath, 'utf8');
    zip.file('package.json', existingPackageJson);
    console.log('✓ Copied existing package.json');
  } else {
    // Fallback to generated package.json if original doesn't exist
    zip.file('package.json', JSON.stringify({
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
        'react-dom': '^19.0.0'
      },
      devDependencies: {
        '@tailwindcss/postcss': '^4',
        'tailwindcss': '^4'
      }
    }, null, 2));
    console.log('⚠ Used fallback package.json');
  }
  
  // Next.js config - copy existing or use fallback
  const nextConfigPath = path.join(process.cwd(), 'next.config.mjs');
  if (fs.existsSync(nextConfigPath)) {
    const existingNextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    zip.file('next.config.mjs', existingNextConfig);
    console.log('✓ Copied existing next.config.mjs');
  } else {
    zip.file('next.config.mjs', 
`/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;`);
    console.log('⚠ Used fallback next.config.mjs');
  }
  
  // PostCSS config - copy existing or use fallback
  const postcssConfigPath = path.join(process.cwd(), 'postcss.config.mjs');
  if (fs.existsSync(postcssConfigPath)) {
    const existingPostcssConfig = fs.readFileSync(postcssConfigPath, 'utf8');
    zip.file('postcss.config.mjs', existingPostcssConfig);
    console.log('✓ Copied existing postcss.config.mjs');
  } else {
    zip.file('postcss.config.mjs', 
`const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;`);
    console.log('⚠ Used fallback postcss.config.mjs');
  }
  
  // JSConfig - copy existing if it exists
  const jsconfigPath = path.join(process.cwd(), 'jsconfig.json');
  if (fs.existsSync(jsconfigPath)) {
    const existingJsconfig = fs.readFileSync(jsconfigPath, 'utf8');
    zip.file('jsconfig.json', existingJsconfig);
    console.log('✓ Copied existing jsconfig.json');
  }
  
  // App layout - copy existing or use fallback
  const layoutPath = path.join(process.cwd(), 'app', 'layout.js');
  if (fs.existsSync(layoutPath)) {
    const existingLayout = fs.readFileSync(layoutPath, 'utf8');
    zip.file('app/layout.js', existingLayout);
    console.log('✓ Copied existing app/layout.js');
  } else {
    zip.file('app/layout.js', 
`import { Geist, Geist_Mono } from "next/font/google";
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
  description: "Exported from Glowww",
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
}`);
    console.log('⚠ Used fallback app/layout.js');
  }
  
  // Global CSS - copy existing or use fallback
  const globalsCssPath = path.join(process.cwd(), 'app', 'globals.css');
  if (fs.existsSync(globalsCssPath)) {
    const existingGlobalsCss = fs.readFileSync(globalsCssPath, 'utf8');
    zip.file('app/globals.css', existingGlobalsCss);
    console.log('✓ Copied existing app/globals.css');
  } else {
    zip.file('app/globals.css', 
`@import "tailwindcss";

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
}`);
    console.log('⚠ Used fallback app/globals.css');
  }
  
  // Data folder with project data
  zip.file('app/data/project.json', JSON.stringify(projectData, null, 2));
  
  // Clean [[...slug]] page based on Preview template
  zip.file('app/[[...slug]]/page.jsx', generateCleanSlugPage());
  
  // README
  zip.file('README.md', 
`# ${projectName}

This is a Next.js project exported from Glowww.

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

## Project Structure

This exported project includes:
- Complete Components folder (excluding Editor/Preview)
- All public assets
- Data folder with your saved project
- Clean [[...slug]] page for dynamic routing
- Production-ready Next.js configuration

---

*Exported from Glowww Visual Website Builder on ${new Date().toLocaleString()}*
`);
  
  console.log('✅ Project structure files generated');
}

/**
 * Generate clean [[...slug]] page based on Preview template
 */
function generateCleanSlugPage() {
  return `'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Editor, Element, Frame } from "@craftjs/core";

// Import all user components for rendering
import { Box } from '../Components/user/Box';
import { FlexBox } from '../Components/user/FlexBox';
import { Text } from '../Components/user/Text';
import { GridBox } from '../Components/user/GridBox';
import { Image } from '../Components/user/Image';
import { Button } from '../Components/user/Button';
import { Link } from '../Components/user/Link';
import { Paragraph } from '../Components/user/Paragraph';
import { Video } from '../Components/user/Video';
import { ShopFlexBox, ShopImage, ShopText } from '../Components/user/Advanced/ShopFlexBox';
import { FormInput } from '../Components/user/Input';
import { Form, FormInputDropArea } from '../Components/user/Advanced/Form';
import { Carousel } from '../Components/user/Carousel';
import { NavBar, NavItem } from '../Components/user/Nav/NavBar';
import { Root } from '../Components/Root';

// Import context providers
import { MultiSelectProvider } from '../Components/support/MultiSelectContext';
import { PagesProvider } from '../Components/PagesContext';

// Import the project data
import projectData from '../data/project.json';

/**
 * Main Page Component - Clean Preview-based Template
 * 
 * Features:
 * - Loads project data from static JSON file
 * - Dynamic routing based on project page hierarchy
 * - Clean URLs without editor interface
 * - Read-only display mode
 */
export default function MainPage() {
  const params = useParams();
  const [currentPage, setCurrentPage] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Extract and process slug from params
  const slug = useMemo(() => {
    return params?.slug || [];
  }, [params?.slug]);
  
  const slugPath = useMemo(() => {
    return slug.join('/');
  }, [slug]);

  /**
   * Find the correct page based on the URL path
   */
  const findPageByPath = (urlPath) => {
    if (!projectData?.pages || !Array.isArray(projectData.pages)) {
      return null;
    }
    
    // Root route (/) should show home page
    if (!urlPath || urlPath === '') {
      return projectData.pages.find(page => page.isHome || page.key === 'home');
    }
    
    // Split the path into segments
    const pathSegments = urlPath.split('/').filter(segment => segment.length > 0);
    
    // Build page hierarchy map for quick lookup
    const pageMap = {};
    const pagesByKey = {};
    
    projectData.pages.forEach(page => {
      pagesByKey[page.key] = page;
      
      // Map different possible path formats
      if (page.path) {
        pageMap[page.path.replace(/^\\/+/, '')] = page;
      }
      if (page.key !== 'home') {
        pageMap[page.key] = page;
      }
      if (page.folderPath) {
        pageMap[page.folderPath] = page;
      }
    });
    
    // Try exact path match first
    const exactMatch = pageMap[urlPath];
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try to match by reconstructing path from hierarchy
    for (const page of projectData.pages) {
      if (page.isHome) continue;
      
      const pagePath = buildPagePath(page, pagesByKey);
      if (pagePath === urlPath) {
        return page;
      }
    }
    
    // Try fuzzy matching - look for page key at the end of the path
    const lastSegment = pathSegments[pathSegments.length - 1];
    const fuzzyMatch = projectData.pages.find(page => 
      page.key === lastSegment || 
      page.title.toLowerCase().replace(/[^a-z0-9]/g, '-') === lastSegment
    );
    
    return fuzzyMatch;
  };

  /**
   * Build the full path for a page based on its hierarchy
   */
  const buildPagePath = (page, pagesByKey) => {
    if (page.isHome || page.key === 'home') {
      return '';
    }
    
    const pathSegments = [];
    let currentPage = page;
    
    // Walk up the hierarchy to build the full path
    while (currentPage && !currentPage.isHome) {
      pathSegments.unshift(currentPage.key);
      currentPage = currentPage.parentKey ? pagesByKey[currentPage.parentKey] : null;
    }
    
    return pathSegments.join('/');
  };

  /**
   * Create fallback page if none found
   */
  const createFallbackPage = () => {
    return {
      key: 'home',
      title: 'Home',
      path: '/',
      folderPath: '',
      parentKey: null,
      isHome: true,
      serializedData: JSON.stringify({
        "ROOT": {
          "type": { "resolvedName": "Element" },
          "isCanvas": true,
          "props": {},
          "displayName": "Element",
          "custom": {},
          "hidden": false,
          "nodes": ["node_1"],
          "linkedNodes": {}
        },
        "node_1": {
          "type": { "resolvedName": "Text" },
          "isCanvas": false,
          "props": {
            "text": "Welcome to Your Exported Site",
            "fontSize": "24",
            "fontWeight": "600",
            "color": "#1f2937",
            "textAlign": "center",
            "margin": ["20", "20", "20", "20"]
          },
          "displayName": "Text",
          "custom": {},
          "parent": "ROOT",
          "hidden": false,
          "nodes": [],
          "linkedNodes": {}
        }
      })
    };
  };

  // Load and find current page when component mounts or slug changes
  useEffect(() => {
    const initializePage = async () => {
      setIsLoading(true);
      setError(null);
      
      // Find the page that matches the current URL
      const targetPage = findPageByPath(slugPath);
      
      if (targetPage) {
        setCurrentPage(targetPage);
      } else {
        // If page not found, try fallback or show error
        const fallbackPage = createFallbackPage();
        if (slugPath === '') {
          setCurrentPage(fallbackPage);
        } else {
          const availablePages = projectData.pages.map(p => \`\${p.title} (\${buildPagePath(p, projectData.pages.reduce((acc, page) => ({ ...acc, [page.key]: page }), {})) || '/'})\`).join(', ');
          setError(\`Page not found for path: /\${slugPath}\\n\\nAvailable pages: \${availablePages}\`);
        }
      }
      
      setIsLoading(false);
    };
    
    initializePage();
  }, [slugPath]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading...</h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600 mb-4 whitespace-pre-line">{error}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No current page selected
  if (!currentPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">No Page Selected</h2>
        </div>
      </div>
    );
  }

  // No serialized data for the page
  if (!currentPage.serializedData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{currentPage.title}</h2>
          <p className="text-gray-600 mb-4">This page doesn't have any content yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full overflow-auto">
        <div className="w-full max-w-none">
          <PagesProvider>
              <Editor
                resolver={{
                  Box,
                  FlexBox,
                  Text,
                  GridBox,
                  Image,
                  Button,
                  Link,
                  Paragraph,
                  Video,
                  ShopFlexBox,
                  ShopImage,
                  ShopText,
                  FormInput,
                  Form,
                  FormInputDropArea,
                  Carousel,
                  NavBar,
                  NavItem,
                  Root,
                  Element
                }}
                enabled={false} // Disable editing in production
              >
               <MultiSelectProvider>
                <Frame data={currentPage.serializedData} className="w-full">
                  <Element
                    is={Root}
                    padding={0}
                    background="#ffffff"
                    canvas
                    className="w-full"
                    style={{
                      maxWidth: '100%',
                      minWidth: '100%',
                      overflow: 'hidden'
                    }}
                  />
                </Frame>
               </MultiSelectProvider>
              </Editor>
          </PagesProvider>
        </div>
      </div>
    </div>
  );
}`;
}
