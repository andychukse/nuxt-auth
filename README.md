# Simple Nuxt Auth

A simple and flexible authentication module for Nuxt 3 with JWT and social login support. 
**This Auth Package only works for a Nuxt app that has a separate backend that handles authenthication**

## Features

- **JWT Authentication**: Secure token-based authentication
- **Social Login**: Support for Google OAuth with flexible callback handling
- **Cookie Management**: Secure HTTP-only cookies for token storage
- **Token Refresh**: Automatic token refresh functionality
- **Route Protection**: Built-in middleware for protecting routes
- **Flexible Configuration**: Easy to configure and customize
- **SSR Support**: Works with both client-side and server-side rendering
- **TypeScript**: Full TypeScript support
- **OAuth Flows**: Both client-side and server-side OAuth callback handling
- **Auto-imports**: Composables and utilities are auto-imported

## Quick Setup

1. Add `@andychukse/nuxt-auth` dependency to your project

```bash
# Using pnpm
pnpm add @andychukse/nuxt-auth

# Using yarn
yarn add @andychukse/nuxt-auth

# Using npm
npm install @andychukse/nuxt-auth
```

2. Add `@andychukse/nuxt-auth` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: [
    '@andychukse/nuxt-auth'
  ]
})
```

3. Configure the module in your `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: ['@andychukse/nuxt-auth'],
  
  // Configure the auth module
  auth: {
    isEnabled: true,
    baseUrl: '/api/auth',
    callback: '/',
    endpoints: {
      signIn: { path: '/login', method: 'post' },
      signOut: { path: '/logout', method: 'post' },
      signUp: { path: '/register', method: 'post' },
      getSession: { path: '/session', method: 'get' },
      refresh: { path: '/refresh', method: 'post' },
      google: { path: '/google', method: 'post' },
    },
    token: {
      tokenPointer: '/access_token',
      refreshTokenPointer: '/refresh_token',
      type: 'Bearer',
      cookieName: 'auth.token',
      headerName: 'Authorization',
      maxAgeInSeconds: 86400, // 1 day
      sameSiteAttribute: 'lax',
      cookieDomain: '',
      secureCookieAttribute: false,
      httpOnlyCookieAttribute: true,
      refresh: {
        refreshOnlyToken: true,
        cookieName: 'auth.refresh',
        maxAgeInSeconds: 7776000, // 90 days
        requestTokenPointer: '/refresh_token',
        sameSiteAttribute: 'lax',            
        secureCookieAttribute: false,        
        httpOnlyCookieAttribute: true, 
      },
    },
    social: {
      google: {
        clientId: 'your-google-client-id.googleusercontent.com',
        redirectUri: 'http://localhost:3000/auth/google/callback',
        scopes: 'openid profile email'
      }
    },
  },
})
```

## Usage

### Basic Authentication Flow

```vue
<template>
  <div>
    <div v-if="status === 'loading'">
      <p>Loading...</p>
    </div>
    <div v-else-if="status === 'authenticated'">
      <h1>Welcome {{ data?.name || data?.email }}!</h1>
      <p>Status: {{ status }}</p>
      <button @click="handleSignOut" class="btn-logout">Sign Out</button>
    </div>
    <div v-else>
      <h1>Please sign in</h1>
      <button @click="showLogin = true" class="btn-login">Sign In</button>
      <button @click="showRegister = true" class="btn-register">Register</button>
    </div>
  </div>
</template>

<script setup>
const { status, data, signOut } = useAuth()
const showLogin = ref(false)
const showRegister = ref(false)

const handleSignOut = async () => {
  try {
    await signOut()
    // User will be redirected automatically
  } catch (error) {
    console.error('Sign out failed:', error)
  }
}
</script>
```

### Sign In Form

```vue
<template>
  <div class="auth-form">
    <h2>Sign In</h2>
    <form @submit.prevent="handleSignIn">
      <div class="form-group">
        <label for="email">Email:</label>
        <input 
          id="email"
          v-model="form.email" 
          type="email" 
          required 
          placeholder="Enter your email"
        />
      </div>
      
      <div class="form-group">
        <label for="password">Password:</label>
        <input 
          id="password"
          v-model="form.password" 
          type="password" 
          required 
          placeholder="Enter your password"
        />
      </div>
      
      <button type="submit" :disabled="loading" class="btn-submit">
        {{ loading ? 'Signing in...' : 'Sign In' }}
      </button>
      
      <p v-if="error" class="error">{{ error }}</p>
    </form>
    
    <!-- Social Login -->
    <div class="social-login">
      <button @click="handleGoogleSignIn" class="btn-google">
        Sign in with Google
      </button>
    </div>
  </div>
</template>

<script setup>
const { signIn, loading } = useAuth()

const form = reactive({
  email: '',
  password: ''
})

const error = ref('')

const handleSignIn = async () => {
  try {
    error.value = ''
    await signIn(form, { 
      callbackUrl: '/dashboard' // Optional: redirect after login
    })
    // User will be redirected automatically
  } catch (err) {
    error.value = err.message || 'Sign in failed'
  }
}

const handleGoogleSignIn = async () => {
  try {
    // Method 1: Direct OAuth with built-in flow
    await initiateSocialLogin('google', {
      callbackUrl: '/dashboard'
    })
    // This will redirect to Google OAuth
  } catch (err) {
    error.value = err.message || 'Google sign in failed'
  }
}
</script>
```

### Register Form

```vue
<template>
  <div class="auth-form">
    <h2>Create Account</h2>
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label for="name">Full Name:</label>
        <input 
          id="name"
          v-model="form.name" 
          type="text" 
          required 
          placeholder="Enter your full name"
        />
      </div>
      
      <div class="form-group">
        <label for="email">Email:</label>
        <input 
          id="email"
          v-model="form.email" 
          type="email" 
          required 
          placeholder="Enter your email"
        />
      </div>
      
      <div class="form-group">
        <label for="password">Password:</label>
        <input 
          id="password"
          v-model="form.password" 
          type="password" 
          required 
          placeholder="Choose a password"
          minlength="8"
        />
      </div>
      
      <div class="form-group">
        <label for="confirmPassword">Confirm Password:</label>
        <input 
          id="confirmPassword"
          v-model="form.confirmPassword" 
          type="password" 
          required 
          placeholder="Confirm your password"
        />
      </div>
      
      <button type="submit" :disabled="loading || !isFormValid" class="btn-submit">
        {{ loading ? 'Creating account...' : 'Create Account' }}
      </button>
      
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
const { signUp, loading } = useAuth()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const error = ref('')

const isFormValid = computed(() => {
  return form.password === form.confirmPassword && 
         form.password.length >= 8
})

const handleRegister = async () => {
  try {
    error.value = ''
    
    if (!isFormValid.value) {
      error.value = 'Please check your password'
      return
    }
    
    await signUp({
      name: form.name,
      email: form.email,
      password: form.password
    }, {
      callbackUrl: '/welcome' // Optional: redirect after registration
    })
    // User will be redirected automatically
  } catch (err) {
    error.value = err.message || 'Registration failed'
  }
}
</script>
```

### Advanced Google OAuth Integration

The module provides two ways to handle Google OAuth:

#### 1. Client-Side Callback (Recommended for SPAs)

```vue
<template>
  <div>
    <button @click="signInWithGoogle" class="google-btn">
      <svg><!-- Google icon --></svg>
      Continue with Google
    </button>
  </div>
</template>

<script setup>
const { initiateSocialLogin } = useAuth()

const signInWithGoogle = async () => {
  try {
    // This will redirect to Google OAuth and handle the callback client-side
    await initiateSocialLogin('google', {
      clientId: 'your-google-client-id',
      redirectUri: 'http://localhost:3000/auth/google/callback',
      scopes: 'openid profile email',
      callbackUrl: '/dashboard' // Where to go after successful auth
    })
  } catch (error) {
    console.error('Google OAuth failed:', error)
  }
}
</script>
```

Create the callback page at `/pages/auth/google/callback.vue`:

```vue
<template>
  <div class="callback-handler">
    <div v-if="loading">
      <p>Processing Google authentication...</p>
    </div>
    <div v-else-if="error">
      <p>Authentication failed: {{ error }}</p>
      <button @click="$router.push('/login')">Back to Login</button>
    </div>
  </div>
</template>

<script setup>
const { handleSocialCallback } = useAuth()
const route = useRoute()

const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { code, state } = route.query
    
    if (code) {
      await handleSocialCallback('google', code, state)
      // User will be redirected to callbackUrl automatically
    } else {
      throw new Error('No authorization code received')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>
```

#### 2. Server-Side Callback (Recommended for SSR)

```vue
<script setup>
const { initiateSocialLogin } = useAuth()

const signInWithGoogleSSR = async () => {
  try {
    // This will use server-side callback handling
    await initiateSocialLogin('google', {
      callbackUrl: '/dashboard',
      callbackPage: 'auth/custom-handler' // Server will redirect here with OAuth params
    })
  } catch (error) {
    console.error('Google OAuth failed:', error)
  }
}
</script>
```

### Route Protection with Middleware

Protect routes by adding the `auth` middleware:

```vue
<script setup>
definePageMeta({
  middleware: 'auth'
})
</script>

<template>
  <div>
    <h1>Protected Page</h1>
    <p>This page is only accessible to authenticated users.</p>
  </div>
</template>
```

For guest-only pages (login, register), use the `guest` middleware:

```vue
<script setup>
definePageMeta({
  middleware: 'guest'
})
</script>

<template>
  <div>
    <h1>Login Page</h1>
    <!-- Login form here -->
  </div>
</template>
```

### Social Authentication

For Google authentication:

```vue
<template>
  <button @click="signInWithGoogle">Sign in with Google</button>
</template>

<script setup>
const { signInWithSocial } = useAuth()

const signInWithGoogle = async () => {
  try {
    await signInWithSocial('google', { 
      code: 'google-auth-code',
      state: 'random-state' 
    })
  } catch (error) {
    console.error('Google sign-in failed:', error)
  }
}
</script>
```

## API Reference

### `useAuth()`

The main composable that provides authentication functionality.

#### Returns

- `status`: Reactive authentication status (`'loading' | 'authenticated' | 'unauthenticated'`)
- `data`: Reactive user data object
- `token`: Reactive access token
- `refreshToken`: Reactive refresh token
- `loading`: Reactive loading state
- `signUp(userData, options?)`: Function to register a new user
- `signIn(loginData, options?)`: Function to sign in a user
- `signOut()`: Function to sign out the current user
- `getSession()`: Function to fetch the current user session
- `signInWithSocial(provider, params, options?)`: Function for social authentication
- `initiateSocialLogin(provider, options?)`: Function to start OAuth flow
- `handleSocialCallback(provider, code, state?)`: Function to handle OAuth callback
- `refreshAuthToken()`: Function to refresh the access token
- `clearTokens()`: Function to clear all tokens

#### Function Signatures

```typescript
// Sign up a new user
signUp(userData: any, options?: { callbackUrl?: string }): Promise<void>

// Sign in an existing user
signIn(loginData: any, options?: { callbackUrl?: string }): Promise<void>

// Sign in with social provider (after getting OAuth code)
signInWithSocial(provider: string, params: any, options?: { callbackUrl?: string }): Promise<void>

// Initiate OAuth flow (redirects to provider)
initiateSocialLogin(provider: string, options?: {
  callbackUrl?: string
  clientId?: string
  redirectUri?: string
  scopes?: string[]
  state?: string
  callbackPage?: string // For server-side callback
}): Promise<void>

// Handle OAuth callback (client-side)
handleSocialCallback(provider: string, code: string, state?: string): Promise<void>
```

### Utility Functions

#### `authResponseError(response)`

Extracts error messages from API responses.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isEnabled` | boolean | `true` | Enable/disable the auth module |
| `baseUrl` | string | `'/api/auth'` | API base URL for authentication endpoints |
| `callback` | string | `'/'` | Default redirect after successful authentication |
| `endpoints` | object | See below | API endpoint configuration |
| `token` | object | See below | Token configuration |
| `social` | object | See below | Social authentication configuration |

### Endpoint Configuration

```js
endpoints: {
  signIn: { path: '/login', method: 'post' },
  signOut: { path: '/logout', method: 'post' },
  signUp: { path: '/register', method: 'post' },
  getSession: { path: '/session', method: 'get' },
  refresh: { path: '/refresh', method: 'post' },
  google: { path: '/google', method: 'post' },
}
```

### Token Configuration

```js
token: {
  tokenPointer: '/access_token',        // Path to access token in API response
  refreshTokenPointer: '/refresh_token', // Path to refresh token in API response
  type: 'Bearer',                       // Token type for Authorization header
  cookieName: 'auth.token',            // Cookie name for access token
  headerName: 'Authorization',          // Header name for API requests
  maxAgeInSeconds: 86400,              // Token expiration (1 day)
  sameSiteAttribute: 'lax',            // Cookie SameSite attribute
  cookieDomain: '',                    // Cookie domain (empty = current domain)
  secureCookieAttribute: true,        // Use HTTPS only (true in production)
  httpOnlyCookieAttribute: true,      // HTTP-only cookies (recommended: true)
  refresh: {
    refreshOnlyToken: true,            // Only send refresh token (not access token)
    cookieName: 'auth.refresh',        // Cookie name for refresh token
    maxAgeInSeconds: 7776000,          // Refresh token expiration (90 days)
    requestTokenPointer: '/refresh_token', // Path to refresh token in request
    sameSiteAttribute: 'lax',            // Cookie SameSite (strict in production)
    secureCookieAttribute: true,        // Use HTTPS only (true in production)
    httpOnlyCookieAttribute: true,      // HTTP-only cookies (recommended: true)
  },
}
```

### Social Authentication Configuration

```js
social: {
  google: {
    clientId: 'your-google-client-id.googleusercontent.com',
    redirectUri: 'http://localhost:3000/auth/google/callback',
    scopes: 'openid profile email'
  }
}
```

## Server Routes

The module automatically adds these server routes for social authentication:

- `/api/auth/google/callback` - Google OAuth callback

## Security Considerations

- Always use HTTPS in production (`secureCookieAttribute: true`)
- Consider using HTTP-only cookies (`httpOnlyCookieAttribute: true`)
- Set appropriate cookie SameSite attributes
- Validate tokens on the server side
- Use short token expiration times with refresh tokens

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the module
npm run prepack

# Run tests
npm run test
```

## Contributing

Here’s an improved and up-to-date section for your README.md, including install instructions, sample usage for sign in, register, sign out, Google login, a modern config example, a development section, and a contribution guide. I’ll insert this content in the appropriate places and update the development/contribution sections at the end.

---

```markdown
## Installation

```bash
npm install @andychukse/nuxt-auth
# or
yarn add @andychukse/nuxt-auth
# or
pnpm add @andychukse/nuxt-auth
```

## Module Setup

Add the module and configure it in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@andychukse/nuxt-auth'],
  auth: {
    isEnabled: true,
    baseUrl: 'https://api_url/auth',
    callback: '/',
    endpoints: {
      signIn: { path: '/login', method: 'post' },
      signOut: { path: '/logout', method: 'post' },
      signUp: { path: '/register', method: 'post' },
      getSession: { path: '/session', method: 'get' },
      refresh: { path: '/refresh', method: 'post' },
      google: { path: '/google', method: 'post' },
    },
    token: {
      tokenPointer: '/access_token',
      refreshTokenPointer: '/refresh_token',
      type: 'Bearer',
      cookieName: 'auth.token',
      headerName: 'Authorization',
      maxAgeInSeconds: 86400,
      sameSiteAttribute: 'lax',
      cookieDomain: '',
      secureCookieAttribute: false,
      httpOnlyCookieAttribute: true,
      refresh: {
        refreshOnlyToken: true,
        cookieName: 'auth.refresh',
        maxAgeInSeconds: 7776000,
        requestTokenPointer: '/refresh_token',
        sameSiteAttribute: 'lax',            
        secureCookieAttribute: false,   
        httpOnlyCookieAttribute: true, 
      },
    },
    social: {
      google: {
        clientId: 'your-google-client-id.googleusercontent.com',
        redirectUri: 'http://localhost:3000/auth/google/callback',
        scopes: 'openid profile email'
      }
    },
  },
})
```

## Development

```bash
# Install dependencies
npm install

# Develop with the playground app
npm run dev

# Build the module for production
npm run prepack

# Run tests
npm run test
```

## Contributing

1. Fork this repo and create your feature branch (`git checkout -b feature/my-feature`)
2. Commit your changes (`git commit -am 'Add new feature'`)
3. Push to the branch (`git push origin feature/my-feature`)
4. Open a pull request

- Please write clear commit messages and add tests for new features.
- For major changes, open an issue first to discuss what you’d like to change.


## License

[MIT License](./LICENSE)
