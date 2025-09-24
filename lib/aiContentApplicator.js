/**
 * AI Content Application System
 * Intelligently applies AI-generated content to CraftJS template structures
 */

export class AIContentApplicator {
  constructor(templateData) {
    this.templateData = typeof templateData === 'string' ? JSON.parse(templateData) : templateData;
    this.nodeMap = this.buildNodeMap();
  }

  /**
   * Build a map of all nodes in the template for easy traversal
   */
  buildNodeMap() {
    const nodeMap = {};
    const traverse = (nodeId) => {
      const node = this.templateData[nodeId];
      if (node) {
        nodeMap[nodeId] = node;
        if (node.nodes) {
          node.nodes.forEach(childId => traverse(childId));
        }
      }
    };
    
    if (this.templateData.ROOT) {
      traverse('ROOT');
    }
    
    return nodeMap;
  }

  /**
   * Apply AI-generated content to the template
   */
  applyContent(aiContent) {
    try {
      // Create a deep copy to avoid modifying the original
      const updatedTemplate = JSON.parse(JSON.stringify(this.templateData));
      
      // Apply hero section
      if (aiContent.hero) {
        this.applyHeroContent(updatedTemplate, aiContent.hero);
      }
      
      // Apply sections
      if (aiContent.sections && Array.isArray(aiContent.sections)) {
        this.applySectionContent(updatedTemplate, aiContent.sections);
      }
      
      // Apply contact information
      if (aiContent.contact) {
        this.applyContactContent(updatedTemplate, aiContent.contact);
      }
      
      // Apply image suggestions (as alt text and descriptions)
      if (aiContent.images) {
        this.applyImageContent(updatedTemplate, aiContent.images);
      }
      
      return JSON.stringify(updatedTemplate);
    } catch (error) {
      console.error('Error applying AI content:', error);
      return JSON.stringify(this.templateData);
    }
  }

  /**
   * Apply hero section content (headline, subheadline, CTA)
   */
  applyHeroContent(template, heroContent) {
    const textNodes = this.findNodesByType(template, 'Text');
    const buttonNodes = this.findNodesByType(template, 'CraftButton');
    
    let appliedHeadline = false;
    let appliedSubheadline = false;
    
    // Apply headline to first large text node
    textNodes.forEach((nodeId, index) => {
      const node = template[nodeId];
      if (node && node.props) {
        const fontSize = node.props.fontSize || node.props.style?.fontSize;
        
        // Apply headline to first node or largest text
        if (!appliedHeadline && (index === 0 || this.isLargeText(fontSize))) {
          this.updateTextContent(node, heroContent.headline);
          appliedHeadline = true;
        } 
        // Apply subheadline to second text node
        else if (!appliedSubheadline && appliedHeadline) {
          this.updateTextContent(node, heroContent.subheadline);
          appliedSubheadline = true;
        }
      }
    });
    
    // Apply CTA to first button
    if (buttonNodes.length > 0 && heroContent.cta) {
      const buttonNode = template[buttonNodes[0]];
      if (buttonNode && buttonNode.props) {
        this.updateTextContent(buttonNode, heroContent.cta);
      }
    }
  }

  /**
   * Apply section content to remaining text nodes
   */
  applySectionContent(template, sections) {
    const textNodes = this.findNodesByType(template, 'Text');
    const buttonNodes = this.findNodesByType(template, 'CraftButton');
    
    // Skip first 2 text nodes (used for hero)
    const remainingTextNodes = textNodes.slice(2);
    let buttonIndex = 1; // Skip first button (used for hero CTA)
    
    sections.forEach((section, sectionIndex) => {
      const nodeIndex = sectionIndex * 2; // Assume title + content pattern
      
      // Apply section title
      if (remainingTextNodes[nodeIndex]) {
        const titleNode = template[remainingTextNodes[nodeIndex]];
        if (titleNode) {
          this.updateTextContent(titleNode, section.title);
        }
      }
      
      // Apply section content
      if (remainingTextNodes[nodeIndex + 1]) {
        const contentNode = template[remainingTextNodes[nodeIndex + 1]];
        if (contentNode) {
          this.updateTextContent(contentNode, section.content);
        }
      }
      
      // Apply section CTA if available
      if (section.cta && buttonNodes[buttonIndex]) {
        const ctaNode = template[buttonNodes[buttonIndex]];
        if (ctaNode) {
          this.updateTextContent(ctaNode, section.cta);
          buttonIndex++;
        }
      }
    });
  }

  /**
   * Apply contact information to relevant nodes
   */
  applyContactContent(template, contactContent) {
    const textNodes = this.findNodesByType(template, 'Text');
    
    // Look for nodes that might contain contact info (usually at the bottom)
    const contactNodes = textNodes.slice(-3); // Last 3 text nodes
    
    const contactInfo = [
      contactContent.phone,
      contactContent.email,
      contactContent.address
    ].filter(Boolean);
    
    contactNodes.forEach((nodeId, index) => {
      if (contactInfo[index] && template[nodeId]) {
        this.updateTextContent(template[nodeId], contactInfo[index]);
      }
    });
  }

  /**
   * Apply image content (alt text and descriptions)
   */
  applyImageContent(template, imageContent) {
    const imageNodes = this.findNodesByType(template, 'Image');
    
    imageNodes.forEach((nodeId, index) => {
      const node = template[nodeId];
      const imageInfo = imageContent[index];
      
      if (node && node.props && imageInfo) {
        // Update alt text
        if (node.props.alt !== undefined) {
          node.props.alt = imageInfo.alt;
        }
        
        // Update title or data attributes for image description
        if (node.props.title !== undefined) {
          node.props.title = imageInfo.description;
        }
        
        // Add data attribute for AI image generation
        node.props['data-ai-description'] = imageInfo.description;
      }
    });
  }

  /**
   * Find all nodes of a specific type
   */
  findNodesByType(template, typeName) {
    const nodes = [];
    
    Object.keys(template).forEach(nodeId => {
      const node = template[nodeId];
      if (node && node.type && node.type.resolvedName === typeName) {
        nodes.push(nodeId);
      }
    });
    
    return nodes;
  }

  /**
   * Check if text has large font size (likely a heading)
   */
  isLargeText(fontSize) {
    if (typeof fontSize === 'string') {
      const size = parseInt(fontSize.replace(/[^\d]/g, ''));
      return size >= 24;
    }
    if (typeof fontSize === 'number') {
      return fontSize >= 24;
    }
    return false;
  }

  /**
   * Update text content in a node
   */
  updateTextContent(node, newText) {
    if (!node || !newText) return;
    
    // Handle different text node structures
    if (node.props) {
      // Direct text prop
      if (node.props.text !== undefined) {
        node.props.text = newText;
      }
      
      // Children prop (for buttons, etc.)
      if (node.props.children !== undefined) {
        node.props.children = newText;
      }
      
      // innerHTML or content prop
      if (node.props.innerHTML !== undefined) {
        node.props.innerHTML = newText;
      }
      
      // Custom content prop
      if (node.props.content !== undefined) {
        node.props.content = newText;
      }
      
      // For CraftJS Text nodes that might use different props
      if (node.type && node.type.resolvedName === 'Text') {
        node.props.text = newText;
      }
      
      // For CraftJS Button nodes
      if (node.type && node.type.resolvedName === 'CraftButton') {
        node.props.children = newText;
      }
    }
  }

  /**
   * Get template statistics for better content application
   */
  getTemplateStats() {
    const stats = {
      totalNodes: Object.keys(this.nodeMap).length,
      textNodes: this.findNodesByType(this.templateData, 'Text').length,
      imageNodes: this.findNodesByType(this.templateData, 'Image').length,
      buttonNodes: this.findNodesByType(this.templateData, 'CraftButton').length,
      hasGrid: this.findNodesByType(this.templateData, 'GridBox').length > 0,
      hasFlex: this.findNodesByType(this.templateData, 'FlexBox').length > 0
    };
    
    return stats;
  }
}

/**
 * Main function to apply AI content to template
 */
export const applyAIContentToTemplate = (templateData, aiContent) => {
  const applicator = new AIContentApplicator(templateData);
  return applicator.applyContent(aiContent);
};