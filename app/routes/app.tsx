import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/ai-seo">AI SEO</Link>
        <Link to="/app/submit">Submit URLs</Link>
        <Link to="/app/sitemap">Sitemap</Link>
        <Link to="/app/seo-audit">SEO Audit</Link>
        <Link to="/app/meta-tags">Meta Tags</Link>
        <Link to="/app/schema">Schema</Link>
        <Link to="/app/broken-links">Broken Links</Link>
        <Link to="/app/redirects">Redirects</Link>
        <Link to="/app/robots-txt">Robots.txt</Link>
        <Link to="/app/html-sitemap">HTML Sitemap</Link>
        <Link to="/app/image-seo">Image SEO</Link>
        <Link to="/app/llms-txt">LLMs.txt</Link>
        <Link to="/app/index-health">Index Health</Link>
        <Link to="/app/alerts">Alerts</Link>
        <Link to="/app/logs">Logs</Link>
        <Link to="/app/billing">Plans</Link>
        <Link to="/app/settings">Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
