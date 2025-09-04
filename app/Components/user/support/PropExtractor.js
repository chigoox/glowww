'use client'

/**
 * Dynamic Property Extractor
 * Automatically extracts props from React components and infers their types
 * This eliminates the need for maintaining separate COMPONENT_PROPERTIES objects
 */

// Type inference based on default values and prop names
const inferPropType = (propName, defaultValue, craftProps = {}) => {
  // Check if we have craft-specific type info
  if (craftProps[propName] !== undefined) {
    const craftValue = craftProps[propName];
    if (typeof craftValue === 'boolean') return { type: 'boolean', label: formatLabel(propName) };
    if (typeof craftValue === 'number') return { type: 'number', label: formatLabel(propName) };
    if (Array.isArray(craftValue)) {
      // Handle array props like slides
      if (propName === 'slides') {
        return { type: 'array', label: formatLabel(propName), arrayType: 'slides' };
      }
      return { type: 'array', label: formatLabel(propName), arrayType: 'generic' };
    }
    if (typeof craftValue === 'object' && craftValue !== null) {
      // Handle object props like imageStyles, videoStyles, captionStyles
      if (propName.includes('Styles') || propName.includes('Style')) {
        return { type: 'object', label: formatLabel(propName), objectType: 'styles' };
      }
      return { type: 'object', label: formatLabel(propName), objectType: 'generic' };
    }
    if (typeof craftValue === 'string') {
      // Check if it looks like a color
      if (propName.toLowerCase().includes('color') || propName.toLowerCase().includes('background')) {
        return { type: 'color', label: formatLabel(propName) };
      }
      // Check if it's a select-type prop
      if (selectProps[propName]) {
        return { type: 'select', label: formatLabel(propName), options: selectProps[propName] };
      }
      return { type: 'text', label: formatLabel(propName) };
    }
  }

  // Infer from default value type
  if (typeof defaultValue === 'boolean') {
    return { type: 'boolean', label: formatLabel(propName) };
  }
  if (typeof defaultValue === 'number') {
    return { type: 'number', label: formatLabel(propName) };
  }
  if (Array.isArray(defaultValue)) {
    if (propName === 'slides') {
      return { type: 'array', label: formatLabel(propName), arrayType: 'slides' };
    }
    return { type: 'array', label: formatLabel(propName), arrayType: 'generic' };
  }
  if (typeof defaultValue === 'object' && defaultValue !== null) {
    if (propName.includes('Styles') || propName.includes('Style')) {
      return { type: 'object', label: formatLabel(propName), objectType: 'styles' };
    }
    return { type: 'object', label: formatLabel(propName), objectType: 'generic' };
  }

  // Infer from prop name patterns
  if (propName.toLowerCase().includes('color') || propName.toLowerCase().includes('background')) {
    return { type: 'color', label: formatLabel(propName) };
  }

  if (propName.toLowerCase().includes('hidden') || propName.toLowerCase().includes('disabled') || 
      propName.toLowerCase().includes('visible') || propName.toLowerCase().includes('toggle') ||
      propName.toLowerCase().includes('autoplay') || propName.toLowerCase().includes('show') ||
      propName.toLowerCase().includes('infinite') || propName.toLowerCase().includes('loop') ||
      propName.toLowerCase().includes('muted') || propName.toLowerCase().includes('controls')) {
    return { type: 'boolean', label: formatLabel(propName) };
  }

  if (propName.toLowerCase().includes('width') || propName.toLowerCase().includes('height') || 
      propName.toLowerCase().includes('size') || propName.toLowerCase().includes('index') ||
      propName.toLowerCase().includes('opacity') || propName.toLowerCase().includes('radius') ||
      propName.toLowerCase().includes('interval') || propName.toLowerCase().includes('duration') ||
      propName.toLowerCase().includes('slide')) {
    return { type: 'number', label: formatLabel(propName) };
  }

  if (propName === 'slides') {
    return { type: 'array', label: formatLabel(propName), arrayType: 'slides' };
  }

  if (propName.includes('Styles') || propName.includes('Style')) {
    return { type: 'object', label: formatLabel(propName), objectType: 'styles' };
  }

  // Check if it's a known select prop
  if (selectProps[propName]) {
    return { type: 'select', label: formatLabel(propName), options: selectProps[propName] };
  }

  // Default to text
  return { type: 'text', label: formatLabel(propName) };
};

// Common select options for known props
const selectProps = {
  'position': ['static', 'relative', 'absolute', 'fixed'],
  'display': ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'none'],
  'overflow': ['visible', 'hidden', 'scroll', 'auto'],
  'textAlign': ['left', 'center', 'right', 'justify'],
  'fontWeight': ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
  'borderStyle': ['solid', 'dashed', 'dotted', 'none'],
  'objectFit': ['cover', 'contain', 'fill', 'scale-down', 'none'],
  'objectPosition': ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'],
  'flexDirection': ['row', 'column', 'row-reverse', 'column-reverse'],
  'alignItems': ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
  'justifyContent': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
  'alignContent': ['flex-start', 'center', 'flex-end', 'stretch', 'space-between', 'space-around'],
  'flexWrap': ['nowrap', 'wrap', 'wrap-reverse'],
  'target': ['_self', '_blank', '_parent', '_top'],
  'buttonType': ['primary', 'secondary', 'outline', 'ghost'],
  'size': ['small', 'medium', 'large'],
  'textDecoration': ['none', 'underline', 'overline', 'line-through'],
  'visibility': ['visible', 'hidden'],
  'cursor': ['default', 'pointer', 'text', 'not-allowed', 'grab', 'grabbing'],
  'pointerEvents': ['auto', 'none'],
  'userSelect': ['auto', 'none', 'text', 'all'],
  'actionType': ['none', 'link', 'submit', 'scroll', 'toggle', 'modal', 'script', 'theme', 'animation'],
  'animationType': ['fadeIn', 'fadeOut', 'slideIn', 'slideOut', 'bounce', 'pulse', 'shake'],
  'loading': ['eager', 'lazy'],
  'autoplay': ['true', 'false'],
  'loop': ['true', 'false'],
  'muted': ['true', 'false'],
  'controls': ['true', 'false'],
  // Carousel specific
  'transition': ['slide', 'fade', 'cube', 'coverflow', 'flip'],
  'captionPosition': ['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'],
  // Video specific
  'preload': ['none', 'metadata', 'auto'],
  'playsInline': ['true', 'false'],
  'videoType': ['url', 'file'],
  // Form specific
  'type': ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local', 'month', 'week', 'color'],
  'autocomplete': ['on', 'off', 'name', 'email', 'username', 'current-password', 'new-password'],
  // Navigation
  'rel': ['nofollow', 'noopener', 'noreferrer', 'external'],
  // Layout specific
  'gridTemplateColumns': ['1fr', '1fr 1fr', '1fr 1fr 1fr', 'repeat(auto-fit, minmax(200px, 1fr))'],
  'gridTemplateRows': ['auto', '1fr', 'auto 1fr auto'],
  'gap': ['0', '4px', '8px', '12px', '16px', '20px', '24px']
};

// Format prop names into readable labels
const formatLabel = (propName) => {
  return propName
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
};

/**
 * Extract properties from a component's craft configuration and props
 */
export const extractComponentProps = (componentType, craftConfig = {}, actualProps = {}) => {
  const extractedProps = {};
  
  // Get default props from craft config
  const craftProps = craftConfig.props || {};
  
  // Get supported props from the component's custom config (try multiple patterns)
  const supportedProps = 
    craftConfig.custom?.styleMenu?.supportedProps || 
    craftConfig.related?.styleMenu?.supportedProps ||
    craftConfig.styleMenu?.supportedProps ||
    [];
  
  // If supportedProps is defined, use those
  if (supportedProps.length > 0) {
    supportedProps.forEach(propName => {
      // Use actual prop value if available, fallback to craft default, then to inferred default
      const currentValue = actualProps[propName] !== undefined 
        ? actualProps[propName] 
        : craftProps[propName];
      
      extractedProps[propName] = inferPropType(propName, currentValue, craftProps);
    });
  } else {
    // Fallback: extract from craft props
    Object.keys(craftProps).forEach(propName => {
      const currentValue = actualProps[propName] !== undefined 
        ? actualProps[propName] 
        : craftProps[propName];
      
      extractedProps[propName] = inferPropType(propName, currentValue, craftProps);
    });
    
    // Also include any additional props from actual component props that aren't in craft defaults
    Object.keys(actualProps).forEach(propName => {
      if (!extractedProps[propName] && propName !== 'children') {
        extractedProps[propName] = inferPropType(propName, actualProps[propName], craftProps);
      }
    });
  }
  
  return extractedProps;
};

/**
 * Get all available components with their extracted props
 */
export const getAllComponentsWithProps = (query, excludeNodeId = null) => {
  if (!query) return [];
  
  const nodes = query.getNodes();
  const components = [];
  
  Object.entries(nodes).forEach(([id, node]) => {
    // Skip the excluded node (usually the button that's being configured)
    if (id === excludeNodeId) return;
    
    const displayName = node.data.displayName || node.data.type?.craft?.displayName || 'Unknown';
    const craftConfig = node.data.type?.craft;
    const actualProps = node.data.props || {};
    
    // Extract props dynamically
    const extractedProps = extractComponentProps(displayName, craftConfig, actualProps);
    
    components.push({
      id,
      name: displayName,
      type: displayName,
      props: actualProps,
      extractedProps: extractedProps, // This is the dynamically extracted prop definitions
      craftConfig: craftConfig
    });
  });
  
  return components.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get properties for a specific component type (for when you know the component type but not the instance)
 */
export const getComponentTypeProps = (componentType, componentCraftConfig) => {
  return extractComponentProps(componentType, componentCraftConfig, {});
};

export default {
  extractComponentProps,
  getAllComponentsWithProps,
  getComponentTypeProps,
  inferPropType,
  formatLabel
};
