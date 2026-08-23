"use client";

import { useLayoutEffect } from "react";

/**
 * Promotes the admin theme classes (and the next/font variable class) to
 * <body> so Radix portals (dialogs, dropdowns, tooltips) that mount outside
 * the React tree still inherit the admin-root CSS variables and fonts.
 */
export function AdminBodyClass({ fontClassName }: { fontClassName?: string }) {
  useLayoutEffect(() => {
    const body = document.body;
    const classes = ["dark", "admin-root"];
    if (fontClassName) classes.push(fontClassName);
    body.classList.add(...classes);
    return () => {
      body.classList.remove(...classes);
    };
  }, [fontClassName]);
  return null;
}
