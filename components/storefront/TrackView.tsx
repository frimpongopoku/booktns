"use client";

import { useEffect, useRef } from "react";
import { captureEvent, type AnalyticsEvent, type AnalyticsProperties } from "@/lib/analytics";

interface TrackViewProps {
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
}

// Renders nothing; fires one event when the page it sits on is shown. Lets a
// Server Component record a view without becoming a Client Component itself.
//
// The ref guard matters in development, where React's Strict Mode mounts
// every component twice — without it, every storefront view would be counted
// as two in local testing and quietly skew whatever you were checking.
export default function TrackView({ event, properties }: TrackViewProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    captureEvent(event, properties);
  }, [event, properties]);

  return null;
}
