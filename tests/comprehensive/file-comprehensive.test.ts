import * as fs from 'fs';
import * as path from 'path';
import { compressFile, decompressFile, compressFiles, decompressFiles } from '../../dist/index';

describe('File Operations Comprehensive Tests', () => {
  const testDir = path.join(__dirname, '..', 'temp');
  const inputFile = 'input.txt';
  const fullInputPath = path.join(testDir, inputFile);
  const outputFile = 'output.gz';
  const fullOutputPath = path.join(testDir, outputFile);
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
    fs.writeFileSync(fullInputPath, testData);
  });

  afterEach(() => {
    const files = fs.readdirSync(testDir).filter(f => f !== 'input.txt');
    files.forEach(f => {
      try {
        fs.unlinkSync(path.join(testDir, f));
      } catch (e) {
      }
    });
  });

  describe('compressFile', () => {
    test('should compress a file successfully', async () => {
      const result = await compressFile(fullInputPath);

      expect(result.originalSize).toBe(Buffer.byteLength(testData, 'utf8'));
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.ratio).toBeLessThan(1);
      expect(result.time).toBeGreaterThan(0);

      expect(fs.existsSync(path.join(testDir, 'input.txt.gz'))).toBe(true);
    });

    test('should compress with custom output path', async () => {
      await compressFile(fullInputPath, fullOutputPath);

      expect(fs.existsSync(fullOutputPath)).toBe(true);
    });

    test('should handle large files', async () => {
      fs.writeFileSync(fullInputPath, largeTestData);
      const result = await compressFile(fullInputPath);

      expect(result.originalSize).toBe(Buffer.byteLength(largeTestData, 'utf8'));
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    test('should handle compression options', async () => {
      const result1 = await compressFile(fullInputPath, undefined, { level: 1 });
      await compressFile(fullInputPath, path.join(testDir, 'output9.gz'), { level: 9 });

      expect(result1.compressedSize).toBeGreaterThan(0);
    });

    test('should throw error for non-existent input file', async () => {
      await expect(compressFile(path.join(testDir, 'non-existent.txt'))).rejects.toThrow();
    });

    test('should throw error when output file exists and overwrite is false', async () => {
      fs.writeFileSync(fullOutputPath, 'existing');
      await expect(compressFile(fullInputPath, fullOutputPath, { overwrite: false })).rejects.toThrow();
    });

    test('should overwrite existing file when overwrite is true', async () => {
      fs.writeFileSync(fullOutputPath, 'existing');
      await compressFile(fullInputPath, fullOutputPath, { overwrite: true });

      expect(fs.existsSync(fullOutputPath)).toBe(true);
    });
  });

  describe('decompressFile', () => {
    test('should decompress a file successfully', async () => {
      await compressFile(fullInputPath);

      const compressedPath = path.join(testDir, 'input.txt.gz');
      const result = await decompressFile(compressedPath, undefined, { overwrite: true });

      expect(result.compressedSize).toBe(Buffer.byteLength(testData, 'utf8'));
      expect(result.time).toBeGreaterThan(0);

      const outputPath = path.join(testDir, 'input.txt');
      const decompressedData = fs.readFileSync(outputPath, 'utf8');
      expect(decompressedData).toBe(testData);
    });

    test('should decompress with custom output path', async () => {
      await compressFile(fullInputPath);
      const customOutput = path.join(testDir, 'custom.txt');

      await decompressFile(path.join(testDir, 'input.txt.gz'), customOutput, { overwrite: true });

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
      });
    });

    test('should compress to custom directory', async () => {
      const outputDir = path.join(testDir, 'compressed');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      await compressFiles([fullInputPath], outputDir);

      expect(fs.existsSync(path.join(outputDir, 'input.txt.gz'))).toBe(true);
    });
  });

  describe('decompressFiles', () => {
    test('should decompress multiple files', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');

      fs.writeFileSync(file1, 'File 1 content');
      fs.writeFileSync(file2, 'File 2 content');

      await compressFiles([file1, file2]);

      const decompressResults = await decompressFiles(
        [path.join(testDir, 'file1.txt.gz'), path.join(testDir, 'file2.txt.gz')],
        undefined,
        { overwrite: true }
      );

      expect(decompressResults).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty file', async () => {
      const emptyFile = path.join(testDir, 'empty.txt');
      fs.writeFileSync(emptyFile, '');

      const result = await compressFile(emptyFile);
      expect(result.originalSize).toBe(0);
      expect(result.compressedSize).toBeGreaterThan(0);
    });

    test('should handle binary files', async () => {
      const binaryFile = path.join(testDir, 'binary.dat');
      const binaryData = Buffer.from(Array.from({ length: 1024 }, (_, i) => i % 256));
      fs.writeFileSync(binaryFile, binaryData);

      const result = await compressFile(binaryFile);
      expect(result.originalSize).toBe(1024);

      const compressedPath = path.join(testDir, 'binary.dat.gz');
      await decompressFile(compressedPath, undefined, { overwrite: true });
      const outputPath = path.join(testDir, 'binary.dat');
      const decompressedData = fs.readFileSync(outputPath);
      expect(decompressedData).toEqual(binaryData);
    });
  });
});
