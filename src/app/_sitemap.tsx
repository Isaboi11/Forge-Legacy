/**
 * `/_sitemap` is closed (QA 09-26, B2 / auth-08).
 *
 * expo-router injects a `/_sitemap` screen into every app that lists all route files — on the public web
 * host that was a directory of the app, `admin` and the dev harnesses included. A file with this name
 * REPLACES the injected one (`getRoutesCore` only adds its own when `_sitemap` is absent), so the URL now
 * answers exactly like any other address that does not exist.
 *
 * Done here rather than with the router plugin's `sitemap: false` because that lives in `app.json`, and a
 * config change is a native-fingerprint question; a route file is plain JS and ships over the air.
 */
export { default } from './+not-found';
