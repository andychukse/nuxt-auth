import type { ModuleOptions, SessionData, SessionStatus } from '../../types'
import { authResponseError, extractByPointer, isValidDomainUrl } from '../utils/helper'
import { useRuntimeConfig, useState, computed, useCookie, navigateTo, ref, useRequestFetch, useRequestEvent } from '#imports'
import { setCookie, getCookie } from 'h3'

export function useAuth() {
  const runConfig = useRuntimeConfig()
  const config: ModuleOptions = runConfig.public.auth as ModuleOptions
  const data = useState<SessionData | undefined | null>('auth:data', () => undefined)
  const defaultCallback = config?.callback ?? '/'
  const cookieName = config?.token?.cookieName
  const refreshCookieName = config?.token?.refresh?.cookieName
  const apiBase = config?.baseUrl
  const loading = useState<boolean>('auth:loading', () => false)
  const status = computed<SessionStatus>(() => {
    if (loading.value) {
      return 'loading'
    }
    if (data.value) {
      return 'authenticated'
    }
    return 'unauthenticated'
  })

  // Synchronous token initialization
  const getInitialToken = (): string | null => {
    if (import.meta.server) {
      const event = useRequestEvent()
      if (event) {
        return getCookie(event, cookieName) || null
      }
    }
    return null // Client starts with null, loads async
  }

  const getInitialRefreshToken = (): string | null => {
    if (import.meta.server) {
      const event = useRequestEvent()
      if (event) {
        return getCookie(event, refreshCookieName) || null
      }
    }
    return null // Client starts with null, loads async
  }

  const getAccessToken = async () => {
    try {
      const tokens = await $fetch('/api/auth/token/get-token', {
        method: 'POST',
      })
      return tokens
    }
    catch (error) {
      console.error('Failed to get tokens:', error)
      return null
    }
  }

  const rawToken = useState<string | null>('auth:raw-token', getInitialToken)
  const rawRefreshToken = useState<string | null>('auth:raw-refresh-token', getInitialRefreshToken)

  // Load token on client-side
  const loadClientToken = async () => {
    if (
      import.meta.client
        && (rawToken.value === null || rawRefreshToken.value === null)
    ) {
      try {
        const tokens = await getAccessToken() as any
        if (tokens?.accessToken) {
          rawToken.value = tokens?.accessToken
        }
        if (tokens?.refreshToken) {
          rawRefreshToken.value = tokens?.refreshToken
        }
      }
      catch (error) {
        console.error('Failed to load client token:', error)
      }
    }
  }

  // Initialize client token
  if (import.meta.client) {
    loadClientToken()
  }

  const token = computed(() => rawToken.value)
  const refreshToken = computed(() => rawRefreshToken.value)

  const setTokens = (tokens: unknown) => {
    const accessToken = extractByPointer(tokens, config?.token?.tokenPointer)
    const newRefreshToken = extractByPointer(tokens, config?.token?.refreshTokenPointer)

    if (accessToken) {
      rawToken.value = accessToken
    }
    if (newRefreshToken) {
      rawRefreshToken.value = newRefreshToken
    }
    if (import.meta.server) {
      // Server-side: set httpOnly cookie directly
      const event = useRequestEvent()
      if (event) {
        const baseCookieOptions = {
          path: '/',
          domain: isValidDomainUrl(config.token.cookieDomain) ? config.token.cookieDomain : undefined,
        }

        if (accessToken) {
          // Set access token as regular cookie
          setCookie(event, config?.token?.cookieName, accessToken, {
            ...baseCookieOptions,
            maxAge: config?.token?.maxAgeInSeconds,
            sameSite: config?.token?.sameSiteAttribute,
            secure: config?.token?.secureCookieAttribute,
            httpOnly: config?.token?.httpOnlyCookieAttribute,
          })
        }
        if (newRefreshToken) {
          // Set access token as regular cookie
          setCookie(event, config?.token?.refresh?.cookieName, newRefreshToken, {
            ...baseCookieOptions,
            maxAge: config?.token?.refresh?.maxAgeInSeconds,
            sameSite: config?.token?.refresh?.sameSiteAttribute,
            secure: config?.token?.refresh?.secureCookieAttribute,
            httpOnly: config?.token?.refresh?.httpOnlyCookieAttribute,
          })
        }
      }
    }
    else {
      // Client-side: make a request to set the httpOnly cookie
      if (accessToken || newRefreshToken) {
        $fetch('/api/auth/token/set-token', {
          method: 'POST',
          body: {
            refreshToken: newRefreshToken,
            accessToken: accessToken,
          },
        }).then(() => {
          console.log('Tokens set via client request')
        }).catch((error) => {
          console.error('Failed to set token cookies:', error)
        })
      }
    }
  }

  const clearAuthToken = async () => {
    try {
      await $fetch('/api/auth/token/clear-token', {
        method: 'POST',
      })
    }
    catch (error) {
      console.error('Failed to clear refresh token:', error)
    }
  }

  const clearTokens = async () => {
    rawToken.value = null
    rawRefreshToken.value = null
    data.value = null
    await clearAuthToken()
  }

  const fetchApi = async (
    url: string | (() => string),
    options: {
      method: string | any
      headers: object
      body?: any
    },
  ) => {
    try {
      return await $fetch.raw(apiBase + url, {
        ...options,
        headers: {
          ...options?.headers,
        },
      })
    }
    catch (error: any) {
      console.error('API Error:', {
        error: error,
      })
      return error
    }
  }

  // Track refresh attempts to avoid infinite loops
  // If we get a 401, we will try to refresh the token twice before giving up
  // This is to prevent infinite loops in case of persistent 401 errors
  // This is useful for cases where the refresh token is invalid or expired
  const refreshAttemptCount = ref(0)
  const maxRefreshAttempts = 2
  const fetchUser = async () => {
    if (!token?.value) {
      loading.value = false
      return
    }

    try {
      const url = config.endpoints?.getSession?.path

      const response = await fetchApi(
        url,
        {
          method: config.endpoints?.getSession?.method,
          headers: {
            Authorization: `Bearer ${token?.value}`,
          },
        },
      )

      if (response?.ok && response?._data) {
        data.value = response._data
      }
      else {
        if (response.status === 401 && refreshToken?.value && refreshAttemptCount.value < maxRefreshAttempts) {
          // If 401 and we have a refresh token, try to refresh max twice
          await refreshAuthToken()
          refreshAttemptCount.value++
          return await fetchUser()
        }

        // If we reach here, it means we either don't have a refresh token or we've exhausted attempts
        await clearTokens()

        data.value = null
      }
    }
    catch (error: any) {
      const errorMessage = authResponseError(error)
      data.value = null
      throw new Error(errorMessage)
    }
    finally {
      loading.value = false
    }
  }

  const getSession = async () => {
    loading.value = true
    await fetchUser()
  }

  const signUp = async (userData: any, { callbackUrl }: { callbackUrl?: string } = {}) => {
    const url = config.endpoints?.signUp?.path

    const response: any = await fetchApi(
      url,
      {
        method: config.endpoints?.signUp?.method,
        headers: {},
        body: userData,
      },
    )

    if (response?.ok && response?._data) {
      setTokens(response._data)

      if (response._data?.user) {
        data.value = response._data?.user
      }
      else {
        await fetchUser()
      }

      // Navigate to callback URL if provided, otherwise to default callback
      if (callbackUrl) {
        return await navigateTo(callbackUrl)
      }
      else {
        return await navigateTo(defaultCallback)
      }
    }
    else {
      const error = authResponseError(response)
      throw new Error(error)
    }
  }

  const signIn = async (loginData: any, { callbackUrl }: { callbackUrl?: string } = {}) => {
    const url = config.endpoints?.signIn?.path

    const response: any = await fetchApi(
      url,
      {
        method: config.endpoints?.signIn?.method,
        headers: {},
        body: loginData,
      },
    )

    if (response?.ok && response?._data) {
      setTokens(response._data)

      await fetchUser()

      if (callbackUrl) {
        return await navigateTo(callbackUrl)
      }
      else {
        return await navigateTo(defaultCallback)
      }
    }
    else {
      const error = authResponseError(response)
      throw new Error(error)
    }
  }

  const signInWithSocial = async (provider: string, params: any, { callbackUrl }: { callbackUrl?: string } = {}) => {
    const url = config.endpoints?.[provider]?.path

    if (!url) {
      throw new Error(`Social provider ${provider} is not configured`)
    }

    const response: any = await fetchApi(
      url,
      {
        method: config.endpoints?.[provider]?.method,
        headers: {},
        body: params,
      },
    )

    if (response?.ok && response?._data) {
      setTokens(response._data)
      if (response._data?.user) {
        data.value = response._data?.user
      }
      else {
        await fetchUser()
      }

      if (callbackUrl) {
        await navigateTo(callbackUrl)
      }
      else {
        await navigateTo(defaultCallback)
      }
    }
    else {
      const error = authResponseError(response)
      throw new Error(error)
    }
  }

  // Enhanced social login with built-in OAuth flow handling
  const initiateSocialLogin = async (provider: string, options: {
    callbackUrl?: string
    clientId?: string
    redirectUri?: string
    scopes?: string
    state?: string
    callbackPage?: string // New option to specify which page handles the OAuth callback
  } = {}) => {
    if (provider !== 'google') {
      throw new Error(`Provider ${provider} is not supported`)
    }

    // Generate state for CSRF protection if not provided
    const state = options.state || generateRandomState()

    // Store state and callback info for later use
    if (import.meta.client) {
      localStorage.setItem('oauth_state', state)
      if (options.callbackUrl) {
        localStorage.setItem('oauth_callback', options.callbackUrl)
      }

      // Set socialRedirect cookie for server-side callback handling
      if (options.callbackPage) {
        // Remove leading slash if present to match the server route expectation
        const callbackPage = options.callbackPage.replace(/^\//, '')
        const socialRedirectCookie = useCookie('socialRedirect')
        socialRedirectCookie.value = callbackPage
      }
    }

    // Build OAuth URL based on provider
    const authUrl = buildOAuthUrl(provider, {
      clientId: options.clientId || config.social?.google?.clientId,
      redirectUri: options.redirectUri || config.social?.google?.redirectUri,
      scopes: options.scopes || 'openid profile email',
      state,
    })

    // Redirect to OAuth provider
    if (import.meta.client) {
      window.location.href = authUrl
    }
    else {
      await navigateTo(authUrl, { external: true })
    }
  }

  // Handle OAuth callback
  const handleSocialCallback = async (provider: string, code: string, state?: string, params?: any) => {
    if (import.meta.client) {
      // Verify state for CSRF protection
      const storedState = localStorage.getItem('oauth_state')
      if (state && storedState && state !== storedState) {
        throw new Error('Invalid state parameter. Possible CSRF attack.')
      }

      // Get stored callback URL
      const callbackUrl = localStorage.getItem('oauth_callback')

      // Clean up localStorage
      localStorage.removeItem('oauth_state')
      localStorage.removeItem('oauth_callback')

      // Merge additional params into the code object
      const data = (params && typeof params === 'object') ? { code, ...params } : { code }

      // Exchange code for tokens via your backend
      await signInWithSocial(provider, data, { callbackUrl: callbackUrl || undefined })
    }
  }

  // Helper function to generate random state
  const generateRandomState = () => {
    return Math.random().toString(36).substring(2, 15)
      + Math.random().toString(36).substring(2, 15)
  }

  // Helper function to build OAuth URLs
  const buildOAuthUrl = (provider: string, options: {
    clientId?: string
    redirectUri?: string
    scopes?: string
    state: string
  }) => {
    if (provider === 'google') {
      const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
      const params = new URLSearchParams({
        client_id: options.clientId || '',
        redirect_uri: options.redirectUri || '',
        response_type: 'code',
        scope: options.scopes || 'openid profile email',
        state: options.state,
        access_type: 'offline',
        prompt: 'consent',
      })
      return `${baseUrl}?${params.toString()}`
    }

    throw new Error(`OAuth URL building not implemented for provider: ${provider}`)
  }

  const refreshAuthToken = async () => {
    if (!refreshToken?.value) {
      await signOut()
      return
    }

    try {
      // Call the server-side refresh handler instead of calling backend directly
      const response: any = await useRequestFetch()('/api/auth/token/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response && response.access_token) {
        // Update the access token directly
        rawToken.value = response.access_token

        // Update the refresh token state if new one is provided
        if (response.refresh_token) {
          rawRefreshToken.value = response.refresh_token
        }

        // If user data is included in response, update it
        if (response?.user) {
          data.value = response.user
        }
        else {
          // Fetch user data with new token
          await fetchUser()
        }
      }
      else {
        throw new Error('No response from refresh endpoint')
      }
    }
    catch (error: any) {
      console.error('Token refresh failed:', error)
      // Clear tokens and sign out user on refresh failure
      await clearTokens()
      data.value = null
    }
  }

  const signOut = async () => {
    if (token?.value) {
      const url = config.endpoints?.signOut?.path

      await fetchApi(
        url,
        {
          method: config.endpoints?.signOut?.method,
          headers: {
            'Authorization': `Bearer ${token?.value}`,
            'Content-Type': 'application/json',
          },
        },
      )
    }
    await clearTokens()
    data.value = null
  }

  return {
    status,
    data,
    token,
    refreshToken,
    rawToken,
    loading,
    signUp,
    signIn,
    signOut,
    getSession,
    signInWithSocial,
    initiateSocialLogin,
    handleSocialCallback,
    refreshAuthToken,
    clearTokens,
  }
}
