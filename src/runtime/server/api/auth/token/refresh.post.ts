import { createError, getCookie, setCookie, defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { ModuleOptions, HttpMethod } from '../../../../../types'
import { extractByPointer, isValidDomainUrl } from '../../../../utils/helper'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authConfig: ModuleOptions = config.public.auth as ModuleOptions

  try {
    const refreshToken = getCookie(event, authConfig.token.refresh.cookieName)

    if (!refreshToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No refresh token provided - please sign in again',
      })
    }

    // Rest of your refresh logic...
    const pointer = authConfig.token.refresh.requestTokenPointer
    const pathArray = pointer.split('/').filter(Boolean)
    const refreshTokenKey = pathArray[pathArray.length - 1] ?? 'refresh_token'
    const method = authConfig.endpoints?.refresh?.method as HttpMethod || 'POST'
    const url = authConfig.endpoints?.refresh?.path
    const params = JSON.stringify({ [refreshTokenKey]: refreshToken })

    const response: any = await $fetch.raw(`${authConfig.baseUrl}${url}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: params,
    })

    if (!response || !response._data) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid response from refresh endpoint',
      })
    }

    const newAccessToken = extractByPointer(response._data, authConfig.token.tokenPointer)
    const newRefreshToken = extractByPointer(response._data, authConfig.token.refreshTokenPointer)

    if (!newAccessToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No access token in refresh response',
      })
    }

    const baseCookieOptions = {
      path: '/',
      domain: isValidDomainUrl(authConfig.token.cookieDomain) ? authConfig.token.cookieDomain : undefined,
    }

    // Set new cookies with explicit path
    setCookie(event, authConfig.token.cookieName, newAccessToken, {
      ...baseCookieOptions,
      maxAge: authConfig.token.maxAgeInSeconds,
      sameSite: authConfig.token.sameSiteAttribute,
      secure: authConfig.token.secureCookieAttribute,
      httpOnly: authConfig.token.httpOnlyCookieAttribute,
    })

    if (newRefreshToken) {
      setCookie(event, authConfig.token.refresh.cookieName, newRefreshToken, {
        ...baseCookieOptions,
        maxAge: authConfig.token.refresh.maxAgeInSeconds,
        sameSite: authConfig.token.refresh.sameSiteAttribute,
        secure: authConfig.token.refresh.secureCookieAttribute,
        httpOnly: authConfig.token.refresh.httpOnlyCookieAttribute,
      })
    }

    return {
      success: true,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    }
  }
  catch (error: any) {
    console.error('❌ Server-side token refresh failed:', error?.message || error)

    throw createError({
      statusCode: 401,
      statusMessage: error?.message || 'Token refresh failed',
    })
  }
})
