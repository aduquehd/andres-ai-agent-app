"use client";

import { useLayoutEffect } from "react";

/**
 * Promotes the admin theme classes to <body> so Radix portals
 * (dialogs, dropdowns, tooltips) that mount outside the React tree
 * still inherit the admin-root CSS variables.
 */
export function AdminBodyClass() {
  useLayoutEffect(() => {
    const body = document.body;
    body.classList.add("dark", "admin-root");
    return () => {
      body.classList.remove("dark", "admin-root");
    };
  }, []);
  return null;
}
