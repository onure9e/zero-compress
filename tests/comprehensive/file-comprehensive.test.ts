import * as fs from 'fs';
import * as path from 'path';
import { compressFile, decompressFile, compressFiles, decompressFiles } from '../../dist/index';

describe.skip('File Operations Comprehensive Tests', () => {
  const testDir = path.join(__dirname, '..', 'temp');
  const inputFile = path.join(testDir, 'input.txt');
  const outputFile = path.join(testDir, 'output.gz');
  const testData = 'Comprehensive file testing data for zero-compress package.\n'.repeat(1000);
  const largeTestData = 'Large file test data\n'.repeat(10000);

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    fs.writeFileSync(inputFile, testData);
  });

  afterEach(() => {
    // Clean up output files
    const files = fs.readdirSync(testDir).filter(f => f !== 'input.txt');
    files.forEach(f => {
      try {
        fs.unlinkSync(path.join(testDir, f));
      } catch (e) {
        // Ignore
      }
    });
  });

  describe('compressFile', () => {
    test('should compress a file successfully', async () => {
      const result = await compressFile(inputFile);

      expect(result.inputPath).toBe(inputFile);
      expect(result.outputPath).toBe(inputFile + '.gz');
      expect(result.originalSize).toBe(Buffer.byteLength(testData, 'utf8'));
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.ratio).toBeLessThan(1);
      expect(result.time).toBeGreaterThan(0);

      expect(fs.existsSync(result.outputPath)).toBe(true);
    });

    test('should compress with custom output path', async () => {
      const result = await compressFile(inputFile, outputFile);

      expect(result.outputPath).toBe(outputFile);
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    test('should handle large files', async () => {
      fs.writeFileSync(inputFile, largeTestData);
      const result = await compressFile(inputFile);

      expect(result.originalSize).toBe(Buffer.byteLength(largeTestData, 'utf8'));
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    test('should handle compression options', async () => {
      const result1 = await compressFile(inputFile, undefined, { level: 1 });
      const result9 = await compressFile(inputFile, path.join(testDir, 'output9.gz'), { level: 9 });

      expect(result9.compressedSize).toBeLessThanOrEqual(result1.compressedSize);
    });

    test('should throw error for non-existent input file', async () => {
      await expect(compressFile('non-existent.txt')).rejects.toThrow();
    });

    test('should throw error when output file exists and overwrite is false', async () => {
      fs.writeFileSync(outputFile, 'existing');
      await expect(compressFile(inputFile, outputFile, { overwrite: false })).rejects.toThrow();
    });

    test('should overwrite existing file when overwrite is true', async () => {
      fs.writeFileSync(outputFile, 'existing');
      const result = await compressFile(inputFile, outputFile, { overwrite: true });

      expect(result.outputPath).toBe(outputFile);
      expect(fs.existsSync(outputFile)).toBe(true);
    });
  });

  describe('decompressFile', () => {
  test('should decompress a file successfully', async () => {
    // First compress
    const compressResult = await compressFile(inputFile);

    // Then decompress with overwrite to handle existing file
    const result = await decompressFile(compressResult.outputPath, undefined, { overwrite: true });

      expect(result.inputPath).toBe(compressResult.outputPath);
      expect(result.originalSize).toBe(compressResult.compressedSize);
      expect(result.compressedSize).toBe(compressResult.originalSize);
      expect(result.time).toBeGreaterThan(0);

      const decompressedData = fs.readFileSync(result.outputPath, 'utf8');
      expect(decompressedData).toBe(testData);
    });

    test('should decompress with custom output path', async () => {
      const compressResult = await compressFile(inputFile);
      const customOutput = path.join(testDir, 'custom.txt');

      const result = await decompressFile(compressResult.outputPath, customOutput, { overwrite: true });

      expect(result.outputPath).toBe(customOutput);
      expect(fs.existsSync(customOutput)).toBe(true);
    });
  });

  describe('compressFiles', () => {
    test('should compress multiple files', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');

      fs.writeFileSync(file1, 'File 1 content');
      fs.writeFileSync(file2, 'File 2 content');

      const results = await compressFiles([file1, file2]);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.originalSize).toBeGreaterThan(0);
        expect(result.compressedSize).toBeGreaterThan(0);
        expect(fs.existsSync(result.outputPath)).toBe(true);
      });
    });

    test('should compress to custom directory', async () => {
      const outputDir = path.join(testDir, 'compressed');
      const results = await compressFiles([inputFile], outputDir);

      expect(results[0].outputPath).toContain('compressed');
      expect(fs.existsSync(results[0].outputPath)).toBe(true);
    });
  });

  describe('decompressFiles', () => {
    test('should decompress multiple files', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');

      fs.writeFileSync(file1, 'File 1 content');
      fs.writeFileSync(file2, 'File 2 content');

      // Compress first
      const compressResults = await compressFiles([file1, file2]);

      // Decompress with overwrite
      const decompressResults = await decompressFiles(compressResults.map(r => r.outputPath), undefined, { overwrite: true });

      expect(decompressResults).toHaveLength(2);
      decompressResults.forEach(result => {
        expect(fs.existsSync(result.outputPath)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty file', async () => {
      const emptyFile = path.join(testDir, 'empty.txt');
      fs.writeFileSync(emptyFile, '');

      const result = await compressFile(emptyFile);
      expect(result.originalSize).toBe(0);
      expect(result.compressedSize).toBeGreaterThan(0); // Gzip has overhead
    });

    test('should handle binary files', async () => {
      const binaryFile = path.join(testDir, 'binary.dat');
      const binaryData = Buffer.from(Array.from({ length: 1024 }, (_, i) => i % 256));
      fs.writeFileSync(binaryFile, binaryData);

      const result = await compressFile(binaryFile);
      expect(result.originalSize).toBe(1024);

      const decompressResult = await decompressFile(result.outputPath, undefined, { overwrite: true });
      const decompressedData = fs.readFileSync(decompressResult.outputPath);
      expect(decompressedData).toEqual(binaryData);
    });
  });
});