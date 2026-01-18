// WebAssembly acceleration module for zero-compress
// Provides high-performance implementations of common operations

#include <stdint.h>
#include <stdlib.h>
#include <math.h>

// Fast CRC32 calculation using hardware acceleration when available
uint32_t fast_crc32(const uint8_t* data, size_t length) {
    uint32_t crc = 0xFFFFFFFF;

    // Use hardware CRC32 if available (x86 with SSE4.2)
    #ifdef __SSE4_2__
    for (size_t i = 0; i < length; i++) {
        crc = __builtin_ia32_crc32qi(crc, data[i]);
    }
    #else
    // Fallback software CRC32
    const uint32_t crc_table[256] = {
        // CRC32 lookup table (simplified for brevity)
        0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA,
        // ... (full table would be here)
        0x2D02EF8D
    };

    for (size_t i = 0; i < length; i++) {
        crc = crc_table[(crc ^ data[i]) & 0xFF] ^ (crc >> 8);
    }
    #endif

    return crc ^ 0xFFFFFFFF;
}

// Fast memory comparison for pattern matching
int fast_memcmp(const uint8_t* a, const uint8_t* b, size_t len) {
    // SIMD-like comparison using 64-bit chunks when possible
    size_t i = 0;

    // Compare 8 bytes at a time
    for (; i + 8 <= len; i += 8) {
        uint64_t va = *(uint64_t*)(a + i);
        uint64_t vb = *(uint64_t*)(b + i);
        if (va != vb) {
            return va < vb ? -1 : 1;
        }
    }

    // Compare remaining bytes
    for (; i < len; i++) {
        if (a[i] != b[i]) {
            return a[i] < b[i] ? -1 : 1;
        }
    }

    return 0;
}

// Fast pattern search in buffer
size_t find_pattern(const uint8_t* haystack, size_t haystack_len,
                   const uint8_t* needle, size_t needle_len) {
    if (needle_len == 0 || needle_len > haystack_len) {
        return (size_t)-1;
    }

    // Use fast comparison for small patterns
    if (needle_len <= 8) {
        uint64_t needle_pattern = 0;
        for (size_t i = 0; i < needle_len; i++) {
            needle_pattern |= (uint64_t)needle[i] << (i * 8);
        }

        for (size_t i = 0; i <= haystack_len - needle_len; i++) {
            uint64_t haystack_pattern = 0;
            for (size_t j = 0; j < needle_len; j++) {
                haystack_pattern |= (uint64_t)haystack[i + j] << (j * 8);
            }
            if (haystack_pattern == needle_pattern) {
                return i;
            }
        }
    } else {
        // Standard search for larger patterns
        for (size_t i = 0; i <= haystack_len - needle_len; i++) {
            if (fast_memcmp(haystack + i, needle, needle_len) == 0) {
                return i;
            }
        }
    }

    return (size_t)-1;
}

// Memory-efficient entropy calculation
double calculate_entropy(const uint8_t* data, size_t length) {
    if (length == 0) return 0.0;

    uint32_t counts[256] = {0};
    size_t unique_count = 0;

    // Count byte frequencies
    for (size_t i = 0; i < length; i++) {
        if (counts[data[i]]++ == 0) {
            unique_count++;
        }
    }

    // Calculate Shannon entropy
    double entropy = 0.0;
    for (int i = 0; i < 256; i++) {
        if (counts[i] > 0) {
            double p = (double)counts[i] / length;
            entropy -= p * log2(p);
        }
    }

    return entropy;
}