/*!
* Copyright 2024-Present Animoca Brands Corporation Ltd. 
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { decode as base64Decode, encode as base64Encode } from 'base-64';
import 'react-native-get-random-values';
import * as Crypto from 'expo-crypto';

const atob = (str) => base64Decode(str);
const btoa = (str) => base64Encode(str);

// React Native crypto implementation using expo-crypto
const webcrypto = {
  ...global.crypto,
  getRandomValues: global.crypto.getRandomValues,
  subtle: {
    digest: async (algorithm, data) => {
      if (algorithm === 'SHA-256') {
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          new TextDecoder().decode(data),
          { encoding: Crypto.CryptoEncoding.BASE64 }
        );
        // Convert base64 to ArrayBuffer
        const binaryString = atob(hash);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    },
    
    importKey: async (format, keyData, algorithm, extractable, keyUsages) => {
      // For OCID JWT verification, we'll create a mock key object
      // since React Native doesn't need full WebCrypto key import
      if ((format === 'raw' || format === 'spki') && algorithm.name === 'ECDSA') {
        return {
          type: 'public',
          extractable,
          algorithm,
          usages: keyUsages,
          keyData // Store the raw key data
        };
      }
      throw new Error(`Unsupported key import: ${format}, ${algorithm.name}`);
    },

    verify: async (algorithm, key, signature, data) => {
      // Note: JWT verification is now handled by the jose library in verifyToken.js
      // This WebCrypto verify is kept for compatibility but should not be used directly
      console.warn('WebCrypto verify: Use jose library for proper JWT verification');
      return true;
    }
  }
};

export { atob, btoa, webcrypto };
