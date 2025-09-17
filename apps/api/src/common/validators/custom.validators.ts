import { 
  registerDecorator, 
  ValidationOptions, 
  ValidatorConstraint, 
  ValidatorConstraintInterface,
  ValidationArguments 
} from 'class-validator';

// Email validation with domain restrictions
@ValidatorConstraint({ name: 'isValidEmail', async: false })
export class IsValidEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string) {
    if (!email) return false;
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;
    
    // Check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    return !disposableDomains.includes(domain || '');
  }

  defaultMessage() {
    return 'Please provide a valid email address';
  }
}

export function IsValidEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsValidEmailConstraint,
    });
  };
}

// Strong password validation
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string) {
    if (!password) return false;
    
    // At least 8 characters
    if (password.length < 8) return false;
    
    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    
    // At least one lowercase letter
    if (!/[a-z]/.test(password)) return false;
    
    // At least one number
    if (!/\d/.test(password)) return false;
    
    // At least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return false;
    
    // No common patterns
    const commonPatterns = [
      'password',
      '123456',
      'qwerty',
      'admin',
      'user',
      'test'
    ];
    
    const lowerPassword = password.toLowerCase();
    return !commonPatterns.some(pattern => lowerPassword.includes(pattern));
  }

  defaultMessage() {
    return 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

// Phone number validation
@ValidatorConstraint({ name: 'isValidPhone', async: false })
export class IsValidPhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string) {
    if (!phone) return true; // Optional field
    
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's a valid length (7-15 digits)
    if (cleanPhone.length < 7 || cleanPhone.length > 15) return false;
    
    // Check for common invalid patterns
    const invalidPatterns = [
      /^0+$/, // All zeros
      /^1+$/, // All ones
      /^(\d)\1+$/, // All same digits
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(cleanPhone));
  }

  defaultMessage() {
    return 'Please provide a valid phone number';
  }
}

export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsValidPhoneConstraint,
    });
  };
}

// SKU validation
@ValidatorConstraint({ name: 'isValidSku', async: false })
export class IsValidSkuConstraint implements ValidatorConstraintInterface {
  validate(sku: string) {
    if (!sku) return false;
    
    // SKU should be 3-50 characters, alphanumeric and hyphens only
    const skuRegex = /^[A-Za-z0-9-]{3,50}$/;
    return skuRegex.test(sku);
  }

  defaultMessage() {
    return 'SKU must be 3-50 characters long and contain only letters, numbers, and hyphens';
  }
}

export function IsValidSku(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsValidSkuConstraint,
    });
  };
}

// Currency validation
@ValidatorConstraint({ name: 'isValidCurrency', async: false })
export class IsValidCurrencyConstraint implements ValidatorConstraintInterface {
  validate(currency: string) {
    if (!currency) return false;
    
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
      'TRY', 'RUB', 'BRL', 'INR', 'KRW', 'SGD', 'HKD', 'NOK', 'MXN', 'ZAR'
    ];
    
    return validCurrencies.includes(currency.toUpperCase());
  }

  defaultMessage() {
    return 'Please provide a valid currency code (e.g., USD, EUR, TRY)';
  }
}

export function IsValidCurrency(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsValidCurrencyConstraint,
    });
  };
}

// URL validation
@ValidatorConstraint({ name: 'isValidUrl', async: false })
export class IsValidUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string) {
    if (!url) return true; // Optional field
    
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Please provide a valid URL';
  }
}

export function IsValidUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsValidUrlConstraint,
    });
  };
}

// Date range validation
@ValidatorConstraint({ name: 'isValidDateRange', async: false })
export class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
    
    if (!value || !relatedValue) return true;
    
    const startDate = new Date(value as string);
    const endDate = new Date(relatedValue as string);
    
    return startDate <= endDate;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${relatedPropertyName} must be after or equal to ${args.property}`;
  }
}

export function IsValidDateRange(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [property],
      validator: IsValidDateRangeConstraint,
    });
  };
}

// Sanitize HTML input
@ValidatorConstraint({ name: 'isSanitizedHtml', async: false })
export class IsSanitizedHtmlConstraint implements ValidatorConstraintInterface {
  validate(html: string) {
    if (!html) return true; // Optional field
    
    // Check for potentially dangerous HTML tags
    const dangerousTags = [
      'script', 'iframe', 'object', 'embed', 'form', 'input', 'button',
      'link', 'meta', 'style', 'base', 'applet', 'frame', 'frameset'
    ];
    
    const tagRegex = /<(\w+)[^>]*>/gi;
    const matches = html.match(tagRegex);
    
    if (!matches) return true; // No HTML tags found
    
    for (const match of matches) {
      const tagName = match.match(/<(\w+)/i)?.[1]?.toLowerCase();
      if (tagName && dangerousTags.includes(tagName)) {
        return false;
      }
    }
    
    return true;
  }

  defaultMessage() {
    return 'HTML content contains potentially dangerous tags';
  }
}

export function IsSanitizedHtml(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsSanitizedHtmlConstraint,
    });
  };
}