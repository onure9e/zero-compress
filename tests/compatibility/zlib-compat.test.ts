import * as zlib from 'zlib';
import * as zeroCompress from '../../dist/index';

describe('Zlib Compatibility', () => {
  test('should export all zlib functions', () => {
    expect(typeof zeroCompress.gzip).toBe('function');
    expect(typeof zeroCompress.gunzip).toBe('function');
    expect(typeof zeroCompress.deflate).toBe('function');
    expect(typeof zeroCompress.inflate).toBe('function');
    expect(typeof zeroCompress.deflateRaw).toBe('function');
    expect(typeof zeroCompress.inflateRaw).toBe('function');
  });

  test('should export all zlib sync functions', () => {
    expect(typeof zeroCompress.gzipSync).toBe('function');
    expect(typeof zeroCompress.gunzipSync).toBe('function');
    expect(typeof zeroCompress.deflateSync).toBe('function');
    expect(typeof zeroCompress.inflateSync).toBe('function');
    expect(typeof zeroCompress.deflateRawSync).toBe('function');
    expect(typeof zeroCompress.inflateRawSync).toBe('function');
  });

  test('should export all stream creators', () => {
    expect(typeof zeroCompress.createGzip).toBe('function');
    expect(typeof zeroCompress.createGunzip).toBe('function');
    expect(typeof zeroCompress.createDeflate).toBe('function');
    expect(typeof zeroCompress.createInflate).toBe('function');
    expect(typeof zeroCompress.createDeflateRaw).toBe('function');
    expect(typeof zeroCompress.createInflateRaw).toBe('function');
    expect(typeof zeroCompress.createUnzip).toBe('function');
  });

  test('should export zlib constants', () => {
    expect(zeroCompress.Z_OK).toBe(zlib.Z_OK);
    expect(zeroCompress.Z_NO_COMPRESSION).toBe(zlib.Z_NO_COMPRESSION);
    expect(zeroCompress.Z_BEST_SPEED).toBe(zlib.Z_BEST_SPEED);
    expect(zeroCompress.Z_BEST_COMPRESSION).toBe(zlib.Z_BEST_COMPRESSION);
    expect(zeroCompress.Z_DEFAULT_COMPRESSION).toBe(zlib.Z_DEFAULT_COMPRESSION);
  });

  test('should be able to use gzip function', async () => {
    const testData = 'Hello World';
    const compressed = await new Promise<Buffer>((resolve, reject) => {
      zeroCompress.gzip(Buffer.from(testData), (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    expect(compressed).toBeInstanceOf(Buffer);
    expect(compressed.length).toBeGreaterThan(0);
  });
});