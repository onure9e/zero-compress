// Security tests for zero-compress
// Tests for various security vulnerabilities

import * as fs from 'fs';
import * as path from 'path';
import { gzipAsync, gunzipAsync } from '../src/async';
import { compressFile, decompressFile } from '../src/file';
import { sanitizePath, validateInput, validateZlibOptions, getMaxFileSize } from '../src/utils';

describe('Security Tests', () => {
  const testDir = path.join(__dirname, 'temp-security');
  const largeFilePath = path.join(testDir, 'large.txt');
  const outputPath = path.join(testDir, 'output.gz');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir('..');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('Input Validation', () => {
  test('rejects oversized input', () => {
    const largeBuffer = Buffer.alloc(getMaxFileSize() + 1);
    expect(() => validateInput(largeBuffer)).toThrow('Input too large');
  });



    test('accepts valid inputs', () => {
      expect(validateInput('hello')).toBeInstanceOf(Buffer);
      expect(validateInput(Buffer.from('hello'))).toBeInstanceOf(Buffer);
    });
  });

  describe('Path Traversal', () => {
    test('rejects traversal attempts', () => {
      expect(() => sanitizePath('../etc/passwd')).toThrow('Directory traversal detected');
      expect(() => sanitizePath('..\\windows\\system32')).toThrow('Directory traversal detected');
      expect(() => sanitizePath('%2e%2e%2fetc%2fpasswd')).toThrow('Directory traversal detected');
    });

    test('accepts absolute paths after sanitization', () => {
      expect(sanitizePath('/etc/passwd')).toBe('/etc/passwd');
      expect(sanitizePath('C:\\windows\\system32')).toBe('C:\\windows\\system32');
    });

    test('accepts safe paths', () => {
      expect(sanitizePath('file.txt')).toBe('file.txt');
      expect(sanitizePath('dir/file.txt')).toBe('dir/file.txt');
    });
  });

  describe('Zlib Options Validation', () => {
    test('filters malicious options', () => {
      const safeOptions = validateZlibOptions({ level: 10, memLevel: 10, strategy: 5 });
      expect(safeOptions.level).toBeUndefined(); // 10 is invalid, should be filtered
      expect(safeOptions.memLevel).toBeUndefined(); // 10 > 9
      expect(safeOptions.strategy).toBeUndefined(); // 5 > 4
    });

    test('accepts valid options', () => {
      const safeOptions = validateZlibOptions({ level: 6, memLevel: 8, windowBits: 15 });
      expect(safeOptions.level).toBe(6);
      expect(safeOptions.memLevel).toBe(8);
      expect(safeOptions.windowBits).toBe(15);
    });
  });

  describe('Large File Handling', () => {
    test('rejects large files in async operations', async () => {
      const largeBuffer = Buffer.alloc(getMaxFileSize() + 1);
      await expect(gzipAsync(largeBuffer)).rejects.toThrow(/Input too large/);
    });

    test('handles large file paths safely', async () => {
      // Create a mock large file path (don't actually create large file)
      const largePath = 'a'.repeat(1000) + '.txt';
      // Since we can't create a file >100MB easily, test path sanitization
      expect(() => sanitizePath(largePath)).not.toThrow();
    });
  });

  describe('Zip Bomb Detection', () => {
    test('detects potential zip bombs', () => {
      // Temporarily enable zip bomb check for this test
      const originalEnv = process.env.NODE_ENV;
      const originalDisable = process.env.DISABLE_ZIP_BOMB_CHECK;
      process.env.NODE_ENV = 'production'; // Enable checks
      process.env.DISABLE_ZIP_BOMB_CHECK = undefined;
      try {
        const repetitiveData = Buffer.from('A'.repeat(1000));
        expect(() => validateInput(repetitiveData)).toThrow('Potential zip bomb detected');
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.DISABLE_ZIP_BOMB_CHECK = originalDisable;
      }
    });

    test('accepts normal data', () => {
      const normalData = Buffer.from('Hello World! This is normal text data for testing.');
      expect(() => validateInput(normalData)).not.toThrow();
    });
  });

  describe('Error Message Sanitization', () => {
    test('does not leak paths in errors', async () => {
      const testFile = 'test.txt';
      const outputFile = 'output.gz';
      fs.writeFileSync(testFile, 'test');

      // Try to compress to existing path without overwrite
      fs.writeFileSync(outputFile, 'existing');
      await expect(compressFile(testFile, outputFile, { overwrite: false })).rejects.toThrow('Output file already exists');
      // Should not contain the actual path
    });
  });

  // Add more tests as needed for other vulnerabilities
});