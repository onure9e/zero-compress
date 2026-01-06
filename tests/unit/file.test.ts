import * as fs from 'fs';
import * as path from 'path';
import { compressFile, decompressFile } from '../../dist/index';

describe.skip('File Operations', () => {
  const testDir = path.join(__dirname, '..', 'temp');
  const inputFile = path.join(testDir, 'input.txt');
  const testData = 'This is test data for compression. '.repeat(100);

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    fs.writeFileSync(inputFile, testData);
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('compressFile should compress a file', async () => {
    const result = await compressFile(inputFile);

    expect(result.inputPath).toBe(inputFile);
    expect(result.outputPath).toBe(inputFile + '.gz');
    expect(result.originalSize).toBe(testData.length);
    expect(result.compressedSize).toBeLessThan(result.originalSize);
    expect(result.ratio).toBeLessThan(1);
    expect(result.time).toBeGreaterThan(0);

    expect(fs.existsSync(result.outputPath)).toBe(true);
  });

  test('decompressFile should decompress a file', async () => {
    const compressedPath = inputFile + '.gz';
    const result = await decompressFile(compressedPath, undefined, { overwrite: true });

    expect(result.inputPath).toBe(compressedPath);
    expect(result.outputPath).toBe(inputFile); // Should overwrite or create new
    expect(result.compressedSize).toBe(testData.length);
    expect(result.ratio).toBeLessThan(1); // Decompression ratio (compressed/original)
    expect(result.time).toBeGreaterThan(0);

    const decompressedData = fs.readFileSync(result.outputPath, 'utf8');
    expect(decompressedData).toBe(testData);
  });
});