import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ?? 'https://eu.i.posthog.com';

export function initAnalytics(): void {
  if (!POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
}

export function identifyUser(userId: string, displayName: string): void {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, { display_name: displayName });
}

export function resetAnalyticsUser(): void {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

export function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, props);
}
