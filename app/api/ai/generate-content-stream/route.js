import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/apiAuth';
import { getUserSubscription, SUBSCRIPTION_TIERS } from '@/lib/subscriptions';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get generation references (top templates + example files)
 */
async function getGenerationReferences(businessType) {
  const references = {
    templates: [],
    examples: []
  };

  try {
    // Step 1: Try to fetch top 5 templates from the database
    const templateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/templates?action=top&limit=5`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (templateResponse.ok) {
      const templateData = await templateResponse.json();
      references.templates = templateData.templates || [];
      console.log(`📄 Found ${references.templates.length} top templates`);
    }
  } catch (error) {
    console.warn('Could not fetch top templates:', error.message);
  }

  // Step 2: Load AI example files
  try {
    const examplesPath = path.join(process.cwd(), 'public', 'AI Website Generator Examples');
    const files = fs.readdirSync(examplesPath).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(examplesPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const example = JSON.parse(content);
        
        // Check if example matches business type or is a complete structural template
        const isAlphaStructure = file.startsWith('alpha');
        const matchesBusinessType = example.businessTypes && example.businessTypes.includes(businessType.toLowerCase());
        
        if (isAlphaStructure || matchesBusinessType) {
          references.examples.push({
            name: file.replace('.json', ''),
            isStructural: isAlphaStructure, // Flag to identify complete structures
            ...example
          });
        }
      } catch (err) {
        console.warn(`Could not load example file ${file}:`, err.message);
      }
    }
    
    console.log(`📋 Loaded ${references.examples.length} example files`);
  } catch (error) {
    console.warn('Could not load example files:', error.message);
  }

  return references;
}

/**
 * Add required custom and hidden properties to all components
 */
function addRequiredCraftJSProperties(data) {
  const supportedPropsByType = {
    'Root': ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "display", "position", "backgroundColor", "background", "className"],
    'FlexBox': ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow", "background", "backgroundSize", "backgroundPosition"],
    'GridBox': ["width", "height", "display", "gridTemplateColumns", "gridTemplateRows", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"],
    'Text': ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"],
    'CraftButton': ["text", "backgroundColor", "color", "padding", "borderRadius", "fontSize", "fontWeight", "border", "cursor", "boxShadow", "transition"],
    'Link': ["text", "href", "color", "fontSize", "fontWeight", "textDecoration", "margin", "padding"],
    'Image': ["src", "alt", "width", "height", "objectFit", "borderRadius", "boxShadow", "margin", "padding"]
  };

  Object.keys(data).forEach(componentId => {
    const component = data[componentId];
    if (component && component.type && component.type.resolvedName) {
      const componentType = component.type.resolvedName;
      
      // Add custom property if missing
      if (!component.custom) {
        component.custom = {
          styleMenu: {
            supportedProps: supportedPropsByType[componentType] || ["width", "height", "padding", "margin", "backgroundColor"]
          }
        };
      }
      
      // Add hidden property if missing
      if (component.hidden === undefined) {
        component.hidden = false;
      }
    }
  });

  return data;
}

/**
 * Create system prompt for AI generation
 */
function createSystemPrompt(businessType, tone, references) {
  const templatesInfo = references.templates.length > 0 
    ? `Here are ${references.templates.length} popular templates for reference:\n${references.templates.map(t => `- ${t.name} (${t.category}): ${t.description}`).join('\n')}\n`
    : '';
    
  // Separate structural examples (alpha files) from pattern examples
  const structuralExamples = references.examples.filter(e => e.isStructural);
  const patternExamples = references.examples.filter(e => !e.isStructural);
  
  const patternInfo = patternExamples.length > 0
    ? `Here are ${patternExamples.length} design patterns to follow:\n${patternExamples.map(e => `- ${e.name}: ${e.description || 'Design pattern'} (Sections: ${e.structure?.sections?.join(', ') || 'N/A'})`).join('\n')}\n`
    : '';

  // Include complete structural examples for the AI to learn from
  const structuralInfo = structuralExamples.length > 0
    ? `\nSTRUCTURAL EXAMPLES TO LEARN FROM:\nStudy these complete Craft.js structures and adapt their patterns:\n${structuralExamples.map(e => {
        // Only include a subset of the structure to avoid token limits
        const structure = e.ROOT ? JSON.stringify(e, null, 2) : 'No structure available';
        return `\n--- ${e.name.toUpperCase()} STRUCTURE ---\n${structure.length > 3000 ? structure.substring(0, 3000) + '\n... (truncated)' : structure}\n`;
      }).join('')}`
    : '';

  return `You are an expert web designer creating modern, professional websites using Craft.js components.

${templatesInfo}${patternInfo}${structuralInfo}

COMPONENT TYPES AVAILABLE:
- Root: Main container
- FlexBox: Flexible layout container (use for sections, rows, columns)
- GridBox: Grid layout container
- Text: Text content
- CraftButton: Interactive buttons
- Link: Navigation links
- Image: Images and media

BUSINESS TYPE FOCUS: ${businessType}
Design should reflect: ${getBusinessTypeCharacteristics(businessType)}

TONE REQUIREMENTS: ${tone}
Content should be: ${getToneCharacteristics(tone)}

CRITICAL: You MUST return a JSON object in this EXACT Craft.js format:

{
  "ROOT": {
    "type": { "resolvedName": "Root" },
    "isCanvas": true,
    "props": { ... },
    "displayName": "Root",
    "custom": {
      "styleMenu": {
        "supportedProps": ["width", "height", "backgroundColor", "display", "className"]
      }
    },
    "parent": null,
    "hidden": false,
    "nodes": ["section1", "section2"],
    "linkedNodes": {}
  },
  "section1": {
    "type": { "resolvedName": "FlexBox" },
    "isCanvas": true,
    "props": { 
      "width": "100%",
      "display": "flex",
      "flexDirection": "column"
    },
    "displayName": "Section Name",
    "custom": {
      "styleMenu": {
        "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "padding", "margin", "backgroundColor"]
      }
    },
    "parent": "ROOT",
    "hidden": false,
    "nodes": ["child1", "child2"],
    "linkedNodes": {}
  },
  "child1": {
    "type": { "resolvedName": "Text" },
    "isCanvas": false,
    "props": {
      "text": "Content here",
      "fontSize": 24,
      "color": "#333"
    },
    "displayName": "Component Name",
    "custom": {
      "styleMenu": {
        "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "margin", "padding"]
      }
    },
    "parent": "section1",
    "hidden": false,
    "nodes": [],
    "linkedNodes": {}
  }
}

IMAGE REQUIREMENTS:
For Image components, use Unsplash URLs with relevant search terms:
- Format: https://images.unsplash.com/photo-[ID]?w=800&q=80&auto=format&fit=crop
- Or use search-based: https://source.unsplash.com/800x600/?[search-terms]
- Business-specific searches:
  * Technology: "technology,computer,office,modern"
  * Healthcare: "medical,health,doctor,hospital"
  * Finance: "business,finance,office,professional"
  * Education: "education,students,learning,books"
  * Ecommerce: "shopping,products,retail,store"
  * Creative: "art,design,creative,studio"
  * Food: "food,restaurant,cooking,chef"
  * Travel: "travel,vacation,adventure,destination"
  * Fashion: "fashion,style,clothing,model"
  * Real Estate: "house,home,architecture,property"

Example Image component:
{
  "hero-image": {
    "type": { "resolvedName": "Image" },
    "isCanvas": false,
    "props": {
      "src": "https://source.unsplash.com/1200x600/?technology,modern,office",
      "alt": "Modern technology office space",
      "width": "100%",
      "height": "400px",
      "objectFit": "cover",
      "borderRadius": "8px"
    },
    "displayName": "Hero Image",
    "custom": {
      "styleMenu": {
        "supportedProps": ["src", "alt", "width", "height", "objectFit", "borderRadius", "boxShadow", "margin", "padding"]
      }
    },
    "parent": "hero-section",
    "hidden": false,
    "nodes": [],
    "linkedNodes": {}
  }
}

STYLING REQUIREMENTS:
- Use modern colors: whites (#ffffff), grays (#f8f9fa, #e9ecef), accent colors
- Add proper spacing: padding, margins, gaps
- Use modern typography: fontSize 16-48px, proper fontWeight
- Add visual hierarchy with different font sizes
- Use flexbox layouts with proper alignment
- Add hover effects for buttons: hover:opacity-80
- Make backgrounds interesting with gradients or colors
- Add proper border-radius for modern look (4-12px)
- Use box shadows for depth: "0 4px 6px rgba(0,0,0,0.1)"

REQUIRED PROPERTIES FOR EACH COMPONENT:
- type: { "resolvedName": "ComponentName" }
- isCanvas: true for containers (Root, FlexBox, GridBox), false for content (Text, CraftButton, Link, Image)
- props: All styling and content properties
- displayName: Human-readable name
- custom: { "styleMenu": { "supportedProps": ["array", "of", "editable", "props"] } }
- parent: ID of parent component (null only for ROOT)
- hidden: false (always false for all components)
- nodes: Array of child component IDs
- linkedNodes: Always empty object {}

CUSTOM STYLE MENU PROPS BY COMPONENT TYPE:
- Root: ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "display", "position", "backgroundColor", "background", "className"]
- FlexBox: ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
- GridBox: ["width", "height", "display", "gridTemplateColumns", "gridTemplateRows", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
- Text: ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
- CraftButton: ["text", "backgroundColor", "color", "padding", "borderRadius", "fontSize", "fontWeight", "border", "cursor", "boxShadow", "transition"]
- Link: ["text", "href", "color", "fontSize", "fontWeight", "textDecoration", "margin", "padding"]
- Image: ["src", "alt", "width", "height", "objectFit", "borderRadius", "boxShadow", "margin", "padding"]

STRUCTURE REQUIREMENTS:
1. Start with ROOT as parent container (parent: null)
2. Create logical sections (hero, features, about, contact, etc.)
3. Use FlexBox for most layouts, GridBox for complex grids
4. Include proper styling with colors, typography, spacing
5. Make it responsive and modern
6. Generate realistic content that matches the business and tone

OUTPUT FORMAT:
Return ONLY the JSON object. No explanations, no markdown, no code blocks. Just the raw JSON that can be parsed directly.`;
}

/**
 * Get business type characteristics for AI prompt
 */
function getBusinessTypeCharacteristics(businessType) {
  const characteristics = {
    technology: 'modern, innovative, cutting-edge, professional',
    healthcare: 'trustworthy, clean, professional, caring, medical',
    finance: 'trustworthy, secure, professional, authoritative',
    education: 'approachable, informative, structured, inspiring',
    ecommerce: 'attractive, user-friendly, conversion-focused, trustworthy',
    consulting: 'professional, authoritative, results-driven, expert',
    creative: 'artistic, unique, inspiring, visually striking',
    nonprofit: 'inspiring, impactful, community-focused, heartfelt',
    personal: 'unique, authentic, personal, memorable',
    other: 'professional, modern, user-focused'
  };
  
  return characteristics[businessType.toLowerCase()] || characteristics.other;
}

/**
 * Get tone characteristics for AI prompt
 */
function getToneCharacteristics(tone) {
  const characteristics = {
    professional: 'formal, authoritative, credible, polished',
    friendly: 'warm, approachable, conversational, welcoming',
    modern: 'contemporary, sleek, minimalist, forward-thinking',
    luxury: 'premium, exclusive, sophisticated, high-end',
    playful: 'fun, energetic, creative, engaging',
    authoritative: 'expert, commanding, trustworthy, knowledgeable'
  };
  
  return characteristics[tone.toLowerCase()] || characteristics.professional;
}

/**
 * Generate fallback structure if AI fails
 */
function generateFallbackStructure(prompt, businessType, tone) {
  // Get appropriate Unsplash search terms for business type
  const getUnsplashSearchTerms = (type) => {
    const searchTerms = {
      technology: 'technology,modern,office,computer',
      healthcare: 'medical,health,doctor,professional',
      finance: 'business,finance,office,professional',
      education: 'education,students,learning,books',
      ecommerce: 'shopping,products,retail,store',
      consulting: 'business,consulting,meeting,professional',
      creative: 'art,design,creative,studio',
      nonprofit: 'community,people,helping,volunteer',
      personal: 'person,professional,portrait,workspace',
      other: 'business,professional,modern,office'
    };
    return searchTerms[type.toLowerCase()] || searchTerms.other;
  };

  const searchTerms = getUnsplashSearchTerms(businessType);
  const heroImageUrl = `https://source.unsplash.com/1200x600/?${searchTerms}`;
  const aboutImageUrl = `https://source.unsplash.com/600x400/?${searchTerms},team`;

  const fallbackStructure = {
    "ROOT": {
      "type": { "resolvedName": "Root" },
      "isCanvas": true,
      "props": {
        "width": "100%",
        "height": "auto",
        "minHeight": "100vh",
        "backgroundColor": "#ffffff",
        "className": "w-full min-h-screen"
      },
      "displayName": "Root",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "display", "position", "backgroundColor", "background", "className"]
        }
      },
      "parent": null,
      "hidden": false,
      "nodes": ["hero-section", "features-section", "about-section", "cta-section"],
      "linkedNodes": {}
    },
    "hero-section": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "width": "100%",
        "height": "80vh",
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "justifyContent": "center",
        "padding": "60px 20px",
        "background": `linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3)), url('${heroImageUrl}')`,
        "backgroundSize": "cover",
        "backgroundPosition": "center",
        "color": "#ffffff",
        "textAlign": "center"
      },
      "displayName": "Hero Section",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow", "background", "backgroundSize", "backgroundPosition"]
        }
      },
      "parent": "ROOT",
      "hidden": false,
      "nodes": ["hero-title", "hero-subtitle", "hero-button"],
      "linkedNodes": {}
    },
    "hero-title": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": `Welcome to ${prompt}`,
        "fontSize": 56,
        "fontWeight": "700",
        "color": "#ffffff",
        "textAlign": "center",
        "margin": "0 0 24px 0",
        "textShadow": "2px 2px 4px rgba(0,0,0,0.5)",
        "maxWidth": "800px"
      },
      "displayName": "Hero Title",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "hero-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "hero-subtitle": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": `Professional ${businessType} services with a ${tone} approach. We deliver exceptional results that exceed your expectations.`,
        "fontSize": 24,
        "fontWeight": "400",
        "color": "#f8f9fa",
        "textAlign": "center",
        "margin": "0 0 40px 0",
        "lineHeight": 1.6,
        "maxWidth": "600px",
        "opacity": 0.95
      },
      "displayName": "Hero Subtitle",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "hero-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "hero-button": {
      "type": { "resolvedName": "CraftButton" },
      "isCanvas": false,
      "props": {
        "text": "Get Started Today",
        "backgroundColor": "#007bff",
        "color": "#ffffff",
        "padding": "16px 32px",
        "borderRadius": 8,
        "fontSize": 18,
        "fontWeight": "600",
        "border": "none",
        "cursor": "pointer",
        "boxShadow": "0 4px 6px rgba(0,0,0,0.1)",
        "transition": "all 0.3s ease"
      },
      "displayName": "Hero Button",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "backgroundColor", "color", "padding", "borderRadius", "fontSize", "fontWeight", "border", "cursor", "boxShadow", "transition"]
        }
      },
      "parent": "hero-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "features-section": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "width": "100%",
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "padding": "80px 20px",
        "backgroundColor": "#f8f9fa"
      },
      "displayName": "Features Section",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
        }
      },
      "parent": "ROOT",
      "hidden": false,
      "nodes": ["features-title", "features-grid"],
      "linkedNodes": {}
    },
    "features-title": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "Why Choose Us",
        "fontSize": 42,
        "fontWeight": "700",
        "color": "#333333",
        "textAlign": "center",
        "margin": "0 0 60px 0"
      },
      "displayName": "Features Title",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "features-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "features-grid": {
      "type": { "resolvedName": "GridBox" },
      "isCanvas": true,
      "props": {
        "width": "100%",
        "maxWidth": "1200px",
        "display": "grid",
        "gridTemplateColumns": "repeat(auto-fit, minmax(300px, 1fr))",
        "gap": "40px",
        "margin": "0 auto"
      },
      "displayName": "Features Grid",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "gridTemplateColumns", "gridTemplateRows", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
        }
      },
      "parent": "features-section",
      "hidden": false,
      "nodes": ["feature-1", "feature-2", "feature-3"],
      "linkedNodes": {}
    },
    "feature-1": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "textAlign": "center",
        "padding": "40px 20px",
        "backgroundColor": "#ffffff",
        "borderRadius": 12,
        "boxShadow": "0 4px 6px rgba(0,0,0,0.1)"
      },
      "displayName": "Feature 1",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
        }
      },
      "parent": "features-grid",
      "hidden": false,
      "nodes": ["feature-1-title", "feature-1-text"],
      "linkedNodes": {}
    },
    "feature-1-title": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "Expert Team",
        "fontSize": 24,
        "fontWeight": "600",
        "color": "#333333",
        "margin": "0 0 16px 0"
      },
      "displayName": "Feature 1 Title",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "feature-1",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "feature-1-text": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "Our experienced professionals deliver outstanding results with attention to detail.",
        "fontSize": 16,
        "color": "#666666",
        "lineHeight": 1.6
      },
      "displayName": "Feature 1 Text",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "feature-1",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "feature-2": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "textAlign": "center",
        "padding": "40px 20px",
        "backgroundColor": "#ffffff",
        "borderRadius": 12,
        "boxShadow": "0 4px 6px rgba(0,0,0,0.1)"
      },
      "displayName": "Feature 2",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
        }
      },
      "parent": "features-grid",
      "hidden": false,
      "nodes": ["feature-2-title", "feature-2-text"],
      "linkedNodes": {}
    },
    "feature-2-title": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "Quality Service",
        "fontSize": 24,
        "fontWeight": "600",
        "color": "#333333",
        "margin": "0 0 16px 0"
      },
      "displayName": "Feature 2 Title",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "feature-2",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "feature-2-text": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "We maintain the highest standards of quality in everything we do.",
        "fontSize": 16,
        "color": "#666666",
        "lineHeight": 1.6
      },
      "displayName": "Feature 2 Text",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "feature-2",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "feature-3": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "textAlign": "center",
        "padding": "40px 20px",
        "backgroundColor": "#ffffff",
        "borderRadius": 12,
        "boxShadow": "0 4px 6px rgba(0,0,0,0.1)"
      },
      "displayName": "Feature 3",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
        }
      },
      "parent": "features-grid",
      "hidden": false,
      "nodes": ["feature-3-title", "feature-3-text"],
      "linkedNodes": {}
    },
    "feature-3-title": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "Fast Delivery",
        "fontSize": 24,
        "fontWeight": "600",
        "color": "#333333",
        "margin": "0 0 16px 0"
      },
      "displayName": "Feature 3 Title",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "feature-3",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "feature-3-text": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "Quick turnaround times without compromising on quality.",
        "fontSize": 16,
        "color": "#666666",
        "lineHeight": 1.6
      },
      "displayName": "Feature 3 Text",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "feature-3",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "about-section": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "width": "100%",
        "display": "flex",
        "flexDirection": "row",
        "alignItems": "center",
        "padding": "80px 20px",
        "backgroundColor": "#ffffff",
        "maxWidth": "1200px",
        "margin": "0 auto",
        "gap": "60px"
      },
      "displayName": "About Section",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
        }
      },
      "parent": "ROOT",
      "hidden": false,
      "nodes": ["about-content", "about-image"],
      "linkedNodes": {}
    },
    "about-content": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "display": "flex",
        "flexDirection": "column",
        "flex": 1
      },
      "displayName": "About Content",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
        }
      },
      "parent": "about-section",
      "hidden": false,
      "nodes": ["about-title", "about-text"],
      "linkedNodes": {}
    },
    "about-title": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "About Our Company",
        "fontSize": 36,
        "fontWeight": "700",
        "color": "#333333",
        "margin": "0 0 24px 0"
      },
      "displayName": "About Title",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "about-content",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "about-text": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": `We are a leading ${businessType} company dedicated to providing exceptional service with a ${tone} approach. Our team combines years of experience with innovative solutions to deliver results that exceed expectations.`,
        "fontSize": 18,
        "color": "#666666",
        "lineHeight": 1.8
      },
      "displayName": "About Text",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "about-content",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "about-image": {
      "type": { "resolvedName": "Image" },
      "isCanvas": false,
      "props": {
        "src": aboutImageUrl,
        "alt": `Professional ${businessType} team`,
        "width": "500px",
        "height": "400px",
        "objectFit": "cover",
        "borderRadius": 12,
        "boxShadow": "0 8px 16px rgba(0,0,0,0.1)"
      },
      "displayName": "About Image",
      "custom": {
        "styleMenu": {
          "supportedProps": ["src", "alt", "width", "height", "objectFit", "borderRadius", "boxShadow", "margin", "padding"]
        }
      },
      "parent": "about-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "cta-section": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "width": "100%",
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "justifyContent": "center",
        "padding": "80px 20px",
        "backgroundColor": "#007bff",
        "color": "#ffffff",
        "textAlign": "center"
      },
      "displayName": "CTA Section",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"]
        }
      },
      "parent": "ROOT",
      "hidden": false,
      "nodes": ["cta-title", "cta-text", "cta-button"],
      "linkedNodes": {}
    },
    "cta-title": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "Ready to Get Started?",
        "fontSize": 42,
        "fontWeight": "700",
        "color": "#ffffff",
        "textAlign": "center",
        "margin": "0 0 24px 0"
      },
      "displayName": "CTA Title",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "cta-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "cta-text": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": "Contact us today to learn how we can help you achieve your goals.",
        "fontSize": 20,
        "color": "#e3f2fd",
        "textAlign": "center",
        "margin": "0 0 40px 0",
        "maxWidth": "600px"
      },
      "displayName": "CTA Text",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding", "textShadow"]
        }
      },
      "parent": "cta-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    },
    "cta-button": {
      "type": { "resolvedName": "CraftButton" },
      "isCanvas": false,
      "props": {
        "text": "Contact Us Now",
        "backgroundColor": "#ffffff",
        "color": "#007bff",
        "padding": "16px 32px",
        "borderRadius": 8,
        "fontSize": 18,
        "fontWeight": "600",
        "border": "none",
        "cursor": "pointer",
        "boxShadow": "0 4px 6px rgba(0,0,0,0.2)"
      },
      "displayName": "CTA Button",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "backgroundColor", "color", "padding", "borderRadius", "fontSize", "fontWeight", "border", "cursor", "boxShadow", "transition"]
        }
      },
      "parent": "cta-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    }
  };
  
  // Apply required Craft.js properties to the fallback structure
  return addRequiredCraftJSProperties(fallbackStructure);
}

export async function POST(request) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Get user's subscription tier
    const userSubscription = await getUserSubscription(authResult.user.uid);
    const userTier = userSubscription.tier;

    console.log('🔍 AI Streaming Generation API Debug:', {
      userId: authResult.user.uid,
      userTier,
      subscription: userSubscription,
      isAdmin: userTier === SUBSCRIPTION_TIERS.ADMIN,
      isFree: userTier === SUBSCRIPTION_TIERS.FREE
    });

    // Check if user has access to AI features (all tiers except free)
    const hasAIAccess = userTier !== SUBSCRIPTION_TIERS.FREE;
    
    if (!hasAIAccess) {
      return NextResponse.json({ 
        error: 'AI-powered page creation is available for Pro, Business, and Admin users',
        code: 'UPGRADE_REQUIRED',
        currentTier: userTier,
        requiredTiers: ['pro', 'business', 'admin']
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      prompt,
      businessType,
      tone
    } = body;

    // Validation
    if (!prompt || !businessType || !tone) {
      return NextResponse.json({ 
        error: 'Missing required fields: prompt, businessType, tone' 
      }, { status: 400 });
    }

    // Step 1: Get top templates and example files as references
    const references = await getGenerationReferences(businessType);

    // Create system prompt
    const systemPrompt = createSystemPrompt(businessType, tone, references);

    const userPrompt = `Generate a complete website page for: ${prompt}

Business Type: ${businessType}
Tone: ${tone}

Requirements:
1. Create a full page structure with multiple sections
2. Use the provided component types and structure patterns
3. Generate realistic content that matches the business type and tone
4. Include proper styling and layout properties
5. Make it visually appealing and modern
6. Return a complete Craft.js JSON structure ready to use`;

    // Create Server-Sent Events response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false;
        
        // Helper function to safely enqueue data
        const safeEnqueue = (data) => {
          try {
            if (!isControllerClosed && controller) {
              controller.enqueue(data);
            }
          } catch (error) {
            console.warn('Controller enqueue failed:', error.message);
            isControllerClosed = true;
          }
        };
        
        // Helper function to safely close controller
        const safeClose = () => {
          try {
            if (!isControllerClosed && controller) {
              controller.close();
              isControllerClosed = true;
            }
          } catch (error) {
            console.warn('Controller close failed:', error.message);
            isControllerClosed = true;
          }
        };

        try {
          let abortTimeout;
          
          // Send initial status
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'status', 
            message: 'Initializing AI generation...' 
          })}\n\n`));

          // Check if client disconnected early
          if (isControllerClosed) {
            console.log('Client disconnected early, aborting generation');
            return;
          }

          // Create an abort controller for the OpenAI request
          const abortController = new AbortController();
          abortTimeout = setTimeout(() => {
            abortController.abort();
          }, 120000); // 2 minute timeout

          // Generate content with OpenAI streaming
          const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4000,
            stream: true
          }, {
            signal: abortController.signal
          });

          let fullContent = '';
          let chunkCount = 0;
          
          for await (const chunk of completion) {
            // Check if controller is still open
            if (isControllerClosed) {
              console.log('Controller closed during streaming, aborting...');
              break;
            }
            
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              chunkCount++;
              
              // Send chunk to client
              const data = JSON.stringify({ 
                type: 'chunk', 
                content: content,
                fullContent: fullContent,
                chunkNumber: chunkCount
              });
              
              safeEnqueue(encoder.encode(`data: ${data}\n\n`));
              
              // Minimal delay for streaming performance
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }

          // Clear the timeout since we completed successfully
          clearTimeout(abortTimeout);

          // Validate and clean up the final JSON
          let finalJson;
          try {
            // Clean up the content - remove any markdown formatting if present
            let cleanContent = fullContent.trim();
            if (cleanContent.startsWith('```json')) {
              cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            }
            if (cleanContent.startsWith('```')) {
              cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            // Parse and validate the JSON
            finalJson = JSON.parse(cleanContent);
            
            // Apply required Craft.js properties
            finalJson = addRequiredCraftJSProperties(finalJson);
            
            // Update the full content with the enhanced JSON
            fullContent = JSON.stringify(finalJson, null, 2);
            
          } catch (error) {
            console.error('JSON parsing error, using fallback structure:', error);
            // If JSON is invalid, create a fallback structure
            finalJson = generateFallbackStructure(prompt, businessType, tone);
            fullContent = JSON.stringify(finalJson, null, 2);
          }

          // Send completion signal if controller is still open
          if (!isControllerClosed) {
            const completeData = JSON.stringify({
              type: 'complete',
              content: fullContent,
              json: finalJson,
              totalChunks: chunkCount
            });
            
            safeEnqueue(encoder.encode(`data: ${completeData}\n\n`));
          }
          
          safeClose();

        } catch (error) {
          console.error('Streaming error:', error);
          
          // Clear timeout on error
          if (abortTimeout) {
            clearTimeout(abortTimeout);
          }
          
          // Send error and fallback only if controller is still open
          if (!isControllerClosed) {
            try {
              const fallbackContent = JSON.stringify(generateFallbackStructure(prompt, businessType, tone), null, 2);
              
              const errorData = JSON.stringify({
                type: 'error',
                error: error.message,
                fallback: fallbackContent
              });
              
              safeEnqueue(encoder.encode(`data: ${errorData}\n\n`));
            } catch (fallbackError) {
              console.error('Error creating fallback:', fallbackError);
            }
          }
          
          safeClose();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({
      error: 'Failed to generate content',
      details: error.message
    }, { status: 500 });
  }
}