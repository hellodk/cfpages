---
title: "Git Concepts — Visual Guide"
date: 2026-05-27
description: "Two branches co-exist: main (blue) has commits A→B→C; feature (green) diverged from B and added D→E."
tags: [git, concepts, version-control]
cover: "assets/images/covers/git-concepts.svg"
draft: false
---

## Merge

<svg id="svg-merge" viewBox="0 0 760 230" aria-label="Git merge animation">
        <defs>
          <marker id="arr-main" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#9CA3AF"></polygon></marker>
          <marker id="arr-feat" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#9CA3AF"></polygon></marker>
          <filter id="glow-merge"><feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur><feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
        </defs>
        <line class="git-el" id="mg-l-ab" x1="100" y1="90" x2="186" y2="90" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-main)"></line>
        <line class="git-el" id="mg-l-bc" x1="226" y1="90" x2="316" y2="90" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-main)"></line>
        <line class="git-el" id="mg-l-bd" x1="216" y1="103" x2="256" y2="157" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-feat)"></line>
        <line class="git-el" id="mg-l-de" x1="296" y1="172" x2="386" y2="172" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-feat)"></line>
        <line class="git-el line-draw" id="mg-l-cm" x1="356" y1="90" x2="474" y2="90" stroke="#7C3AED" stroke-width="2.5" opacity="0" marker-end="url(#arr-main)"></line>
        <line class="git-el line-draw" id="mg-l-em" x1="413" y1="159" x2="481" y2="103" stroke="#7C3AED" stroke-width="2.5" opacity="0" marker-end="url(#arr-main)"></line>
        <g class="git-el" id="mg-a">
          <circle cx="80" cy="90" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle>
          <text x="80" y="95" text-anchor="middle" fill="white" font-size="13" font-weight="700">A</text>
        </g>
        <g class="git-el" id="mg-b">
          <circle cx="206" cy="90" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle>
          <text x="206" y="95" text-anchor="middle" fill="white" font-size="13" font-weight="700">B</text>
        </g>
        <g class="git-el" id="mg-c">
          <circle cx="336" cy="90" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle>
          <text x="336" y="95" text-anchor="middle" fill="white" font-size="13" font-weight="700">C</text>
        </g>
        <g class="git-el" id="mg-d">
          <circle cx="276" cy="172" r="20" fill="#059669" stroke="#047857" stroke-width="2"></circle>
          <text x="276" y="177" text-anchor="middle" fill="white" font-size="13" font-weight="700">D</text>
        </g>
        <g class="git-el" id="mg-e">
          <circle cx="406" cy="172" r="20" fill="#059669" stroke="#047857" stroke-width="2"></circle>
          <text x="406" y="177" text-anchor="middle" fill="white" font-size="13" font-weight="700">E</text>
        </g>
        <g class="git-el" id="mg-m" opacity="0">
          <circle cx="500" cy="90" r="22" fill="#7C3AED" stroke="#6D28D9" stroke-width="2" filter="url(#glow-merge)"></circle>
          <text x="500" y="95" text-anchor="middle" fill="white" font-size="13" font-weight="700">M</text>
        </g>
        <g class="git-el" id="mg-lbl-main-c">
          <rect x="298" y="52" width="76" height="22" rx="5" fill="#BFDBFE"></rect>
          <text x="336" y="67" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">main HEAD</text>
        </g>
        <g class="git-el" id="mg-lbl-main-m" opacity="0">
          <rect x="462" y="52" width="76" height="22" rx="5" fill="#BFDBFE"></rect>
          <text x="500" y="67" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">main HEAD</text>
        </g>
        <g class="git-el" id="mg-lbl-feat">
          <rect x="368" y="200" width="76" height="22" rx="5" fill="#D1FAE5"></rect>
          <text x="406" y="215" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">feature</text>
        </g>
        <g class="git-el" id="mg-cmd" opacity="0">
          <rect x="520" y="155" width="230" height="28" rx="6" fill="#111827"></rect>
          <text x="534" y="174" fill="#93C5FD" font-family="monospace" font-size="12">$ git merge feature</text>
        </g>
        <g class="git-el" id="mg-annot" opacity="0">
          <text x="500" y="130" text-anchor="middle" fill="#7C3AED" font-size="11" font-weight="600">⬦ two parents</text>
        </g>
      </svg>

Initial State

Two branches co-exist: main (blue) has commits A→B→C; feature (green) diverged from B and added D→E.

Step 1 of 3

### Key Points

-   Merge preserves the complete history of both branches — nothing is rewritten
-   A **merge commit** has two parents, recording exactly where the branches joined
-   **Fast-forward merge**: if no divergence, Git just moves the branch pointer — no merge commit needed
-   Use merge when you want to keep a clear record of feature branch lifetimes
-   Conflicts are resolved once, at merge time, then committed

### Commands

\# Switch to target branch and merge  
git switch main  
git merge feature  

\# Force a merge commit (no fast-forward)  
git merge \--no-ff feature  

\# Abort a conflicted merge  
git merge \--abort

## Rebase

<svg id="svg-rebase" viewBox="0 0 760 230" aria-label="Git rebase animation">
        <defs>
          <marker id="arr-rb" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#9CA3AF"></polygon></marker>
          <marker id="arr-rb-new" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#059669"></polygon></marker>
        </defs>
        <text x="20" y="22" fill="#4B5563" font-size="11" font-weight="700">BEFORE REBASE</text>
        <line class="git-el" x1="100" y1="85" x2="186" y2="85" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-rb)"></line>
        <line class="git-el" x1="226" y1="85" x2="316" y2="85" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-rb)"></line>
        <line class="git-el" x1="356" y1="85" x2="446" y2="85" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-rb)"></line>
        <line class="git-el" id="rb-l-be" x1="216" y1="98" x2="295" y2="155" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-rb)"></line>
        <line class="git-el" id="rb-l-ef" x1="332" y1="168" x2="418" y2="168" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-rb)"></line>
        <line class="git-el line-draw" id="rb-l-dep" x1="466" y1="98" x2="545" y2="155" stroke="#059669" stroke-width="2.5" opacity="0" marker-end="url(#arr-rb-new)"></line>
        <line class="git-el line-draw" id="rb-l-epfp" x1="582" y1="168" x2="668" y2="168" stroke="#059669" stroke-width="2.5" opacity="0" marker-end="url(#arr-rb-new)"></line>
        <g class="git-el" id="rb-a"><circle cx="80" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="80" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">A</text></g>
        <g class="git-el" id="rb-b"><circle cx="206" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="206" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">B</text></g>
        <g class="git-el" id="rb-c"><circle cx="336" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="336" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">C</text></g>
        <g class="git-el" id="rb-d"><circle cx="466" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="466" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">D</text></g>
        <g class="git-el" id="rb-e"><circle cx="312" cy="168" r="20" fill="#059669" stroke="#047857" stroke-width="2"></circle><text x="312" y="173" text-anchor="middle" fill="white" font-size="13" font-weight="700">E</text></g>
        <g class="git-el" id="rb-f"><circle cx="442" cy="168" r="20" fill="#059669" stroke="#047857" stroke-width="2"></circle><text x="442" y="173" text-anchor="middle" fill="white" font-size="13" font-weight="700">F</text></g>
        <g class="git-el" id="rb-ep" opacity="0">
          <circle cx="562" cy="168" r="20" fill="#059669" stroke="#047857" stroke-width="2" stroke-dasharray="4 2"></circle>
          <text x="562" y="173" text-anchor="middle" fill="white" font-size="12" font-weight="700">E'</text>
        </g>
        <g class="git-el" id="rb-fp" opacity="0">
          <circle cx="692" cy="168" r="20" fill="#059669" stroke="#047857" stroke-width="2" stroke-dasharray="4 2"></circle>
          <text x="692" y="173" text-anchor="middle" fill="white" font-size="12" font-weight="700">F'</text>
        </g>
        <g class="git-el" id="rb-lbl-main">
          <rect x="428" y="47" width="76" height="22" rx="5" fill="#BFDBFE"></rect>
          <text x="466" y="62" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">main HEAD</text>
        </g>
        <g class="git-el" id="rb-lbl-feat-old">
          <rect x="404" y="196" width="76" height="22" rx="5" fill="#D1FAE5"></rect>
          <text x="442" y="211" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">feature</text>
        </g>
        <g class="git-el" id="rb-lbl-feat-new" opacity="0">
          <rect x="654" y="196" width="76" height="22" rx="5" fill="#D1FAE5"></rect>
          <text x="692" y="211" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">feature HEAD</text>
        </g>
        <g class="git-el" id="rb-ghost-note" opacity="0">
          <text x="377" y="148" text-anchor="middle" fill="#9CA3AF" font-size="10" font-weight="600">orphaned</text>
        </g>
        <g class="git-el" id="rb-cmd" opacity="0">
          <rect x="200" y="10" width="255" height="28" rx="6" fill="#111827"></rect>
          <text x="214" y="29" fill="#93C5FD" font-family="monospace" font-size="12">$ git rebase main</text>
        </g>
      </svg>

Initial State

feature branch (E, F) diverged from B. main has since moved to D. We want to replay feature commits on top of D.

Step 1 of 4

### Key Points

-   Rebase _replays_ your commits onto a new base — commits get new hashes (E→E', F→F')
-   History becomes **linear** — easier to read with `git log`
-   **Golden rule**: never rebase shared/public branches — rewriting history breaks everyone else's clone
-   Conflicts are resolved per-commit, one at a time, as each is replayed
-   Old commits (E, F) become unreachable and are eventually garbage-collected

### Commands

\# Rebase feature onto latest main  
git switch feature  
git rebase main  

\# Continue after resolving conflicts  
git rebase \--continue  

\# Abort and return to original state  
git rebase \--abort  

\# Then fast-forward merge (clean history)  
git switch main  
git merge \--ff-only feature

## Squash

<svg id="svg-squash" viewBox="0 0 760 210" aria-label="Git squash animation">
        <defs>
          <marker id="arr-sq" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#9CA3AF"></polygon></marker>
        </defs>
        <line class="git-el" id="sq-l-ab" x1="104" y1="100" x2="164" y2="100" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-sq)"></line>
        <line class="git-el" id="sq-l-bc" x1="220" y1="100" x2="280" y2="100" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-sq)"></line>
        <line class="git-el" id="sq-l-cd" x1="336" y1="100" x2="396" y2="100" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-sq)"></line>
        <line class="git-el" id="sq-l-de" x1="452" y1="100" x2="512" y2="100" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-sq)"></line>
        <line class="git-el" id="sq-l-ef" x1="568" y1="100" x2="628" y2="100" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-sq)"></line>
        <line class="git-el line-draw" id="sq-l-as" x1="104" y1="100" x2="374" y2="100" stroke="#D97706" stroke-width="2.5" opacity="0" marker-end="url(#arr-sq)"></line>
        <g class="git-el" id="sq-base">
          <circle cx="84" cy="100" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle>
          <text x="84" y="105" text-anchor="middle" fill="white" font-size="11" font-weight="700">BASE</text>
        </g>
        <g class="git-el" id="sq-w1">
          <circle cx="192" cy="100" r="20" fill="#D97706" stroke="#B45309" stroke-width="2"></circle>
          <text x="192" y="105" text-anchor="middle" fill="white" font-size="11" font-weight="700">W1</text>
          <text x="192" y="133" text-anchor="middle" fill="#9CA3AF" font-size="9">wip: init</text>
        </g>
        <g class="git-el" id="sq-w2">
          <circle cx="308" cy="100" r="20" fill="#D97706" stroke="#B45309" stroke-width="2"></circle>
          <text x="308" y="105" text-anchor="middle" fill="white" font-size="11" font-weight="700">W2</text>
          <text x="308" y="133" text-anchor="middle" fill="#9CA3AF" font-size="9">fix typo</text>
        </g>
        <g class="git-el" id="sq-w3">
          <circle cx="424" cy="100" r="20" fill="#D97706" stroke="#B45309" stroke-width="2"></circle>
          <text x="424" y="105" text-anchor="middle" fill="white" font-size="11" font-weight="700">W3</text>
          <text x="424" y="133" text-anchor="middle" fill="#9CA3AF" font-size="9">more work</text>
        </g>
        <g class="git-el" id="sq-w4">
          <circle cx="540" cy="100" r="20" fill="#D97706" stroke="#B45309" stroke-width="2"></circle>
          <text x="540" y="105" text-anchor="middle" fill="white" font-size="11" font-weight="700">W4</text>
          <text x="540" y="133" text-anchor="middle" fill="#9CA3AF" font-size="9">cleanup</text>
        </g>
        <g class="git-el" id="sq-w5">
          <circle cx="656" cy="100" r="20" fill="#D97706" stroke="#B45309" stroke-width="2"></circle>
          <text x="656" y="105" text-anchor="middle" fill="white" font-size="11" font-weight="700">W5</text>
          <text x="656" y="133" text-anchor="middle" fill="#9CA3AF" font-size="9">final fix</text>
        </g>
        <g class="git-el" id="sq-s" opacity="0">
          <circle cx="394" cy="100" r="24" fill="#059669" stroke="#047857" stroke-width="2.5"></circle>
          <text x="394" y="96" text-anchor="middle" fill="white" font-size="10" font-weight="700">feat:</text>
          <text x="394" y="109" text-anchor="middle" fill="white" font-size="10" font-weight="700">done</text>
        </g>
        <g class="git-el" id="sq-lbl-wip">
          <rect x="296" y="52" width="140" height="22" rx="5" fill="#FEF3C7"></rect>
          <text x="366" y="67" text-anchor="middle" fill="#92400E" font-size="11" font-weight="700">5 messy WIP commits</text>
        </g>
        <g class="git-el" id="sq-lbl-s" opacity="0">
          <rect x="340" y="52" width="108" height="22" rx="5" fill="#D1FAE5"></rect>
          <text x="394" y="67" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">1 clean commit</text>
        </g>
        <g class="git-el" id="sq-cmd" opacity="0">
          <rect x="160" y="160" width="300" height="28" rx="6" fill="#111827"></rect>
          <text x="176" y="179" fill="#93C5FD" font-family="monospace" font-size="12">$ git rebase -i HEAD~5</text>
        </g>
      </svg>

Before Squash

5 WIP commits clutter the branch history with trivial messages that add noise to the project log.

Step 1 of 3

### Key Points

-   Squash combines multiple commits into one — useful before merging a PR to keep history clean
-   `git rebase -i HEAD~N` opens an editor where you mark commits as **squash** or **fixup**
-   `git merge --squash feature` merges all feature changes as one unstaged diff, then you commit
-   Like rebase, squash rewrites history — only do it on your local/feature branches before merge
-   Squash = cleaner `git log`, but you lose granular commit-level rollback ability

### Commands

\# Interactive rebase — squash last 5 commits  
git rebase \-i HEAD~5  
\# In editor: change 'pick' → 'squash' or 's'  

\# Squash entire branch into one commit on main  
git switch main  
git merge \--squash feature  
git commit \-m "feat: complete feature"

## Cherry-Pick

<svg id="svg-cherry" viewBox="0 0 760 240" aria-label="Git cherry-pick animation">
        <defs>
          <marker id="arr-ch-main" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#9CA3AF"></polygon></marker>
          <marker id="arr-ch-feat" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#9CA3AF"></polygon></marker>
          <filter id="glow-cherry"><feGaussianBlur stdDeviation="5" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
        </defs>
        <line class="git-el" x1="94" y1="85" x2="154" y2="85" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-ch-main)"></line>
        <line class="git-el" x1="194" y1="85" x2="254" y2="85" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-ch-main)"></line>
        <line class="git-el" x1="294" y1="85" x2="354" y2="85" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-ch-main)"></line>
        <line class="git-el" x1="414" y1="85" x2="474" y2="85" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-ch-main)"></line>
        <line class="git-el" x1="514" y1="85" x2="574" y2="85" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-ch-main)"></line>
        <line class="git-el" x1="90" y1="98" x2="164" y2="160" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-ch-feat)"></line>
        <line class="git-el" x1="202" y1="173" x2="262" y2="173" stroke="#9CA3AF" stroke-width="2.5" marker-end="url(#arr-ch-feat)"></line>
        <line class="git-el line-draw" id="ch-l-ed" x1="302" y1="173" x2="398" y2="173" stroke="#DC2626" stroke-width="2.5" opacity="0" marker-end="url(#arr-ch-feat)"></line>
        <g class="git-el" id="ch-a"><circle cx="74" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="74" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">A</text></g>
        <g class="git-el" id="ch-b"><circle cx="174" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="174" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">B</text></g>
        <g class="git-el" id="ch-c"><circle cx="274" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="274" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">C</text></g>
        <g class="git-el" id="ch-d">
          <circle cx="384" cy="85" r="22" fill="#DC2626" stroke="#B91C1C" stroke-width="2.5"></circle>
          <text x="384" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">D</text>
        </g>
        <g class="git-el" id="ch-e2"><circle cx="494" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="494" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">E</text></g>
        <g class="git-el" id="ch-f"><circle cx="604" cy="85" r="20" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="604" y="90" text-anchor="middle" fill="white" font-size="13" font-weight="700">F</text></g>
        <g class="git-el" id="ch-g"><circle cx="182" cy="173" r="20" fill="#059669" stroke="#047857" stroke-width="2"></circle><text x="182" y="178" text-anchor="middle" fill="white" font-size="13" font-weight="700">G</text></g>
        <g class="git-el" id="ch-h"><circle cx="282" cy="173" r="20" fill="#059669" stroke="#047857" stroke-width="2"></circle><text x="282" y="178" text-anchor="middle" fill="white" font-size="13" font-weight="700">H</text></g>
        <g class="git-el" id="ch-dp" opacity="0">
          <circle cx="418" cy="173" r="22" fill="#DC2626" stroke="#B91C1C" stroke-width="2.5" stroke-dasharray="5 2"></circle>
          <text x="418" y="178" text-anchor="middle" fill="white" font-size="12" font-weight="700">D'</text>
        </g>
        <g class="git-el">
          <rect x="566" y="47" width="76" height="22" rx="5" fill="#BFDBFE"></rect>
          <text x="604" y="62" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">main HEAD</text>
        </g>
        <g class="git-el">
          <rect x="244" y="200" width="76" height="22" rx="5" fill="#D1FAE5"></rect>
          <text x="282" y="215" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">feature HEAD</text>
        </g>
        <g class="git-el" id="ch-lbl-cherry">
          <rect x="347" y="47" width="74" height="22" rx="5" fill="#FEE2E2"></rect>
          <text x="384" y="62" text-anchor="middle" fill="#B91C1C" font-size="11" font-weight="700">🍒 pick this</text>
        </g>
        <path class="git-el line-draw" id="ch-arc" d="M384,63 C384,20 418,20 418,151" fill="none" stroke="#DC2626" stroke-width="2" stroke-dasharray="6 3" opacity="0" marker-end="url(#arr-ch-feat)"></path>
        <g class="git-el" id="ch-lbl-new-head" opacity="0">
          <rect x="380" y="200" width="76" height="22" rx="5" fill="#FEE2E2"></rect>
          <text x="418" y="215" text-anchor="middle" fill="#B91C1C" font-size="11" font-weight="700">feature HEAD</text>
        </g>
      </svg>

Identify the Commit

Commit D on main contains a critical bug fix. We need it on the feature branch without merging all of main.

Step 1 of 3

### Key Points

-   Cherry-pick _copies_ the changes from a specific commit and applies them to the current branch
-   The new commit D' gets a **new hash** but contains identical changes to D
-   The original commit D stays unchanged on main — it is not moved or deleted
-   Common use: apply a hotfix to both main and a release branch simultaneously
-   Duplicate commits can cause confusion on future merges — use sparingly

### Commands

\# Find the commit hash you want  
git log \--oneline main  
a1b2c3d D: fix critical null pointer  

\# Cherry-pick onto current branch  
git switch feature  
git cherry-pick a1b2c3d  

\# Pick multiple commits  
git cherry-pick a1b2c3d..f6e5d4c  

\# Abort if conflicts arise  
git cherry-pick \--abort

## Fetch

<svg id="svg-fetch" viewBox="0 0 760 260" aria-label="Git fetch animation">
        <defs>
          <marker id="arr-ft" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#9CA3AF"></polygon></marker>
          <marker id="arr-ft-dl" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#6B7280"></polygon></marker>
          <marker id="arr-ft-down" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto"><polygon points="0 0,8 0,4 8" fill="#6B7280"></polygon></marker>
        </defs>
        <rect x="10" y="10" width="740" height="105" rx="8" fill="#F0F4FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
        <rect x="10" y="145" width="740" height="105" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
        <text x="26" y="32" fill="#1D4ED8" font-size="11" font-weight="700">REMOTE (origin)</text>
        <text x="26" y="167" fill="#047857" font-size="11" font-weight="700">LOCAL REPO</text>
        <line class="git-el" x1="120" y1="70" x2="190" y2="70" stroke="#9CA3AF" stroke-width="2" marker-end="url(#arr-ft)"></line>
        <line class="git-el" x1="230" y1="70" x2="300" y2="70" stroke="#9CA3AF" stroke-width="2" marker-end="url(#arr-ft)"></line>
        <line class="git-el" x1="340" y1="70" x2="410" y2="70" stroke="#9CA3AF" stroke-width="2" marker-end="url(#arr-ft)"></line>
        <line class="git-el" id="ft-lr4" x1="450" y1="70" x2="520" y2="70" stroke="#6B7280" stroke-width="2" marker-end="url(#arr-ft)"></line>
        <line class="git-el" id="ft-lr5" x1="560" y1="70" x2="630" y2="70" stroke="#6B7280" stroke-width="2" marker-end="url(#arr-ft)"></line>
        <g class="git-el"><circle cx="100" cy="70" r="16" fill="#6B7280"></circle><text x="100" y="75" text-anchor="middle" fill="white" font-size="11" font-weight="700">R1</text></g>
        <g class="git-el"><circle cx="210" cy="70" r="16" fill="#6B7280"></circle><text x="210" y="75" text-anchor="middle" fill="white" font-size="11" font-weight="700">R2</text></g>
        <g class="git-el"><circle cx="320" cy="70" r="16" fill="#6B7280"></circle><text x="320" y="75" text-anchor="middle" fill="white" font-size="11" font-weight="700">R3</text></g>
        <g class="git-el" id="ft-r4">
          <circle cx="430" cy="70" r="18" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle>
          <text x="430" y="75" text-anchor="middle" fill="white" font-size="11" font-weight="700">R4</text>
        </g>
        <g class="git-el" id="ft-r5">
          <circle cx="540" cy="70" r="18" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle>
          <text x="540" y="75" text-anchor="middle" fill="white" font-size="11" font-weight="700">R5</text>
        </g>
        <g class="git-el">
          <rect x="654" y="56" width="88" height="22" rx="5" fill="#BFDBFE"></rect>
          <text x="698" y="71" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">origin/main</text>
        </g>
        <line class="git-el" x1="120" y1="195" x2="190" y2="195" stroke="#9CA3AF" stroke-width="2" marker-end="url(#arr-ft)"></line>
        <line class="git-el" x1="230" y1="195" x2="300" y2="195" stroke="#9CA3AF" stroke-width="2" marker-end="url(#arr-ft)"></line>
        <line class="git-el" x1="340" y1="195" x2="410" y2="195" stroke="#9CA3AF" stroke-width="2" marker-end="url(#arr-ft)"></line>
        <g class="git-el"><circle cx="100" cy="195" r="16" fill="#6B7280"></circle><text x="100" y="200" text-anchor="middle" fill="white" font-size="11" font-weight="700">R1</text></g>
        <g class="git-el"><circle cx="210" cy="195" r="16" fill="#6B7280"></circle><text x="210" y="200" text-anchor="middle" fill="white" font-size="11" font-weight="700">R2</text></g>
        <g class="git-el"><circle cx="320" cy="195" r="16" fill="#6B7280"></circle><text x="320" y="200" text-anchor="middle" fill="white" font-size="11" font-weight="700">R3</text></g>
        <g class="git-el" id="ft-lbl-local">
          <rect x="282" y="218" width="76" height="20" rx="5" fill="#D1FAE5"></rect>
          <text x="320" y="232" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">main HEAD</text>
        </g>
        <line class="git-el line-draw" id="ft-ll4" x1="450" y1="195" x2="516" y2="195" stroke="#6B7280" stroke-width="2" stroke-dasharray="5 3" opacity="0" marker-end="url(#arr-ft)"></line>
        <line class="git-el line-draw" id="ft-ll5" x1="552" y1="195" x2="618" y2="195" stroke="#6B7280" stroke-width="2" stroke-dasharray="5 3" opacity="0" marker-end="url(#arr-ft)"></line>
        <g class="git-el" id="ft-l4" opacity="0">
          <circle cx="430" cy="195" r="18" fill="white" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="5 2"></circle>
          <text x="430" y="200" text-anchor="middle" fill="#6B7280" font-size="11" font-weight="700">R4</text>
        </g>
        <g class="git-el" id="ft-l5" opacity="0">
          <circle cx="540" cy="195" r="18" fill="white" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="5 2"></circle>
          <text x="540" y="200" text-anchor="middle" fill="#6B7280" font-size="11" font-weight="700">R5</text>
        </g>
        <g class="git-el" id="ft-lbl-origin" opacity="0">
          <rect x="502" y="218" width="76" height="20" rx="5" fill="#F3F4F6"></rect>
          <text x="540" y="232" text-anchor="middle" fill="#374151" font-size="11" font-weight="700">origin/main</text>
        </g>
        <g class="git-el" id="ft-arrow-dl" opacity="0">
          <line x1="430" y1="95" x2="430" y2="172" stroke="#6B7280" stroke-width="1.5" stroke-dasharray="4 2"></line>
          <line x1="540" y1="95" x2="540" y2="172" stroke="#6B7280" stroke-width="1.5" stroke-dasharray="4 2"></line>
          <text x="485" y="137" text-anchor="middle" fill="#6B7280" font-size="10" font-weight="600">git fetch</text>
        </g>
        <g class="git-el" id="ft-badge">
          <rect x="400" y="34" width="155" height="22" rx="5" fill="#BFDBFE"></rect>
          <text x="477" y="49" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">2 new commits on remote</text>
        </g>
      </svg>

Remote Is Ahead

Remote has 2 new commits (R4, R5) that don't exist locally yet. Your local main is behind.

Step 1 of 3

### Key Points

-   **fetch** downloads remote commits into `origin/main` but does NOT move your local `main`
-   It is always safe — fetch never modifies your working tree or local branches
-   **pull = fetch + merge** (or fetch + rebase with `--rebase`)
-   After fetching, use `git log origin/main` to inspect what arrived before integrating
-   Best practice: fetch first, review, then merge/rebase deliberately

### Commands

\# Download without touching local branches  
git fetch origin  

\# Inspect what arrived  
git log origin/main \--oneline  

\# Integrate via merge  
git merge origin/main  

\# Or: fetch + rebase in one step  
git pull \--rebase  

\# See divergence at a glance  
git status  
Your branch is behind 'origin/main' by 2 commits

## Reset

<svg id="svg-reset" viewBox="0 0 760 280" aria-label="Git reset animation">
        <rect x="37" y="10" width="180" height="30" rx="6" fill="#DBEAFE"></rect>
        <text x="127" y="30" text-anchor="middle" fill="#1D4ED8" font-size="13" font-weight="700">--soft</text>
        <rect x="290" y="10" width="180" height="30" rx="6" fill="#FEF3C7"></rect>
        <text x="380" y="30" text-anchor="middle" fill="#92400E" font-size="13" font-weight="700">--mixed (default)</text>
        <rect x="543" y="10" width="180" height="30" rx="6" fill="#FEE2E2"></rect>
        <text x="633" y="30" text-anchor="middle" fill="#991B1B" font-size="13" font-weight="700">--hard</text>
        <line class="git-el" x1="63" y1="72" x2="97" y2="72" stroke="#9CA3AF" stroke-width="2"></line>
        <line class="git-el" x1="117" y1="72" x2="151" y2="72" stroke="#9CA3AF" stroke-width="2"></line>
        <g class="git-el"><circle cx="57" cy="72" r="12" fill="#6B7280"></circle><text x="57" y="76" text-anchor="middle" fill="white" font-size="10" font-weight="700">A</text></g>
        <g class="git-el"><circle cx="107" cy="72" r="12" fill="#6B7280"></circle><text x="107" y="76" text-anchor="middle" fill="white" font-size="10" font-weight="700">B</text></g>
        <g class="git-el" id="rs-soft-c"><circle cx="157" cy="72" r="14" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="157" y="77" text-anchor="middle" fill="white" font-size="10" font-weight="700">C</text></g>
        <text class="git-el" id="rs-soft-head-c" x="157" y="60" text-anchor="middle" fill="#1D4ED8" font-size="9" font-weight="700">HEAD</text>
        <text class="git-el" id="rs-soft-head-a" x="57" y="60" text-anchor="middle" fill="#1D4ED8" font-size="9" font-weight="700" opacity="0">HEAD</text>
        <rect class="git-el" x="37" y="105" width="180" height="44" rx="6" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"></rect>
        <text x="127" y="122" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">Working Directory</text>
        <text x="127" y="138" text-anchor="middle" fill="#047857" font-size="10">✓ changes kept</text>
        <rect class="git-el" x="37" y="160" width="180" height="44" rx="6" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"></rect>
        <text x="127" y="177" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">Staging / Index</text>
        <text x="127" y="193" text-anchor="middle" fill="#047857" font-size="10">✓ changes kept</text>
        <rect class="git-el" x="37" y="215" width="180" height="44" rx="6" fill="#BFDBFE" stroke="#93C5FD" stroke-width="1.5"></rect>
        <text x="127" y="232" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">HEAD (Repository)</text>
        <rect class="git-el" id="rs-soft-repo-after" x="37" y="215" width="180" height="44" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5" opacity="0"></rect>
        <text class="git-el" id="rs-soft-repo-txt-after" x="127" y="240" text-anchor="middle" fill="#991B1B" font-size="10" opacity="0">↩ moved to A</text>
        <text class="git-el" id="rs-soft-repo-txt" x="127" y="248" text-anchor="middle" fill="#1D4ED8" font-size="10">at C</text>
        <line class="git-el" x1="316" y1="72" x2="350" y2="72" stroke="#9CA3AF" stroke-width="2"></line>
        <line class="git-el" x1="370" y1="72" x2="404" y2="72" stroke="#9CA3AF" stroke-width="2"></line>
        <g class="git-el"><circle cx="310" cy="72" r="12" fill="#6B7280"></circle><text x="310" y="76" text-anchor="middle" fill="white" font-size="10" font-weight="700">A</text></g>
        <g class="git-el"><circle cx="360" cy="72" r="12" fill="#6B7280"></circle><text x="360" y="76" text-anchor="middle" fill="white" font-size="10" font-weight="700">B</text></g>
        <g class="git-el"><circle cx="410" cy="72" r="14" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="410" y="77" text-anchor="middle" fill="white" font-size="10" font-weight="700">C</text></g>
        <text class="git-el" id="rs-mix-head-c" x="410" y="60" text-anchor="middle" fill="#1D4ED8" font-size="9" font-weight="700">HEAD</text>
        <text class="git-el" id="rs-mix-head-a" x="310" y="60" text-anchor="middle" fill="#D97706" font-size="9" font-weight="700" opacity="0">HEAD</text>
        <rect class="git-el" x="290" y="105" width="180" height="44" rx="6" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"></rect>
        <text x="380" y="122" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">Working Directory</text>
        <text x="380" y="138" text-anchor="middle" fill="#047857" font-size="10">✓ changes kept</text>
        <rect class="git-el" x="290" y="160" width="180" height="44" rx="6" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1.5"></rect>
        <text x="380" y="177" text-anchor="middle" fill="#92400E" font-size="11" font-weight="700">Staging / Index</text>
        <rect class="git-el" id="rs-mix-stage-after" x="290" y="160" width="180" height="44" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5" opacity="0"></rect>
        <text class="git-el" id="rs-mix-stage-txt" x="380" y="193" text-anchor="middle" fill="#92400E" font-size="10">unstaged</text>
        <text class="git-el" id="rs-mix-stage-txt2" x="380" y="193" text-anchor="middle" fill="#991B1B" font-size="10" opacity="0">↩ cleared</text>
        <rect class="git-el" x="290" y="215" width="180" height="44" rx="6" fill="#BFDBFE" stroke="#93C5FD" stroke-width="1.5"></rect>
        <text x="380" y="232" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">HEAD (Repository)</text>
        <rect class="git-el" id="rs-mix-repo-after" x="290" y="215" width="180" height="44" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5" opacity="0"></rect>
        <text class="git-el" id="rs-mix-repo-txt" x="380" y="248" text-anchor="middle" fill="#1D4ED8" font-size="10">at C</text>
        <text class="git-el" id="rs-mix-repo-txt2" x="380" y="240" text-anchor="middle" fill="#991B1B" font-size="10" opacity="0">↩ moved to A</text>
        <line class="git-el" x1="569" y1="72" x2="603" y2="72" stroke="#9CA3AF" stroke-width="2"></line>
        <line class="git-el" x1="623" y1="72" x2="657" y2="72" stroke="#9CA3AF" stroke-width="2"></line>
        <g class="git-el"><circle cx="563" cy="72" r="12" fill="#6B7280"></circle><text x="563" y="76" text-anchor="middle" fill="white" font-size="10" font-weight="700">A</text></g>
        <g class="git-el"><circle cx="613" cy="72" r="12" fill="#6B7280"></circle><text x="613" y="76" text-anchor="middle" fill="white" font-size="10" font-weight="700">B</text></g>
        <g class="git-el"><circle cx="663" cy="72" r="14" fill="#2563EB" stroke="#1D4ED8" stroke-width="2"></circle><text x="663" y="77" text-anchor="middle" fill="white" font-size="10" font-weight="700">C</text></g>
        <text class="git-el" id="rs-hard-head-c" x="663" y="60" text-anchor="middle" fill="#1D4ED8" font-size="9" font-weight="700">HEAD</text>
        <text class="git-el" id="rs-hard-head-a" x="563" y="60" text-anchor="middle" fill="#DC2626" font-size="9" font-weight="700" opacity="0">HEAD</text>
        <rect class="git-el" x="543" y="105" width="180" height="44" rx="6" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"></rect>
        <text x="633" y="122" text-anchor="middle" fill="#047857" font-size="11" font-weight="700">Working Directory</text>
        <text class="git-el" id="rs-hard-wd-txt" x="633" y="138" text-anchor="middle" fill="#047857" font-size="10">changes present</text>
        <rect class="git-el" id="rs-hard-wd-after" x="543" y="105" width="180" height="44" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5" opacity="0"></rect>
        <text class="git-el" id="rs-hard-wd-txt2" x="633" y="130" text-anchor="middle" fill="#991B1B" font-size="10" font-weight="700" opacity="0">✕ DISCARDED</text>
        <text class="git-el" id="rs-hard-wd-txt3" x="633" y="143" text-anchor="middle" fill="#991B1B" font-size="9" opacity="0">cannot recover</text>
        <rect class="git-el" x="543" y="160" width="180" height="44" rx="6" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1.5"></rect>
        <text x="633" y="177" text-anchor="middle" fill="#92400E" font-size="11" font-weight="700">Staging / Index</text>
        <text class="git-el" id="rs-hard-stage-txt" x="633" y="193" text-anchor="middle" fill="#92400E" font-size="10">staged changes</text>
        <rect class="git-el" id="rs-hard-stage-after" x="543" y="160" width="180" height="44" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5" opacity="0"></rect>
        <text class="git-el" id="rs-hard-stage-txt2" x="633" y="185" text-anchor="middle" fill="#991B1B" font-size="10" font-weight="700" opacity="0">✕ DISCARDED</text>
        <rect class="git-el" x="543" y="215" width="180" height="44" rx="6" fill="#BFDBFE" stroke="#93C5FD" stroke-width="1.5"></rect>
        <text x="633" y="232" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">HEAD (Repository)</text>
        <rect class="git-el" id="rs-hard-repo-after" x="543" y="215" width="180" height="44" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5" opacity="0"></rect>
        <text class="git-el" id="rs-hard-repo-txt" x="633" y="248" text-anchor="middle" fill="#1D4ED8" font-size="10">at C</text>
        <text class="git-el" id="rs-hard-repo-txt2" x="633" y="240" text-anchor="middle" fill="#991B1B" font-size="10" opacity="0">↩ moved to A</text>
      </svg>

Before Reset

HEAD is at commit C. We run `git reset A` in three different modes — each one affects a different number of layers.

Step 1 of 2

### Key Points

-   **\--soft**: moves HEAD only. Your staged changes and working files are untouched — useful to re-commit with a better message
-   **\--mixed** (default): moves HEAD and clears the index. Changes return to unstaged in your working directory
-   **\--hard**: moves HEAD, clears index AND discards all working directory changes — _this is destructive and irreversible_
-   All three modes rewrite local history — never reset commits already pushed to a shared branch
-   Recovery: `git reflog` can find lost commits after soft/mixed. Hard resets may be unrecoverable

### Commands

\# Move HEAD back 2 commits, keep staged  
git reset \--soft HEAD~2  

\# Move HEAD back, unstage changes (default)  
git reset HEAD~2  
git reset \--mixed HEAD~2  

\# ⚠ Discard EVERYTHING — cannot undo  
git reset \--hard HEAD~2  

\# Find lost commits after reset  
git reflog

## Stash

<svg id="svg-stash" viewBox="0 0 760 240" aria-label="Git stash animation">
        <rect x="10" y="10" width="300" height="220" rx="10" fill="#F0F4FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
        <text x="160" y="34" text-anchor="middle" fill="#1D4ED8" font-size="12" font-weight="700">Working Directory</text>
        <rect x="450" y="10" width="300" height="220" rx="10" fill="#FCE7F3" stroke="#F9A8D4" stroke-width="1.5"></rect>
        <text x="600" y="34" text-anchor="middle" fill="#9D174D" font-size="12" font-weight="700">Stash Stack</text>
        <g class="git-el" id="st-arrow-push" opacity="0">
          <line x1="330" y1="110" x2="440" y2="110" stroke="#DB2777" stroke-width="2.5"></line>
          <polygon points="440,105 452,110 440,115" fill="#DB2777"></polygon>
          <text x="391" y="103" text-anchor="middle" fill="#DB2777" font-size="10" font-weight="700">git stash</text>
        </g>
        <g class="git-el" id="st-arrow-pop" opacity="0">
          <line x1="440" y1="140" x2="330" y2="140" stroke="#059669" stroke-width="2.5"></line>
          <polygon points="330,135 318,140 330,145" fill="#059669"></polygon>
          <text x="391" y="133" text-anchor="middle" fill="#059669" font-size="10" font-weight="700">git stash pop</text>
        </g>
        <g class="git-el" id="st-f1">
          <rect x="30" y="52" width="80" height="90" rx="5" fill="white" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="70" y="72" text-anchor="middle" fill="#4B5563" font-size="9" font-weight="700">app.ts</text>
          <rect x="40" y="80" width="60" height="5" rx="2" fill="#16A34A" opacity=".8"></rect>
          <rect x="40" y="90" width="45" height="5" rx="2" fill="#16A34A" opacity=".8"></rect>
          <rect x="40" y="104" width="52" height="5" rx="2" fill="#DC2626" opacity=".8"></rect>
          <rect x="40" y="114" width="38" height="5" rx="2" fill="#DC2626" opacity=".8"></rect>
          <text x="70" y="134" text-anchor="middle" fill="#D97706" font-size="8" font-weight="600">modified</text>
        </g>
        <g class="git-el" id="st-f2">
          <rect x="130" y="52" width="80" height="90" rx="5" fill="white" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="170" y="72" text-anchor="middle" fill="#4B5563" font-size="9" font-weight="700">styles.css</text>
          <rect x="140" y="80" width="55" height="5" rx="2" fill="#16A34A" opacity=".8"></rect>
          <rect x="140" y="90" width="40" height="5" rx="2" fill="#16A34A" opacity=".8"></rect>
          <rect x="140" y="104" width="30" height="5" rx="2" fill="#DC2626" opacity=".8"></rect>
          <text x="170" y="134" text-anchor="middle" fill="#D97706" font-size="8" font-weight="600">modified</text>
        </g>
        <g class="git-el" id="st-f3">
          <rect x="230" y="52" width="70" height="90" rx="5" fill="white" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="265" y="72" text-anchor="middle" fill="#4B5563" font-size="9" font-weight="700">api.ts</text>
          <rect x="240" y="80" width="50" height="5" rx="2" fill="#16A34A" opacity=".8"></rect>
          <rect x="240" y="90" width="35" height="5" rx="2" fill="#16A34A" opacity=".8"></rect>
          <text x="265" y="134" text-anchor="middle" fill="#D97706" font-size="8" font-weight="600">modified</text>
        </g>
        <g class="git-el" id="st-clean" opacity="0">
          <rect x="60" y="80" width="180" height="60" rx="8" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"></rect>
          <text x="150" y="107" text-anchor="middle" fill="#047857" font-size="13" font-weight="700">✓ Clean</text>
          <text x="150" y="125" text-anchor="middle" fill="#047857" font-size="11">safe to switch branches</text>
        </g>
        <g class="git-el" id="st-stash0" opacity="0">
          <rect x="466" y="52" width="268" height="56" rx="6" fill="white" stroke="#F9A8D4" stroke-width="1.5"></rect>
          <text x="490" y="72" fill="#9D174D" font-size="10" font-weight="700">stash@{0}</text>
          <text x="490" y="88" fill="#4B5563" font-size="10">WIP on feature: app.ts, styles.css, api.ts</text>
          <rect x="470" y="60" width="4" height="40" rx="2" fill="#DB2777"></rect>
        </g>
        <g class="git-el" id="st-stash-empty">
          <rect x="466" y="52" width="268" height="140" rx="6" fill="white" stroke="#F9A8D4" stroke-width="1" stroke-dasharray="4 3"></rect>
          <text x="600" y="120" text-anchor="middle" fill="#F9A8D4" font-size="12" font-weight="600">empty</text>
        </g>
        <g class="git-el" id="st-lbl-dirty">
          <rect x="40" y="165" width="240" height="24" rx="5" fill="#FEF3C7"></rect>
          <text x="160" y="181" text-anchor="middle" fill="#92400E" font-size="11" font-weight="600">⚠ uncommitted changes</text>
        </g>
        <g class="git-el" id="st-lbl-stashed" opacity="0">
          <rect x="466" y="165" width="268" height="24" rx="5" fill="#FCE7F3"></rect>
          <text x="600" y="181" text-anchor="middle" fill="#9D174D" font-size="11" font-weight="600">1 entry saved</text>
        </g>
        <g class="git-el" id="st-lbl-restored" opacity="0">
          <rect x="40" y="165" width="240" height="24" rx="5" fill="#FEF3C7"></rect>
          <text x="160" y="181" text-anchor="middle" fill="#92400E" font-size="11" font-weight="600">⚠ changes restored</text>
        </g>
      </svg>

Dirty Working Directory

You have uncommitted changes in 3 files but need to switch branches urgently. You can't commit yet — stash saves the day.

Step 1 of 4

### Key Points

-   Stash saves your dirty working directory and index to a stack, then reverts to a clean HEAD state
-   The stash is a **stack** — multiple stashes can be saved, stash@{0} is always the most recent
-   `git stash pop` applies the top stash AND removes it; `git stash apply` keeps the stash entry
-   Stash works across branches — stash on feature, switch to main, pop on main (with care)
-   Untracked files are NOT stashed by default — use `-u` flag to include them

### Commands

\# Save dirty state, clean working dir  
git stash  
git stash push \-m "WIP: login form"  

\# Include untracked files  
git stash \-u  

\# List all stashes  
git stash list  
stash@{0}: WIP on feature: login form  

\# Apply and remove top stash  
git stash pop  

\# Apply without removing  
git stash apply stash@{0}
