import { lazy } from 'react'

export const TanStackRouterDevtools = process.env.NODE_ENV === 'production'
  ? () => null
  : lazy(() =>
    import('@tanstack/react-router-devtools').then((res) => ({
      default: res.TanStackRouterDevtools,
      // For Embedded Mode
      // default: res.TanStackRouterDevtoolsPanel
    }))
  )
