/**
 * Template Marketplace Error Handling & Monitoring
 * Comprehensive error management and user feedback system
 */

'use client';

import { message, notification } from 'antd';

/**
 * Error Types for Template System
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION', 
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  STORAGE: 'STORAGE',
  AI_GENERATION: 'AI_GENERATION',
  TEMPLATE_PARSING: 'TEMPLATE_PARSING',
  MEDIA_UPLOAD: 'MEDIA_UPLOAD',
  SUBSCRIPTION: 'SUBSCRIPTION'
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Template Marketplace Error Handler Class
 */
export class TemplateErrorHandler {
  constructor(options = {}) {
    this.enableLogging = options.enableLogging !== false;
    this.enableTelemetry = options.enableTelemetry || false;
    this.userId = options.userId;
    this.sessionId = options.sessionId || this.generateSessionId();
  }

  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle various error types with appropriate user feedback
   */
  handleError(error, context = {}) {
    const errorInfo = this.parseError(error, context);
    
    // Log error if enabled
    if (this.enableLogging) {
      this.logError(errorInfo);
    }
    
    // Send telemetry if enabled
    if (this.enableTelemetry) {
      this.sendTelemetry(errorInfo);
    }
    
    // Show user-friendly feedback
    this.showUserFeedback(errorInfo);
    
    return errorInfo;
  }

  /**
   * Parse error to determine type and severity
   */
  parseError(error, context) {
    const errorInfo = {
      id: `error-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: context,
      userId: this.userId,
      sessionId: this.sessionId,
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.MEDIUM,
      userMessage: 'An error occurred. Please try again.',
      actionable: true,
      retryable: true
    };

    // Determine error type and customize response
    if (error.message?.includes('Authentication') || error.code === 'AUTH_REQUIRED') {
      errorInfo.type = ERROR_TYPES.AUTHENTICATION;
      errorInfo.userMessage = 'Please sign in to continue';
      errorInfo.retryable = false;
      errorInfo.actionable = true;
    }
    
    else if (error.message?.includes('validation') || error.code === 'VALIDATION_ERROR') {
      errorInfo.type = ERROR_TYPES.VALIDATION;
      errorInfo.severity = ERROR_SEVERITY.LOW;
      errorInfo.userMessage = 'Please check your input and try again';
      errorInfo.retryable = true;
    }
    
    else if (error.message?.includes('subscription') || error.code === 'UPGRADE_REQUIRED') {
      errorInfo.type = ERROR_TYPES.SUBSCRIPTION;
      errorInfo.userMessage = 'This feature requires a Pro subscription';
      errorInfo.retryable = false;
      errorInfo.actionable = true;
    }
    
    else if (error.message?.includes('AI') || error.message?.includes('OpenAI')) {
      errorInfo.type = ERROR_TYPES.AI_GENERATION;
      errorInfo.userMessage = 'AI generation failed. Please try again or contact support';
      errorInfo.severity = ERROR_SEVERITY.HIGH;
    }
    
    else if (error.message?.includes('File') || error.message?.includes('upload')) {
      errorInfo.type = ERROR_TYPES.MEDIA_UPLOAD;
      errorInfo.userMessage = 'File upload failed. Please check file size and format';
    }
    
    else if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      errorInfo.type = ERROR_TYPES.TEMPLATE_PARSING;
      errorInfo.userMessage = 'Template data is corrupted. Please try a different template';
      errorInfo.severity = ERROR_SEVERITY.HIGH;
    }
    
    else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      errorInfo.type = ERROR_TYPES.NETWORK;
      errorInfo.userMessage = 'Connection error. Please check your internet and try again';
    }

    return errorInfo;
  }

  /**
   * Log error to console and external services
   */
  logError(errorInfo) {
    console.group(`🚨 Template Error: ${errorInfo.type}`);
    console.error('Error ID:', errorInfo.id);
    console.error('Message:', errorInfo.message);
    console.error('Context:', errorInfo.context);
    console.error('Stack:', errorInfo.stack);
    console.error('Severity:', errorInfo.severity);
    console.groupEnd();
    
    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(errorInfo);
    }
  }

  /**
   * Send error telemetry
   */
  sendTelemetry(errorInfo) {
    try {
      // Simplified telemetry - in production use proper analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'template_error', {
          error_type: errorInfo.type,
          error_severity: errorInfo.severity,
          user_id: errorInfo.userId,
          session_id: errorInfo.sessionId
        });
      }
    } catch (telemetryError) {
      console.warn('Telemetry failed:', telemetryError);
    }
  }

  /**
   * Show user-friendly error messages
   */
  showUserFeedback(errorInfo) {
    switch (errorInfo.severity) {
      case ERROR_SEVERITY.CRITICAL:
        notification.error({
          message: 'Critical Error',
          description: errorInfo.userMessage,
          duration: 0, // Don't auto-close
          key: errorInfo.id
        });
        break;
        
      case ERROR_SEVERITY.HIGH:
        notification.error({
          message: 'Error',
          description: errorInfo.userMessage,
          duration: 8,
          key: errorInfo.id
        });
        break;
        
      case ERROR_SEVERITY.MEDIUM:
        message.error(errorInfo.userMessage);
        break;
        
      case ERROR_SEVERITY.LOW:
        message.warning(errorInfo.userMessage);
        break;
        
      default:
        message.info(errorInfo.userMessage);
    }
  }

  /**
   * Send to external logging service
   */
  sendToLoggingService(errorInfo) {
    // Placeholder for external logging service integration
    // Example: Sentry, LogRocket, etc.
    console.log('Would send to logging service:', errorInfo.id);
  }
}

/**
 * Specific error handlers for different template operations
 */

export const handleTemplateLoadError = (error, templateId) => {
  const handler = new TemplateErrorHandler();
  return handler.handleError(error, {
    operation: 'template_load',
    templateId,
    component: 'PageLoadModal'
  });
};

export const handleTemplateSaveError = (error, templateData) => {
  const handler = new TemplateErrorHandler();
  return handler.handleError(error, {
    operation: 'template_save',
    templateName: templateData?.name,
    component: 'TemplateSaveModal'
  });
};

export const handleAIGenerationError = (error, prompt) => {
  const handler = new TemplateErrorHandler();
  return handler.handleError(error, {
    operation: 'ai_generation',
    promptLength: prompt?.length,
    component: 'AIPageGenerator'
  });
};

export const handleMediaUploadError = (error, fileName) => {
  const handler = new TemplateErrorHandler();
  return handler.handleError(error, {
    operation: 'media_upload',
    fileName,
    component: 'TemplateMediaUpload'
  });
};

export const handleRatingError = (error, templateId, rating) => {
  const handler = new TemplateErrorHandler();
  return handler.handleError(error, {
    operation: 'template_rating',
    templateId,
    rating,
    component: 'TemplateRating'
  });
};

/**
 * Network retry wrapper with exponential backoff
 */
export const withRetry = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain error types
      if (error.code === 'AUTH_REQUIRED' || 
          error.code === 'VALIDATION_ERROR' ||
          error.code === 'UPGRADE_REQUIRED') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying operation (attempt ${attempt + 1}/${maxRetries}) in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Validation helpers with user-friendly error messages
 */

export const validateTemplate = (templateData) => {
  const errors = [];
  
  if (!templateData.name || templateData.name.trim().length === 0) {
    errors.push('Template name is required');
  }
  
  if (templateData.name && templateData.name.length > 100) {
    errors.push('Template name must be under 100 characters');
  }
  
  if (!templateData.description || templateData.description.trim().length === 0) {
    errors.push('Template description is required');
  }
  
  if (!templateData.category) {
    errors.push('Template category is required');
  }
  
  if (!templateData.jsonData) {
    errors.push('Template data is required');
  } else {
    try {
      const parsed = JSON.parse(templateData.jsonData);
      if (!parsed.ROOT) {
        errors.push('Template must have a ROOT component');
      }
    } catch (e) {
      errors.push('Template data is not valid JSON');
    }
  }
  
  if (templateData.type === 'paid' && (!templateData.price || templateData.price <= 0)) {
    errors.push('Paid templates must have a price greater than $0');
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};

export const validateImageUpload = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file selected');
  } else {
    if (!file.type.startsWith('image/')) {
      errors.push('File must be an image');
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push('Image must be smaller than 5MB');
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Image format not supported. Use JPG, PNG, GIF, or WebP');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Image validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};

/**
 * Global error boundary for template components
 */
export const withErrorBoundary = (WrappedComponent) => {
  return class TemplateErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
      this.errorHandler = new TemplateErrorHandler();
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      this.errorHandler.handleError(error, {
        component: WrappedComponent.name,
        errorInfo
      });
    }

    render() {
      if (this.state.hasError) {
        return (
          <div style={{ 
            padding: 20, 
            textAlign: 'center',
            border: '1px solid #ff4d4f',
            borderRadius: 4,
            backgroundColor: '#fff2f0'
          }}>
            <h3>Something went wrong</h3>
            <p>We're sorry, but something unexpected happened. Please refresh the page and try again.</p>
            <button onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  };
};