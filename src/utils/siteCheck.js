// Browser-only website reachability check (wizard only, not mirrored server-side).
//
// Browsers hide the status code of a cross-origin response, so a literal "got 200"
// check is impossible without a server. With mode: 'no-cors' the request is still
// sent, and we can tell two outcomes apart:
//   - fetch resolves → the host answered (DNS, TLS and connection all worked)
//   - fetch throws   → DNS failure, refused connection, TLS error or timeout

/**
 * Resolves true when the site answered, false when it could not be reached.
 * Never throws.
 */
export async function siteResponds(url, { timeoutMs = 7000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: ctrl.signal,
    })
     console.log('[siteCheck]', url, {
      type: res.type,       // 'opaque'
      status: res.status,   // always 0 in no-cors
      ok: res.ok,           // always false in no-cors
    })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}