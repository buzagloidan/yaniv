import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ?? 'https://eu.i.posthog.com';
let isInitialized = false;

function ensureAnalytics(): boolean {
  if (!POSTHOG_KEY) return false;
  if (isInitialized) return true;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
  isInitialized = true;
  return true;
}

export function initAnalytics(): void {
  ensureAnalytics();
}

export function getAnalyticsClient() {
  return ensureAnalytics() ? posthog : null;
}

export function identifyUser(userId: string, displayName: string): void {
  if (!ensureAnalytics()) return;
  posthog.identify(userId, { display_name: displayName });
}

export function resetAnalyticsUser(): void {
  if (!ensureAnalytics()) return;
  posthog.reset();
}

export function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (!ensureAnalytics()) return;
  posthog.capture(event, props);
}
