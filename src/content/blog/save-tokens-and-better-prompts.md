---
title: "How to Save Tokens and Write Better Prompts When Using AI Coding Assistants"
date: 2026-03-04
description: "Practical tips to reduce token exhaustion and get more useful responses from AI coding tools."
tags: [llm, prompting, tokens]
draft: false
---

*Practical tips to reduce token exhaustion and get more useful responses from AI coding tools.*

---

## Why Tokens Matter

AI assistants process and generate text in **tokens**—chunks of words or subwords. Every message you send (your prompt + context) and every response you receive consumes tokens. When you hit limits or run long sessions, you can see:

- Slower responses
- Truncated or dropped context
- Higher cost (on paid plans)
- The model “forgetting” earlier parts of the conversation

The good news: small changes in how you prompt and what you include in context can dramatically cut token use and improve output quality.

---

## Part 1: Saving Tokens

### 1. **Be Specific Up Front**

Instead of a long back-and-forth, state the goal, stack, and constraints in one go.

**Token-heavy:**
> "I have a bug."  
> "In the API."  
> "The one that fetches users. It's in Node. We use Express."

**Token-light:**
> "Bug: Express API route GET /users returns 500. Node 18. Repo is in `backend/`. I already checked logs—error is in the handler at line 45."

You use fewer turns and fewer tokens when the first message is concrete.

### 2. **Reference Files Instead of Pasting Them**

When possible, point to files and symbols instead of inlining huge blocks.

- Prefer: *"See `src/auth/login.ts` and the `validateToken` function"* and keep the file open or use @-mentions.
- Avoid: Pasting the whole file “for context” unless the assistant explicitly needs to edit it.

Same for logs or errors: share the relevant 5–10 lines, not the entire file.

### 3. **Trim Conversation History**

Long threads force the model to process every prior message. To save tokens:

- Start a **new chat** when you switch to a different feature or bug.
- Summarize what was done in the previous thread and start fresh: *"We just added auth in the last chat. Now I need to add rate limiting to the same routes."*

### 4. **Narrow the Scope of Your Ask**

One clear task per request uses fewer tokens than a list of unrelated tasks.

- Prefer: *"Add input validation to the email field in the signup form."*
- Avoid: *"Fix the signup form, then refactor the dashboard, and also check the API docs."*

You can do the rest in follow-up messages once the first part is done.

### 5. **Use Project Rules and Docs**

If your editor or platform supports **project rules**, **.cursorrules**, or **docs/**:

- Put coding style, conventions, and stack choices there.
- Reference them in the prompt: *"Follow our API style in docs/api-conventions.md."*

The model can then follow those rules without you repeating them every time, which saves tokens and keeps behavior consistent.

### 6. **Avoid Redundant Context**

- Don’t re-explain the same thing in every message.
- Don’t re-paste the same code snippet unless the assistant asks or you’re correcting it.
- If the assistant already has a file in context, refer to it by name and line/section instead of pasting again.

---

## Part 2: Writing Better Prompts

Better prompts don’t just save tokens—they get you more accurate and actionable answers.

### 1. **Use a Simple Structure**

A simple template that works well:

1. **Role/context** (optional): *"In a Next.js 14 app with App Router..."*
2. **Task**: *"Add a loading skeleton to the dashboard page."*
3. **Constraints**: *"Use our existing Tailwind components; no new dependencies."*
4. **Format** (if needed): *"Return only the changed JSX and a one-line summary."*

Example:

> In this Next.js 14 app, add a loading skeleton to the dashboard page (`app/dashboard/page.tsx`). Use our existing `Skeleton` from `@/components/ui/skeleton`. No new deps. Reply with the diff and a one-line summary.

### 2. **Specify Output Format**

Tell the model how you want the answer:

- *"Answer in one short paragraph."*
- *"List only the file paths and line numbers."*
- *"Give me the code first, then a 2–3 sentence explanation."*
- *"No need to explain; just the code change."*

This reduces long, generic replies and keeps responses within the length you need.

### 3. **Give One Primary Instruction**

Lead with the main thing you want. Extra notes can go after.

- **Primary:** *"Rename `getUserById` to `fetchUser` in the users module."*
- **Secondary:** *"Update all call sites. Leave tests for a follow-up."*

When the main ask is first and clear, the model is less likely to drift or over-expand.

### 4. **Include Failure Mode or Current Behavior**

For bugs or refactors, one line about “what’s wrong” or “what it does now” helps a lot.

- *"Currently the button does nothing when clicked."*
- *"This works locally but times out in production."*
- *"We need to support both CSV and JSON; right now only JSON works."*

That steers the model toward the right fix instead of a generic one.

### 5. **Iterate in Small Steps**

For larger work, break it down:

- First message: *"Add a type for the API response in `types/api.ts`."*
- After that’s done: *"Now use that type in the `useUsers` hook."*
- Then: *"Add error handling in the hook using that type."*

Short, focused prompts get better results and use fewer tokens per step than one giant request.

### 6. **Clarify When You Want Less**

Explicitly ask to avoid things you don’t need:

- *"No need to explain; just the code."*
- *"Skip the intro; go straight to the fix."*
- *"Don’t suggest alternatives; implement this approach only."*

That keeps answers tight and on-task.

---

## Quick Reference

| Goal | Do This |
|------|--------|
| Save tokens | Be specific; reference files; trim history; one task per message; use project rules. |
| Better answers | Use role + task + constraints; specify output format; state current vs desired behavior. |
| Fewer long replies | Ask for "code only" or "one paragraph"; say what to skip. |
| Stay on track | Put the main instruction first; break big work into small steps. |

---

## Summary

Token exhaustion and weak results often come from:

- Too much vague or repeated context
- Multi-topic or multi-step requests in one go
- Not stating how you want the answer (length, format, focus)

By being specific, scoping one task at a time, referencing files instead of pasting them, and structuring your prompts (task + constraints + format), you use fewer tokens and get more useful, on-target responses from your AI coding assistant.

---

*You can adapt these tips to any AI coding tool (Cursor, Copilot, ChatGPT, etc.). The principles are the same: less noise, clear intent, and explicit format.*
