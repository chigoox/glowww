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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Check if user has access to AI features
    const hasAIAccess = userTier !== SUBSCRIPTION_TIERS.FREE;
    
    if (!hasAIAccess) {
      return NextResponse.json({ 
        error: 'AI-powered page creation is available for Pro, Business, and Admin users',
        code: 'UPGRADE_REQUIRED',
        currentTier: userTier
      }, { status: 403 });
    }

    const body = await request.json();
    const { prompt, businessType, tone } = body;

    // Validation
    if (!prompt || !businessType || !tone) {
      return NextResponse.json({ 
        error: 'Missing required fields: prompt, businessType, tone' 
      }, { status: 400 });
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (type, data) => {
          const eventData = `data: ${JSON.stringify({ type, data })}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        };

        try {
          // Send initial progress update
          sendEvent('progress', { 
            step: 'init', 
            message: 'Initializing AI generation...', 
            progress: 5 
          });

          // Load references
          sendEvent('progress', { 
            step: 'references', 
            message: 'Loading reference templates and examples...', 
            progress: 15 
          });
          
          const references = await getGenerationReferences(businessType);
          
          sendEvent('progress', { 
            step: 'ai-start', 
            message: 'Starting AI generation...', 
            progress: 25 
          });

          // Generate content with streaming
          await generatePageWithStreaming({
            prompt,
            businessType, 
            tone,
            references,
            onProgress: sendEvent
          });

          sendEvent('complete', { message: 'Page generation completed!' });
          
        } catch (error) {
          console.error('Streaming Generation Error:', error);
          sendEvent('error', { 
            message: error.message || 'Generation failed',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('AI Streaming Error:', error);
    return NextResponse.json({ 
      error: 'Failed to start generation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * Generate page content with streaming updates
 */
async function generatePageWithStreaming({ prompt, businessType, tone, references, onProgress }) {
  // Create the system prompt
  const systemPrompt = createSystemPrompt(businessType, tone, references);
  const userPrompt = `Generate a complete website page for: ${prompt}

Business Type: ${businessType}
Tone: ${tone}

IMPORTANT: Generate the page section by section in this order:
1. ROOT container
2. Hero section with title and subtitle
3. Features/Services section
4. About section  
5. Contact/CTA section

For each section, provide the complete JSON structure with all components.`;

  onProgress('progress', { 
    step: 'ai-generating', 
    message: 'AI is building your page...', 
    progress: 35 
  });

  // Use OpenAI streaming
  const stream = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    stream: true,
  });

  let fullResponse = '';
  let componentCount = 0;
  let currentSection = '';
  const generatedComponents = {};

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;
    
    // Try to detect when we're building different sections
    if (content.includes('"ROOT"') && !currentSection.includes('ROOT')) {
      currentSection = 'ROOT';
      componentCount++;
      onProgress('component', {
        step: 'building-root',
        message: 'Building page foundation...',
        progress: 40,
        section: 'ROOT',
        componentCount
      });
    } else if (content.includes('hero') && !currentSection.includes('hero')) {
      currentSection = 'hero';
      componentCount++;
      onProgress('component', {
        step: 'building-hero',
        message: 'Creating hero section...',
        progress: 50,
        section: 'hero',
        componentCount
      });
    } else if (content.includes('service') || content.includes('feature')) {
      if (!currentSection.includes('services')) {
        currentSection = 'services';
        componentCount++;
        onProgress('component', {
          step: 'building-services',
          message: 'Adding services section...',
          progress: 65,
          section: 'services',
          componentCount
        });
      }
    } else if (content.includes('about') && !currentSection.includes('about')) {
      currentSection = 'about';
      componentCount++;
      onProgress('component', {
        step: 'building-about',
        message: 'Building about section...',
        progress: 75,
        section: 'about',
        componentCount
      });
    } else if (content.includes('contact') || content.includes('cta')) {
      if (!currentSection.includes('contact')) {
        currentSection = 'contact';
        componentCount++;
        onProgress('component', {
          step: 'building-contact',
          message: 'Adding contact section...',
          progress: 85,
          section: 'contact',
          componentCount
        });
      }
    }

    // Try to parse partial JSON and send components as they're built
    if (content.includes('}') && fullResponse.includes('{')) {
      try {
        // Try to extract complete components from the response so far
        const partialComponents = extractCompletedComponents(fullResponse);
        if (partialComponents && Object.keys(partialComponents).length > Object.keys(generatedComponents).length) {
          // We have new completed components
          const newComponents = {};
          for (const [key, component] of Object.entries(partialComponents)) {
            if (!generatedComponents[key]) {
              newComponents[key] = component;
              generatedComponents[key] = component;
            }
          }
          
          if (Object.keys(newComponents).length > 0) {
            onProgress('partial', {
              message: `Built ${Object.keys(newComponents).length} new component(s)`,
              progress: Math.min(40 + (componentCount * 8), 90),
              newComponents,
              totalComponents: Object.keys(generatedComponents).length
            });
          }
        }
      } catch (e) {
        // Ignore parsing errors during streaming
      }
    }
  }

  onProgress('progress', { 
    step: 'finalizing', 
    message: 'Finalizing page structure...', 
    progress: 95 
  });

  // Parse the final response
  try {
    let finalPageData = JSON.parse(fullResponse);
    
    // Validate and fix the structure
    finalPageData = validateAndFixCraftJSFormat(finalPageData);
    
    onProgress('final', {
      message: 'Page generated successfully!',
      progress: 100,
      pageData: finalPageData,
      componentsBuilt: Object.keys(finalPageData).length
    });
    
  } catch (parseError) {
    // Try to extract JSON from response
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let finalPageData = JSON.parse(jsonMatch[0]);
        finalPageData = validateAndFixCraftJSFormat(finalPageData);
        
        onProgress('final', {
          message: 'Page generated successfully!',
          progress: 100,
          pageData: finalPageData,
          componentsBuilt: Object.keys(finalPageData).length
        });
        
      } catch (extractError) {
        console.error('Could not parse final JSON');
        // Send fallback structure
        const fallbackData = generateFallbackStructure(prompt, businessType, tone);
        onProgress('final', {
          message: 'Generated with fallback structure',
          progress: 100,
          pageData: fallbackData,
          componentsBuilt: Object.keys(fallbackData).length,
          fallback: true
        });
      }
    } else {
      throw new Error('Could not parse AI response as JSON');
    }
  }
}

/**
 * Extract completed components from partial JSON response
 */
function extractCompletedComponents(partialJson) {
  try {
    // Look for complete component definitions
    const componentRegex = /"([^"]+)":\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const matches = partialJson.match(componentRegex);
    
    if (!matches) return null;
    
    const components = {};
    for (const match of matches) {
      try {
        const cleanMatch = match.endsWith(',') ? match.slice(0, -1) : match;
        const componentJson = `{${cleanMatch}}`;
        const parsed = JSON.parse(componentJson);
        Object.assign(components, parsed);
      } catch (e) {
        // Skip invalid components
      }
    }
    
    return Object.keys(components).length > 0 ? components : null;
  } catch (error) {
    return null;
  }
}

// Import the utility functions from the original route
async function getGenerationReferences(businessType) {
  const references = {
    templates: [],
    examples: []
  };

  try {
    // Try to fetch top templates
    const templateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/templates?action=top&limit=5`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (templateResponse.ok) {
      const templateData = await templateResponse.json();
      references.templates = templateData.templates || [];
    }
  } catch (error) {
    console.warn('Could not fetch templates:', error.message);
  }

  // Load AI example files
  try {
    const examplesPath = path.join(process.cwd(), 'public', 'AI Website Generator Examples');
    const files = fs.readdirSync(examplesPath).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(examplesPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const example = JSON.parse(content);
        
        const isAlphaStructure = file.startsWith('alpha');
        const matchesBusinessType = example.businessTypes && example.businessTypes.includes(businessType.toLowerCase());
        
        if (isAlphaStructure || matchesBusinessType) {
          references.examples.push({
            name: file.replace('.json', ''),
            isStructural: isAlphaStructure,
            ...example
          });
        }
      } catch (err) {
        console.warn(`Could not load example file ${file}:`, err.message);
      }
    }
  } catch (error) {
    console.warn('Could not load example files:', error.message);
  }

  return references;
}

function createSystemPrompt(businessType, tone, references) {
  const structuralExamples = references.examples.filter(e => e.isStructural);
  const patternExamples = references.examples.filter(e => !e.isStructural);
  
  const patternInfo = patternExamples.length > 0
    ? `Design patterns to follow:\n${patternExamples.map(e => `- ${e.name}: ${e.description || 'Design pattern'}`).join('\n')}\n`
    : '';

  const structuralInfo = structuralExamples.length > 0
    ? `\nSTRUCTURAL EXAMPLES:\n${structuralExamples.map(e => {
        const structure = e.ROOT ? JSON.stringify(e, null, 2) : 'No structure available';
        return `${e.name.toUpperCase()}:\n${structure.substring(0, 2000)}...`;
      }).join('\n\n')}`
    : '';

  return `You are an expert web designer creating modern, professional websites using Craft.js components.

${patternInfo}${structuralInfo}

BUSINESS TYPE: ${businessType} - ${getBusinessTypeCharacteristics(businessType)}
TONE: ${tone} - ${getToneCharacteristics(tone)}

CRITICAL: Return ONLY valid JSON in this EXACT Craft.js format:

{
  "ROOT": {
    "type": { "resolvedName": "Root" },
    "isCanvas": true,
    "props": { ... },
    "displayName": "Root",
    "custom": { "styleMenu": { "supportedProps": [...] } },
    "parent": null,
    "hidden": false,
    "nodes": ["section1", "section2"],
    "linkedNodes": {}
  },
  "section1": {
    "type": { "resolvedName": "FlexBox" },
    "isCanvas": true,
    "props": { ... },
    "displayName": "Section Name",
    "custom": { "styleMenu": { "supportedProps": [...] } },
    "parent": "ROOT",
    "hidden": false,
    "nodes": [...],
    "linkedNodes": {}
  }
}

COMPONENT TYPES: Root, FlexBox, GridBox, Text, CraftButton, Link, Image
STYLING: Modern colors, proper spacing, typography 16-48px, border-radius 4-12px, box-shadows
IMAGES: Use https://source.unsplash.com/WIDTHxHEIGHT/?SEARCH_TERMS

Return ONLY the JSON object. No explanations.`;
}

function getBusinessTypeCharacteristics(businessType) {
  const characteristics = {
    technology: 'modern, innovative, cutting-edge, professional',
    healthcare: 'trustworthy, clean, professional, caring, medical',
    finance: 'trustworthy, secure, professional, authoritative',
    education: 'approachable, informative, structured, inspiring',
    ecommerce: 'attractive, user-friendly, conversion-focused',
    consulting: 'professional, authoritative, results-driven',
    creative: 'artistic, unique, inspiring, visually striking',
    nonprofit: 'inspiring, impactful, community-focused',
    personal: 'unique, authentic, personal, memorable',
    other: 'professional, modern, user-focused'
  };
  
  return characteristics[businessType.toLowerCase()] || characteristics.other;
}

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

function validateAndFixCraftJSFormat(data) {
  if (data.ROOT && data.ROOT.type && data.ROOT.type.resolvedName === 'Root') {
    return addRequiredCraftJSProperties(data);
  }
  
  if (data.id && data.type && data.components) {
    const convertedData = convertToCraftJSFormat(data);
    return addRequiredCraftJSProperties(convertedData);
  }
  
  return addRequiredCraftJSProperties(data);
}

function addRequiredCraftJSProperties(data) {
  const supportedPropsByType = {
    'Root': ["width", "height", "backgroundColor", "className"],
    'FlexBox': ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "gap", "padding", "margin", "backgroundColor", "borderRadius", "boxShadow"],
    'GridBox': ["width", "height", "display", "gridTemplateColumns", "gap", "padding", "margin", "backgroundColor", "borderRadius"],
    'Text': ["text", "fontSize", "fontWeight", "color", "textAlign", "lineHeight", "margin", "padding"],
    'CraftButton': ["text", "backgroundColor", "color", "padding", "borderRadius", "fontSize", "fontWeight", "border", "cursor", "boxShadow"],
    'Link': ["text", "href", "color", "fontSize", "fontWeight", "margin", "padding"],
    'Image': ["src", "alt", "width", "height", "objectFit", "borderRadius", "boxShadow"]
  };

  Object.keys(data).forEach(componentId => {
    const component = data[componentId];
    if (component && component.type && component.type.resolvedName) {
      const componentType = component.type.resolvedName;
      
      if (!component.custom) {
        component.custom = {
          styleMenu: {
            supportedProps: supportedPropsByType[componentType] || ["width", "height", "padding", "margin"]
          }
        };
      }
      
      if (component.hidden === undefined) {
        component.hidden = false;
      }
    }
  });

  return data;
}

function generateFallbackStructure(prompt, businessType, tone) {
  // Return a simple fallback structure
  return {
    "ROOT": {
      "type": { "resolvedName": "Root" },
      "isCanvas": true,
      "props": {
        "width": "100%",
        "height": "auto",
        "backgroundColor": "#ffffff"
      },
      "displayName": "Root",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "backgroundColor"]
        }
      },
      "parent": null,
      "hidden": false,
      "nodes": ["hero-section"],
      "linkedNodes": {}
    },
    "hero-section": {
      "type": { "resolvedName": "FlexBox" },
      "isCanvas": true,
      "props": {
        "width": "100%",
        "height": "400px",
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "justifyContent": "center",
        "backgroundColor": "#f8f9fa",
        "padding": "40px 20px"
      },
      "displayName": "Hero Section",
      "custom": {
        "styleMenu": {
          "supportedProps": ["width", "height", "display", "flexDirection", "alignItems", "justifyContent", "padding", "backgroundColor"]
        }
      },
      "parent": "ROOT",
      "hidden": false,
      "nodes": ["hero-title"],
      "linkedNodes": {}
    },
    "hero-title": {
      "type": { "resolvedName": "Text" },
      "isCanvas": false,
      "props": {
        "text": `Welcome to ${prompt}`,
        "fontSize": 36,
        "fontWeight": "700",
        "color": "#333333",
        "textAlign": "center"
      },
      "displayName": "Hero Title",
      "custom": {
        "styleMenu": {
          "supportedProps": ["text", "fontSize", "fontWeight", "color", "textAlign"]
        }
      },
      "parent": "hero-section",
      "hidden": false,
      "nodes": [],
      "linkedNodes": {}
    }
  };
}