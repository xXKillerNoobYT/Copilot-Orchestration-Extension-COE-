/**
 * Utility Functions for Copilot Orchestration Extension
 */

/**
 * Logger utility
 */
class Logger {
  static log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ',
      success: '✓',
      warning: '⚠',
      error: '✗'
    }[level] || 'ℹ';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  static info(message) {
    this.log(message, 'info');
  }

  static success(message) {
    this.log(message, 'success');
  }

  static warning(message) {
    this.log(message, 'warning');
  }

  static error(message) {
    this.log(message, 'error');
  }
}

/**
 * Validation utilities
 */
class Validator {
  static isValidLanguage(language) {
    const supported = ['javascript', 'python', 'java', 'go', 'typescript', 'rust', 'c++', 'c#'];
    return supported.includes(language.toLowerCase());
  }

  static isValidAgentType(type) {
    const types = ['generator', 'analyzer', 'transformer', 'validator'];
    return types.includes(type.toLowerCase());
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
  }
}

/**
 * File utilities
 */
class FileUtils {
  static getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  static getLanguageFromExtension(ext) {
    const map = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      cpp: 'c++',
      cs: 'c#'
    };
    return map[ext] || 'unknown';
  }
}

module.exports = {
  Logger,
  Validator,
  FileUtils
};
