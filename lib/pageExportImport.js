import pako from 'pako';

/**
 * Export page data to a compressed .glow file
 * Matches the PageManager compression approach
 */
export const exportPageToGlow = (pageData, pageName = 'page') => {
  try {
    // Validate page data
    if (!pageData || typeof pageData !== 'string') {
      throw new Error('Invalid page data - must be a serialized string');
    }

    // Parse to validate JSON structure
    const parsed = JSON.parse(pageData);
    if (!parsed.ROOT) {
      throw new Error('Invalid page structure - missing ROOT node');
    }

    // Compress the data using pako (matching PageManager approach)
    const compressedData = compressData(pageData);
    
    // Create blob and download
    const blob = new Blob([compressedData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.glow`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export page: ' + error.message);
  }
};

/**
 * Export page data to a raw JSON file
 * Provides human-readable format for inspection and manual editing
 */
export const exportPageToJson = (pageData, pageName = 'page') => {
  try {
    // Validate page data
    if (!pageData || typeof pageData !== 'string') {
      throw new Error('Invalid page data - must be a serialized string');
    }

    // Parse to validate JSON structure and format it nicely
    const parsed = JSON.parse(pageData);
    if (!parsed.ROOT) {
      throw new Error('Invalid page structure - missing ROOT node');
    }

    // Format JSON with proper indentation
    const formattedJson = JSON.stringify(parsed, null, 2);
    
    // Create blob and download
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('JSON export failed:', error);
    throw new Error('Failed to export page as JSON: ' + error.message);
  }
};

/**
 * Import page data from compressed .glow file or raw JSON
 * Matches the PageManager decompression approach
 */
export const importPageFromData = (inputData) => {
  try {
    if (!inputData || typeof inputData !== 'string') {
      throw new Error('Invalid input data');
    }

    let pageData;
    
    try {
      // Try to decompress first (for .glow files)
      pageData = decompressData(inputData.trim());
      console.log('Successfully decompressed page data');
    } catch (decompressError) {
      // If decompression fails, try to use as raw JSON
      try {
        JSON.parse(inputData.trim()); // Validate JSON
        pageData = inputData.trim();
        console.log('Using raw JSON data');
      } catch (jsonError) {
        throw new Error('Invalid format. Please provide a valid .glow file or serialized JSON data.');
      }
    }

    // Validate the final page data structure
    const parsed = JSON.parse(pageData);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid page structure');
    }

    if (!parsed.ROOT) {
      throw new Error('Invalid page structure - missing ROOT node');
    }

    return pageData;
  } catch (error) {
    console.error('Import failed:', error);
    throw new Error('Failed to import page: ' + error.message);
  }
};

/**
 * Compress data using pako deflate (matching PageManager approach)
 */
export const compressData = (jsonString) => {
  try {
    const compressed = pako.deflate(jsonString);
    return btoa(String.fromCharCode.apply(null, compressed));
  } catch (error) {
    console.error('Compression error:', error);
    throw new Error('Failed to compress data');
  }
};

/**
 * Decompress data using pako inflate (matching PageManager approach)
 */
export const decompressData = (compressedString) => {
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

/**
 * Validate page data structure for CraftJS compatibility
 */
export const validatePageData = (pageData) => {
  try {
    const parsed = typeof pageData === 'string' ? JSON.parse(pageData) : pageData;
    
    // Check for required structure
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Invalid data structure' };
    }

    if (!parsed.ROOT) {
      return { valid: false, error: 'Missing ROOT node' };
    }

    // Validate ROOT node structure
    const root = parsed.ROOT;
    if (!root.type || !root.type.resolvedName) {
      return { valid: false, error: 'Invalid ROOT node structure' };
    }

    // Check if it's a proper CraftJS structure
    const hasValidNodes = Object.keys(parsed).every(nodeId => {
      const node = parsed[nodeId];
      return node && 
             typeof node === 'object' && 
             node.type && 
             typeof node.type === 'object' &&
             node.hasOwnProperty('props') &&
             node.hasOwnProperty('nodes') &&
             Array.isArray(node.nodes);
    });

    if (!hasValidNodes) {
      return { valid: false, error: 'Invalid node structure' };
    }

    return { valid: true, data: parsed };
  } catch (error) {
    return { valid: false, error: 'Failed to parse data: ' + error.message };
  }
};

/**
 * Clean and fix page data structure for CraftJS compatibility
 */
export const cleanPageData = (pageData) => {
  try {
    const parsed = typeof pageData === 'string' ? JSON.parse(pageData) : pageData;
    const cleaned = {};
    
    // Process each node
    Object.keys(parsed).forEach(nodeId => {
      const node = parsed[nodeId];
      
      if (node && typeof node === 'object') {
        cleaned[nodeId] = {
          type: node.type || { resolvedName: "Box" },
          isCanvas: node.isCanvas || false,
          props: node.props || {},
          displayName: node.displayName || nodeId,
          custom: node.custom || {},
          parent: node.parent || (nodeId === 'ROOT' ? null : 'ROOT'),
          nodes: Array.isArray(node.nodes) ? node.nodes : [],
          linkedNodes: node.linkedNodes || {}
        };

        // Ensure type structure is correct
        if (cleaned[nodeId].type && typeof cleaned[nodeId].type !== 'object') {
          cleaned[nodeId].type = { resolvedName: String(cleaned[nodeId].type) };
        }
      }
    });

    // Ensure ROOT node exists
    if (!cleaned.ROOT) {
      cleaned.ROOT = {
        type: { resolvedName: "Root" },
        isCanvas: true,
        props: { canvas: true },
        displayName: "Root",
        custom: {},
        parent: null,
        nodes: [],
        linkedNodes: {}
      };
    }

    return JSON.stringify(cleaned);
  } catch (error) {
    console.error('Clean page data error:', error);
    throw new Error('Failed to clean page data: ' + error.message);
  }
};
