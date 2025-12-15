import { defineEventHandler, readBody, setCookie, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { ModuleOptions } from '../../../../../types'
import { isValidDomainUrl } from '../../../../utils/helper'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authConfig: ModuleOptions = config.public.auth as ModuleOptions

  const body = await readBody(event)
  const { refreshToken, accessToken } = body

  if (!accessToken || !refreshToken) {
    if (!accessToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No token provided',
      })
    }

    if (!refreshToken && !authConfig.token.refresh.refreshOnlyToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No refresh token provided',
      })
    }
  }

  const baseCookieOptions = {
    path: '/',
    domain: isValidDomainUrl(authConfig.token.cookieDomain) ? authConfig.token.cookieDomain : undefined,
  }

  // Set access token cookie
  setCookie(event, authConfig.token.cookieName, accessToken, {
    ...baseCookieOptions,
    maxAge: authConfig.token.maxAgeInSeconds,
    sameSite: authConfig.token.sameSiteAttribute,
    secure: authConfig.token.secureCookieAttribute,
    httpOnly: authConfig.token.httpOnlyCookieAttribute,
  })

  // Set refresh token cookie
  if (refreshToken) {
    setCookie(event, authConfig.token.refresh.cookieName, refreshToken, {
      ...baseCookieOptions,
      maxAge: authConfig.token.refresh.maxAgeInSeconds,
      sameSite: authConfig.token.refresh.sameSiteAttribute,
      secure: authConfig.token.refresh.secureCookieAttribute,
      httpOnly: authConfig.token.refresh.httpOnlyCookieAttribute,
    })
  }

  return { success: true }
})
