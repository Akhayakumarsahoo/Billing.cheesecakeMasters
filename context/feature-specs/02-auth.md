Clerk is already installed and connected. Wire it into The Next. js app: provider, auth pages, redirects, route protection, and user menu.

## Design

- Use clerk light theme from "@clerk/themes" for the auth pages
  Override clerk appearance variable using the app existing CSS variables. Do not ahrd code colors.

  Keep the auth page minimal and user friendly.

## implementation

- Wrap the root layout with the clerk provider
  create signin page using clerk component

- Do not use clerk components directly. Use the wrapper components provided by clerk/ui with light background. (do not use dark background)

- Use 'proxy.ts'at the project root.

- protect every thing except
  - clerk routes (signin)

- authenticated redirect to "/"
- unauthenticated redirect to "/sign-in"

- In sign-in component I dont want the new user signup option.

Add clerk floating widget to the app.

- if user is authenticated, show the floating widget

instal clerk/ui

## Check When Done

- proxy.tss exists at the root
- all routes are protected except public auth paths
- auth pages use CSS variables with no hardcoded colors and light theme (no dark theme)
- ClerkProvider wraps the root layout
- there is no new user signup option in the signin page
- npm run build' passes
