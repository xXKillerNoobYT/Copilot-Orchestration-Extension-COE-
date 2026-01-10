/**
 * Validation Utilities for Plan Builder
 * 
 * Provides reusable validation functions for wizard questions
 * Reference: Code Master Section 9.3
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class Validators {
  /**
   * Validate required field
   */
  static required(value: unknown, message = 'This field is required'): ValidationResult {
    const valid = value !== undefined && value !== null && value !== '';
    return {
      valid,
      errors: valid ? [] : [message],
    };
  }

  /**
   * Validate minimum length/value
   */
  static min(value: unknown, minValue: number, message?: string): ValidationResult {
    let valid = true;
    let defaultMessage = '';

    if (typeof value === 'string') {
      valid = value.length >= minValue;
      defaultMessage = `Must be at least ${minValue} characters`;
    } else if (typeof value === 'number') {
      valid = value >= minValue;
      defaultMessage = `Must be at least ${minValue}`;
    } else if (Array.isArray(value)) {
      valid = value.length >= minValue;
      defaultMessage = `Must select at least ${minValue} item(s)`;
    }

    return {
      valid,
      errors: valid ? [] : [message || defaultMessage],
    };
  }

  /**
   * Validate maximum length/value
   */
  static max(value: unknown, maxValue: number, message?: string): ValidationResult {
    let valid = true;
    let defaultMessage = '';

    if (typeof value === 'string') {
      valid = value.length <= maxValue;
      defaultMessage = `Must be at most ${maxValue} characters`;
    } else if (typeof value === 'number') {
      valid = value <= maxValue;
      defaultMessage = `Must be at most ${maxValue}`;
    } else if (Array.isArray(value)) {
      valid = value.length <= maxValue;
      defaultMessage = `Must select at most ${maxValue} item(s)`;
    }

    return {
      valid,
      errors: valid ? [] : [message || defaultMessage],
    };
  }

  /**
   * Validate pattern match (regex)
   */
  static pattern(value: string, pattern: string | RegExp, message?: string): ValidationResult {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const valid = regex.test(value);

    return {
      valid,
      errors: valid ? [] : [message || 'Invalid format'],
    };
  }

  /**
   * Validate email address
   */
  static email(value: string, message = 'Invalid email address'): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.pattern(value, emailRegex, message);
  }

  /**
   * Validate URL
   */
  static url(value: string, message = 'Invalid URL'): ValidationResult {
    try {
      new URL(value);
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: [message] };
    }
  }

  /**
   * Validate project name (alphanumeric, dashes, underscores)
   */
  static projectName(value: string, message = 'Invalid project name (use letters, numbers, dashes, underscores)'): ValidationResult {
    const projectNameRegex = /^[a-zA-Z0-9_-]+$/;
    return this.pattern(value, projectNameRegex, message);
  }

  /**
   * Validate semantic version (semver)
   */
  static semver(value: string, message = 'Invalid version (use format: 1.0.0)'): ValidationResult {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return this.pattern(value, semverRegex, message);
  }

  /**
   * Validate GitHub repository URL
   */
  static githubRepo(value: string, message = 'Invalid GitHub repository URL'): ValidationResult {
    const githubRegex = /^https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
    return this.pattern(value, githubRegex, message);
  }

  /**
   * Validate NPM package name
   */
  static npmPackageName(value: string, message = 'Invalid NPM package name'): ValidationResult {
    const npmRegex = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    return this.pattern(value, npmRegex, message);
  }

  /**
   * Validate port number
   */
  static port(value: number, message = 'Invalid port number (1-65535)'): ValidationResult {
    const valid = Number.isInteger(value) && value >= 1 && value <= 65535;
    return {
      valid,
      errors: valid ? [] : [message],
    };
  }

  /**
   * Validate range (inclusive)
   */
  static range(value: number, min: number, max: number, message?: string): ValidationResult {
    const valid = value >= min && value <= max;
    return {
      valid,
      errors: valid ? [] : [message || `Must be between ${min} and ${max}`],
    };
  }

  /**
   * Validate one of allowed values
   */
  static oneOf(value: unknown, allowedValues: unknown[], message?: string): ValidationResult {
    const valid = allowedValues.includes(value);
    return {
      valid,
      errors: valid ? [] : [message || `Must be one of: ${allowedValues.join(', ')}`],
    };
  }

  /**
   * Validate custom condition
   */
  static custom(value: unknown, validator: (value: unknown) => boolean, message: string): ValidationResult {
    const valid = validator(value);
    return {
      valid,
      errors: valid ? [] : [message],
    };
  }

  /**
   * Combine multiple validations (all must pass)
   */
  static all(...validators: (() => ValidationResult)[]): ValidationResult {
    const errors: string[] = [];

    for (const validate of validators) {
      const result = validate();
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Combine multiple validations (at least one must pass)
   */
  static any(...validators: (() => ValidationResult)[]): ValidationResult {
    for (const validate of validators) {
      const result = validate();
      if (result.valid) {
        return { valid: true, errors: [] };
      }
    }

    return {
      valid: false,
      errors: ['None of the validation rules passed'],
    };
  }
}
