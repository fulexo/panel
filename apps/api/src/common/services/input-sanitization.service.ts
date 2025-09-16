import { Injectable } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class InputSanitizationService {
  
  // Sanitize HTML content
  sanitizeHtml(html: string): string {
    if (!html) return html;
    
    // Configure DOMPurify with strict settings
    const config = {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['class'],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
    };
    
    return DOMPurify.sanitize(html, config);
  }

  // Sanitize plain text
  sanitizeText(text: string): string {
    if (!text) return text;
    
    return text
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  // Sanitize email
  sanitizeEmail(email: string): string {
    if (!email) return email;
    
    return email
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9@._-]/g, ''); // Keep only valid email characters
  }

  // Sanitize phone number
  sanitizePhone(phone: string): string {
    if (!phone) return phone;
    
    return phone.replace(/[^\d+\-\(\)\s]/g, ''); // Keep only digits, +, -, (, ), and spaces
  }

  // Sanitize SKU
  sanitizeSku(sku: string): string {
    if (!sku) return sku;
    
    return sku
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, '') // Keep only letters, numbers, and hyphens
      .substring(0, 50); // Limit length
  }

  // Sanitize URL
  sanitizeUrl(url: string): string {
    if (!url) return url;
    
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }
      
      return urlObj.toString();
    } catch {
      return '';
    }
  }

  // Sanitize JSON data
  sanitizeJson(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      return this.sanitizeText(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJson(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeJson(value);
      }
      return sanitized;
    }
    
    return data;
  }

  // Sanitize search query
  sanitizeSearchQuery(query: string): string {
    if (!query) return query;
    
    return query
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;\\]/g, '') // Remove semicolons and backslashes
      .substring(0, 100); // Limit length
  }

  // Sanitize file name
  sanitizeFileName(fileName: string): string {
    if (!fileName) return fileName;
    
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid characters with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }

  // Sanitize SQL-like input (basic protection)
  sanitizeSqlInput(input: string): string {
    if (!input) return input;
    
    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi,
      /(--|\/\*|\*\/)/g,
      /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/gi,
    ];
    
    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized.trim();
  }

  // Sanitize numeric input
  sanitizeNumeric(input: string | number): number | null {
    if (typeof input === 'number') {
      return isNaN(input) ? null : input;
    }
    
    if (typeof input === 'string') {
      const cleaned = input.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    
    return null;
  }

  // Sanitize boolean input
  sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') {
      return input;
    }
    
    if (typeof input === 'string') {
      const lower = input.toLowerCase();
      return ['true', '1', 'yes', 'on'].includes(lower);
    }
    
    if (typeof input === 'number') {
      return input !== 0;
    }
    
    return false;
  }

  // Sanitize date input
  sanitizeDate(input: string | Date): Date | null {
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    
    if (typeof input === 'string') {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  }

  // Sanitize array input
  sanitizeArray<T>(input: any, sanitizer: (item: any) => T): T[] {
    if (!Array.isArray(input)) {
      return [];
    }
    
    return input
      .map(item => sanitizer(item))
      .filter(item => item !== null && item !== undefined);
  }

  // Sanitize object input
  sanitizeObject<T>(input: any, sanitizer: (obj: any) => T): T | null {
    if (!input || typeof input !== 'object') {
      return null;
    }
    
    try {
      return sanitizer(input);
    } catch {
      return null;
    }
  }
}