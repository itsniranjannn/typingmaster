// Deterministic, stable stringify and hash for replay verification

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']'
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

export function stableHash(obj) {
  try {
    const s = stableStringify(obj)
    // Browser-safe FNV-1a style 32-bit hash as hex
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return (h >>> 0).toString(16).padStart(8, '0')
  } catch (e) {
    return ''
  }
}

export { stableStringify }

export default { stableStringify, stableHash }
