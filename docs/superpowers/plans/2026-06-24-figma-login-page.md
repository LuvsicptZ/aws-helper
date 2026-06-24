# Figma Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline signed-out authentication controls with a responsive full-page login experience matching Figma node `4:2`.

**Architecture:** Gate the application at `App` when there is no Supabase session and Local mode has not been selected. A focused `LoginPage` owns Magic Link and Google OAuth actions; authenticated and local users continue into the existing application unchanged.

**Tech Stack:** React, TypeScript, Tailwind CSS, Supabase Auth, Vitest, Playwright.

---

### Task 1: Authentication entry behavior

- [ ] Add a failing E2E test proving signed-out users see the login page.
- [ ] Add Local mode behavior and prove it opens Dashboard.
- [ ] Preserve the selected local mode across reloads.

### Task 2: Figma login page

- [ ] Build the desktop two-column composition from Figma node `4:2`.
- [ ] Reproduce typography, spacing, colors, inputs, dividers, feature row, illustration, and brand treatment.
- [ ] Keep Magic Link behavior and add Google OAuth.
- [ ] Implement a coordinated mobile single-column layout.

### Task 3: Visual and functional verification

- [ ] Compare desktop screenshots against the Figma reference.
- [ ] Verify mobile layout, focus states, disabled states, status messages, Local mode, and existing Dashboard flow.
- [ ] Run tests, E2E, lint, build, and `git diff --check`.
