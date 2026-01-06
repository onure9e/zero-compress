import { gzipAsync, gunzipAsync } from '../../dist/index';

describe('Async API', () => {
  test('gzipAsync should compress data', async () => {
    const testData = 'Hello World! '.repeat(100); // Larger data for better compression
    const compressed = await gzipAsync(Buffer.from(testData));

    expect(compressed).toBeInstanceOf(Buffer);
    expect(compressed.length).toBeGreaterThan(0);
    expect(compressed.length).toBeLessThan(testData.length);
  });

  test('gunzipAsync should decompress data', async () => {
    const testData = 'Hello World';
    const compressed = await gzipAsync(Buffer.from(testData));
    const decompressed = await gunzipAsync(compressed);

    expect(decompressed.toString()).toBe(testData);
  });
});