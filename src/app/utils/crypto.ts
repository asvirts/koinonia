/**
 * Utility functions for encrypting and decrypting data in localStorage
 * Uses AES-GCM for encryption with a key derived from a password using PBKDF2
 */

// Check if we're in a browser environment with Web Crypto API
const isBrowser = typeof window !== "undefined"
const crypto = isBrowser ? window.crypto : null

/**
 * Generates a random encryption key
 * @returns Random encryption key as Uint8Array
 */
export async function generateKey(): Promise<CryptoKey> {
  if (!crypto) throw new Error("Web Crypto API not available")

  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  )
}

/**
 * Encrypt data before storing in localStorage
 * @param data Data to encrypt
 * @param key CryptoKey to use for encryption
 * @returns Encrypted data as base64 string with IV
 */
export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  if (!crypto) throw new Error("Web Crypto API not available")

  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Convert data to ArrayBuffer
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    dataBuffer
  )

  // Combine IV and encrypted data
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength)
  result.set(iv)
  result.set(new Uint8Array(encryptedBuffer), iv.length)

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...result))
}

/**
 * Decrypt data from localStorage
 * @param encryptedData Encrypted data as base64 string with IV
 * @param key CryptoKey to use for decryption
 * @returns Decrypted data as string
 */
export async function decrypt(
  encryptedData: string,
  key: CryptoKey
): Promise<string> {
  if (!crypto) throw new Error("Web Crypto API not available")

  // Convert from base64
  const binaryString = atob(encryptedData)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Extract IV (first 12 bytes)
  const iv = bytes.slice(0, 12)
  const encryptedBytes = bytes.slice(12)

  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encryptedBytes
  )

  // Convert back to string
  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}

/**
 * Derive an encryption key from a password
 * @param password Password to derive key from
 * @param salt Salt for key derivation (should be stored alongside encrypted data)
 * @returns CryptoKey derived from password
 */
export async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  if (!crypto) throw new Error("Web Crypto API not available")

  // Generate salt if not provided
  const useSalt = salt || crypto.getRandomValues(new Uint8Array(16))

  // Convert password to key material
  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  )

  // Derive the actual encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: useSalt,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )

  return { key, salt: useSalt }
}

/**
 * Secure localStorage wrapper
 */
export const secureStorage = {
  // Helper to retrieve or generate an encryption key
  async getKey(): Promise<CryptoKey> {
    if (!isBrowser) throw new Error("Cannot use secureStorage outside browser")

    let key: CryptoKey

    // In a real app, you'd want to use a password from the user
    // For this demo, we'll use a session key that's regenerated on page reload
    const sessionKey = sessionStorage.getItem("encryption_key")

    if (sessionKey) {
      // Use existing key
      key = await crypto.subtle.importKey(
        "jwk",
        JSON.parse(sessionKey),
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )
    } else {
      // Generate new key
      key = await generateKey()

      // Save key to session storage
      const exportedKey = await crypto.subtle.exportKey("jwk", key)
      sessionStorage.setItem("encryption_key", JSON.stringify(exportedKey))
    }

    return key
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isBrowser) return

    try {
      const encryptionKey = await this.getKey()
      const encryptedValue = await encrypt(value, encryptionKey)
      localStorage.setItem(key, encryptedValue)
    } catch (error) {
      console.error("Failed to securely store data:", error)
      // Fallback to regular localStorage if encryption fails
      localStorage.setItem(key, value)
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (!isBrowser) return null

    const value = localStorage.getItem(key)
    if (!value) return null

    try {
      const encryptionKey = await this.getKey()
      return await decrypt(value, encryptionKey)
    } catch (error) {
      console.error("Failed to decrypt data:", error)
      // If decryption fails, it might be stored unencrypted
      return value
    }
  },

  removeItem(key: string): void {
    if (isBrowser) {
      localStorage.removeItem(key)
    }
  },

  clear(): void {
    if (isBrowser) {
      localStorage.clear()
    }
  }
}
