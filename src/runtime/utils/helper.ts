/**
 * Utility function to extract error messages from API responses
 */
export function authResponseError(response: any): string {
  // Handle network errors
  if (response?.name === 'FetchError' && response?.message) {
    if (response?.data?.message) {
      return response?.data?.message
    }

    if (response?._data?.message) {
      return response?._data?.message
    }

    if (response.message.includes('ECONNREFUSED')) {
      return `Cannot connect to API server. Make sure the backend is running at the configured URL.`
    }

    return `Network error: ${response.message}`
  }

  // Handle HTTP errors
  if (response?.status && response?.statusText) {
    return `HTTP ${response.status}: ${response.statusText}`
  }

  if (response?.data) {
    if (typeof response?.data?.message === 'string') {
      return response?.data?.message
    }
    if (typeof response?.message === 'string') {
      return response?.message
    }
    return response?.data
  }

  if (response?._data?.message) {
    return response._data.message
  }

  if (response?._data?.detail) {
    return response._data.detail
  }

  if (response?._data?.error) {
    if (typeof response._data.error === 'string') {
      return response._data.error
    }
    if (typeof response._data.error === 'object' && response._data.error.message) {
      return response._data.error.message
    }
    return response._data.error
  }

  if (response?.statusText) {
    return response.statusText
  }

  if (response?.message) {
    return response.message
  }

  if (response?.toString && typeof response.toString === 'function') {
    const errorString = response.toString()
    if (errorString !== '[object Object]') {
      return errorString
    }
  }

  // Log the full error for debugging
  console.error('Full error object:', response)

  return 'An unexpected error occurred. Check the console for more details.'
}

/**
 * Safely extracts a nested value from an object using a pointer path
 * @param obj - The object to extract from
 * @param pointer - The pointer path (e.g., '/access_token' or '/refresh/token')
 * @returns The extracted value or undefined
 */
export function extractByPointer(obj: any, pointer: string): any {
  if (!pointer || !obj) return undefined

  const pathArray = pointer.split('/').filter(Boolean)

  if (pathArray.length === 0) return undefined

  let current = obj
  for (const key of pathArray) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    }
    else {
      return undefined
    }
  }

  return current
}

export function isValidDomainUrl(domain: string): boolean {
  try {
    const _url = new URL(domain)
    return true
  }
  catch {
    return false
  }
}
