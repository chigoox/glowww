/**
 * AI Content Generation API
 * Uses OpenAI to generate page content based on templates and user prompts
 * Available to Pro, Business, and Admin users (not Free tier)
 * 
 * NEW: Automatically uses top templates and example files as references
 */

import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/apiAuth';
import { getUserSubscription, SUBSCRIPTION_TIERS } from '../../../../lib/subscriptions';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Get user's subscription tier
    const userSubscription = await getUserSubscription(authResult.user.uid);
    const userTier = userSubscription.tier;

    console.log('🔍 AI Generation API Debug:', {
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

    // Step 1: Get top templates and example files
    const references = await getGenerationReferences(businessType);

    // Step 2: Generate content with OpenAI
    const generatedPage = await generateCompletePageStructure({
      prompt,
      businessType,
      tone,
      references
    });

    return NextResponse.json({
      success: true,
      pageData: generatedPage,
      referencesUsed: references.templates.length + references.examples.length
    });

  } catch (error) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate content',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

async function generatePageContent({
  prompt,
  businessType,
  tone,
  templateAnalysis,
  templateName,
  templateCategory
}) {
  const systemPrompt = `You are an expert web designer and copywriter creating page content for a website builder. 

CONTEXT:
- Template: "${templateName}" (${templateCategory} category)
- Template has ${templateAnalysis?.componentCount || 0} components
- Layout style: ${templateAnalysis?.layoutStyle || 'basic'}
- Has hero section: ${templateAnalysis?.hasHero ? 'Yes' : 'No'}
- Has images: ${templateAnalysis?.hasImages ? 'Yes' : 'No'}
- Has buttons: ${templateAnalysis?.hasButtons ? 'Yes' : 'No'}

TASK:
Generate content for a ${businessType} business with a ${tone} tone.

REQUIREMENTS:
1. Create compelling, professional copy that matches the tone
2. Include specific calls-to-action appropriate for the business type
3. Generate realistic but not real contact information
4. Suggest appropriate image descriptions
5. Create content that works well with the template structure
6. Keep content concise and scannable
7. Include SEO-friendly headings and descriptions

BUSINESS TYPE GUIDELINES:
${getBusinessTypeGuidelines(businessType)}

TONE GUIDELINES:
${getToneGuidelines(tone)}

Return a JSON object with the following structure:
{
  "hero": {
    "headline": "Main headline",
    "subheadline": "Supporting text",
    "cta": "Call to action button text"
  },
  "sections": [
    {
      "title": "Section title",
      "content": "Section content",
      "cta": "Optional CTA"
    }
  ],
  "contact": {
    "phone": "Fake phone number",
    "email": "Fake email",
    "address": "Fake address"
  },
  "images": [
    {
      "description": "Image description for AI generation",
      "alt": "Alt text"
    }
  ],
  "seo": {
    "title": "Page title",
    "description": "Meta description"
  }
}`;

  const userPrompt = `User Request: ${prompt}

Please generate appropriate content for this ${businessType} business with a ${tone} tone, designed to work with the "${templateName}" template.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const response = completion.choices[0]?.message?.content;
  
  try {
    return JSON.parse(response);
  } catch (parseError) {
    // If JSON parsing fails, return a structured fallback
    return {
      hero: {
        headline: "Welcome to Our Business",
        subheadline: "We provide exceptional services tailored to your needs",
        cta: "Get Started"
      },
      sections: [
        {
          title: "About Us",
          content: "We are dedicated to providing the best service in our industry.",
          cta: "Learn More"
        }
      ],
      contact: {
        phone: "(555) 123-4567",
        email: "hello@example.com",
        address: "123 Business St, City, State 12345"
      },
      images: [
        {
          description: "Professional business team working together",
          alt: "Business team collaboration"
        }
      ],
      seo: {
        title: `${businessType} Services - Professional Solutions`,
        description: `Expert ${businessType.toLowerCase()} services with a ${tone.toLowerCase()} approach. Contact us today.`
      }
    };
  }
}

function getBusinessTypeGuidelines(businessType) {
  const guidelines = {
    technology: "Focus on innovation, efficiency, and cutting-edge solutions. Emphasize technical expertise and scalability.",
    healthcare: "Prioritize trust, compassion, and professional expertise. Emphasize patient care and medical credentials.",
    finance: "Build trust through security, reliability, and expertise. Focus on financial growth and protection.",
    education: "Emphasize knowledge, growth, and achievement. Focus on student success and learning outcomes.",
    ecommerce: "Create urgency and desire. Focus on product benefits, customer satisfaction, and easy purchasing.",
    consulting: "Establish authority and expertise. Focus on problem-solving and results.",
    creative: "Showcase creativity and uniqueness. Focus on artistic vision and portfolio quality.",
    nonprofit: "Inspire action and emotion. Focus on mission, impact, and community benefit.",
    personal: "Be authentic and personable. Focus on skills, experience, and personality.",
    other: "Adapt to the specific business context while maintaining professionalism."
  };

  return guidelines[businessType] || guidelines.other;
}

function getToneGuidelines(tone) {
  const guidelines = {
    professional: "Use formal language, industry terminology, and maintain a serious, trustworthy demeanor.",
    friendly: "Use conversational language, include personal touches, and create a welcoming atmosphere.",
    modern: "Use contemporary language, trending phrases, and current references.",
    luxury: "Use sophisticated language, emphasize exclusivity, and focus on premium quality.",
    playful: "Use casual language, humor when appropriate, and create an energetic vibe.",
    authoritative: "Use confident language, cite expertise, and establish credibility."
  };

  return guidelines[tone] || guidelines.professional;
}