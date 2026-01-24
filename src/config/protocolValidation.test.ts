import { isLocalHost, validateProtocol } from './llmConfig';

describe('Protocol Validation', () => {
  describe('isLocalHost', () => {
    it('should detect localhost', () => {
      expect(isLocalHost('localhost')).toBe(true);
      expect(isLocalHost('LOCALHOST')).toBe(true);
      expect(isLocalHost('localhost.localdomain')).toBe(true);
    });

    it('should detect loopback addresses', () => {
      expect(isLocalHost('127.0.0.1')).toBe(true);
      expect(isLocalHost('127.0.0.2')).toBe(true);
      expect(isLocalHost('127.255.255.255')).toBe(true);
    });

    it('should detect IPv6 loopback', () => {
      expect(isLocalHost('::1')).toBe(true);
      expect(isLocalHost('[::1]')).toBe(true);
    });

    it('should detect private IP ranges', () => {
      // 192.168.x.x
      expect(isLocalHost('192.168.1.1')).toBe(true);
      expect(isLocalHost('192.168.0.1')).toBe(true);
      expect(isLocalHost('192.168.255.254')).toBe(true);

      // 10.x.x.x
      expect(isLocalHost('10.0.0.1')).toBe(true);
      expect(isLocalHost('10.255.255.255')).toBe(true);

      // 172.16-31.x.x
      expect(isLocalHost('172.16.0.1')).toBe(true);
      expect(isLocalHost('172.31.255.255')).toBe(true);
      expect(isLocalHost('172.20.10.5')).toBe(true);
    });

    it('should not detect public addresses as local', () => {
      expect(isLocalHost('example.com')).toBe(false);
      expect(isLocalHost('8.8.8.8')).toBe(false);
      expect(isLocalHost('1.1.1.1')).toBe(false);
      expect(isLocalHost('172.15.0.1')).toBe(false); // Not in 172.16-31 range
      expect(isLocalHost('172.32.0.1')).toBe(false); // Not in 172.16-31 range
      expect(isLocalHost('193.168.1.1')).toBe(false); // Not 192.168
    });

    it('should handle empty or invalid input', () => {
      expect(isLocalHost('')).toBe(false);
      expect(isLocalHost('not-an-ip')).toBe(false);
    });
  });

  describe('validateProtocol', () => {
    it('should warn when HTTPS is used with localhost', () => {
      const warning = validateProtocol('https://localhost:1234');
      expect(warning).not.toBeNull();
      expect(warning).toContain('Local LLM servers');
      expect(warning).toContain('HTTP');
      expect(warning).toContain('reverse proxy');
    });

    it('should warn when HTTPS is used with loopback IP', () => {
      const warning = validateProtocol('https://127.0.0.1:1234/v1');
      expect(warning).not.toBeNull();
      expect(warning).toContain('Local LLM servers');
    });

    it('should warn when HTTPS is used with private IPs', () => {
      expect(validateProtocol('https://192.168.1.100:1234')).not.toBeNull();
      expect(validateProtocol('https://10.0.0.5:1234')).not.toBeNull();
      expect(validateProtocol('https://172.16.0.1:1234')).not.toBeNull();
    });

    it('should not warn when HTTP is used with localhost', () => {
      expect(validateProtocol('http://localhost:1234')).toBeNull();
      expect(validateProtocol('http://127.0.0.1:1234')).toBeNull();
      expect(validateProtocol('http://192.168.1.100:1234')).toBeNull();
    });

    it('should not warn when HTTPS is used with public domains', () => {
      expect(validateProtocol('https://api.openai.com/v1')).toBeNull();
      expect(validateProtocol('https://example.com:443')).toBeNull();
    });

    it('should not warn when HTTP is used with public domains', () => {
      expect(validateProtocol('http://example.com')).toBeNull();
    });

    it('should handle invalid URLs gracefully', () => {
      expect(validateProtocol('not-a-url')).toBeNull();
      expect(validateProtocol('')).toBeNull();
      expect(validateProtocol('ftp://localhost')).toBeNull();
    });
  });
});
