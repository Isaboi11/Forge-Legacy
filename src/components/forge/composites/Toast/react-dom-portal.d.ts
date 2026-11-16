/* `react-dom` ships with Expo's web build but the repo has no `@types/react-dom`. The toast's web layer
   (`ToastLayer.web.tsx`) needs exactly one function from it, so declare just that one. */
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react'
  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactPortal
}
