---
title: "The Library That Thinks — RAG, Embeddings & Vector DB"
date: 2026-06-09
description: "RAG, embeddings, and vector databases explained through analogy and animated SVG diagrams — with a deep-dive into how kri fleet platform uses pgvector for AI-augmented fleet queries."
tags: [rag, embeddings, pgvector]
draft: false
---

<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
      </svg>

Why LLMs hallucinate, what embeddings measure, and how retrieval gives AI a working memory

## The Analogy

### A Library With a Brilliant Librarian

Before RAG, asking an LLM about your specific infrastructure was like calling a scholar who has read every book ever written — but has never stepped inside your building. They are brilliant in the abstract but blind to your specific nodes, your playbooks, your drift history. RAG is the mechanism that hands them the relevant pages from your private library before they answer.

The Four-Step Library Process

<svg viewBox="0 0 760 210" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="a1" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#9CA3AF"></polygon>
        </marker>
      </defs>
      <rect width="760" height="210" fill="#F9FAFB"></rect>
      <rect x="28" y="82" width="108" height="50" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="82" y="107" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">You</text>
      <text x="82" y="122" text-anchor="middle" font-size="10" fill="#4B5563">ask a question</text>
      <text x="82" y="155" text-anchor="middle" font-size="10" fill="#4B5563">Natural-language</text>
      <text x="82" y="168" text-anchor="middle" font-size="10" fill="#4B5563">query, any wording</text>
      <rect x="208" y="82" width="118" height="50" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
      <text x="267" y="106" text-anchor="middle" font-size="12" font-weight="600" fill="#E0E7FF">Embedding</text>
      <text x="267" y="121" text-anchor="middle" font-size="12" font-weight="600" fill="#A5B4FC">Model</text>
      <text x="267" y="155" text-anchor="middle" font-size="10" fill="#4B5563">Converts meaning</text>
      <text x="267" y="168" text-anchor="middle" font-size="10" fill="#4B5563">to 768 numbers</text>
      <circle cx="267" cy="107" r="33" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
        <animate attributeName="r"       values="33;60"  dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.5;0"  dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="267" cy="107" r="33" fill="none" stroke="#444CE7" stroke-width="1" opacity="0">
        <animate attributeName="r"       values="33;60"  dur="2s" begin="0.7s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.3;0"  dur="2s" begin="0.7s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="398" y="82" width="118" height="50" rx="8" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
      <text x="457" y="106" text-anchor="middle" font-size="12" font-weight="600" fill="#3730A3">Vector Index</text>
      <text x="457" y="121" text-anchor="middle" font-size="11" fill="#4338CA">pgvector</text>
      <text x="457" y="155" text-anchor="middle" font-size="10" fill="#4B5563">Finds chunks with</text>
      <text x="457" y="168" text-anchor="middle" font-size="10" fill="#4B5563">closest meaning</text>
      <rect x="588" y="82" width="118" height="50" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
      <text x="647" y="106" text-anchor="middle" font-size="12" font-weight="600" fill="#15803D">LLM Scholar</text>
      <text x="647" y="121" text-anchor="middle" font-size="11" fill="#16A34A">answers</text>
      <text x="647" y="155" text-anchor="middle" font-size="10" fill="#4B5563">Reads context,</text>
      <text x="647" y="168" text-anchor="middle" font-size="10" fill="#4B5563">writes specific reply</text>
      <line x1="136" y1="107" x2="206" y2="107" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a1)"></line>
      <line x1="326" y1="107" x2="396" y2="107" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a1)"></line>
      <line x1="516" y1="107" x2="586" y2="107" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a1)"></line>
      <circle r="4.5" fill="#444CE7" opacity="0.85">
        <animateMotion dur="1.6s" begin="0s"    repeatCount="indefinite" calcMode="linear" path="M 136,107 L 206,107"></animateMotion>
      </circle>
      <circle r="4.5" fill="#444CE7" opacity="0.85">
        <animateMotion dur="1.6s" begin="0.53s" repeatCount="indefinite" calcMode="linear" path="M 326,107 L 396,107"></animateMotion>
      </circle>
      <circle r="4.5" fill="#16A34A" opacity="0.85">
        <animateMotion dur="1.6s" begin="1.06s" repeatCount="indefinite" calcMode="linear" path="M 516,107 L 586,107"></animateMotion>
      </circle>
    </svg>

### Without RAG vs. With RAG

The same question. Completely different answer quality.

Comparison — Bare LLM vs. RAG-Augmented LLM

<svg viewBox="0 0 760 270" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="a-red" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#F87171"></polygon>
        </marker>
        <marker id="a-grn" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#4ADE80"></polygon>
        </marker>
      </defs>
      <rect width="760" height="270" fill="#F9FAFB"></rect>
      <text x="28" y="32" font-size="10" font-weight="700" fill="#DC2626" letter-spacing=".07em">WITHOUT RAG</text>
      <text x="28" y="148" font-size="10" font-weight="700" fill="#16A34A" letter-spacing=".07em">WITH RAG</text>
      <rect x="28" y="42" width="130" height="52" rx="7" fill="#FFF"    stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="93" y="65"  text-anchor="middle" font-size="11" fill="#4B5563">Which nodes have</text>
      <text x="93" y="80"  text-anchor="middle" font-size="11" fill="#4B5563">drift issues?</text>
      <rect x="228" y="42" width="110" height="52" rx="7" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
      <text x="283" y="64"  text-anchor="middle" font-size="12" font-weight="600" fill="#991B1B">LLM</text>
      <text x="283" y="80"  text-anchor="middle" font-size="10" fill="#B91C1C">(no fleet context)</text>
      <rect x="404" y="42" width="328" height="52" rx="7" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
      <text x="568" y="64"  text-anchor="middle" font-size="11" fill="#7F1D1D">"I can't see your fleet. Please</text>
      <text x="568" y="80"  text-anchor="middle" font-size="11" fill="#7F1D1D">check the dashboard manually."</text>
      <line x1="158" y1="68" x2="226" y2="68" stroke="#FCA5A5" stroke-width="1.5" marker-end="url(#a-red)"></line>
      <line x1="338" y1="68" x2="402" y2="68" stroke="#FCA5A5" stroke-width="1.5" marker-end="url(#a-red)"></line>
      <rect x="28"  y="158" width="130" height="52" rx="7" fill="#FFF"    stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="93"  y="181" text-anchor="middle" font-size="11" fill="#4B5563">Which nodes have</text>
      <text x="93"  y="196" text-anchor="middle" font-size="11" fill="#4B5563">drift issues?</text>
      <rect x="214" y="158" width="128" height="52" rx="7" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
      <text x="278" y="180" text-anchor="middle" font-size="11" font-weight="600" fill="#3730A3">Retrieved</text>
      <text x="278" y="195" text-anchor="middle" font-size="10" fill="#4338CA">6 drift chunks</text>
      <rect x="394" y="158" width="110" height="52" rx="7" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
      <text x="449" y="180" text-anchor="middle" font-size="12" font-weight="600" fill="#15803D">LLM</text>
      <text x="449" y="196" text-anchor="middle" font-size="10" fill="#16A34A">(with context)</text>
      <rect x="558" y="158" width="174" height="52" rx="7" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
      <text x="645" y="180" text-anchor="middle" font-size="11" fill="#14532D">"mm1 &amp; cylon: score 47+.</text>
      <text x="645" y="196" text-anchor="middle" font-size="11" fill="#14532D">Run drift_remediate."</text>
      <line x1="158" y1="184" x2="212" y2="184" stroke="#86EFAC" stroke-width="1.5" marker-end="url(#a-grn)"></line>
      <line x1="342" y1="184" x2="392" y2="184" stroke="#86EFAC" stroke-width="1.5" marker-end="url(#a-grn)"></line>
      <line x1="504" y1="184" x2="556" y2="184" stroke="#86EFAC" stroke-width="1.5" marker-end="url(#a-grn)"></line>
      <circle r="4" fill="#444CE7" opacity="0.9">
        <animateMotion dur="2.2s" begin="0s"    repeatCount="indefinite" calcMode="linear" path="M 158,184 L 212,184"></animateMotion>
      </circle>
      <circle r="4" fill="#444CE7" opacity="0.9">
        <animateMotion dur="2.2s" begin="0.73s" repeatCount="indefinite" calcMode="linear" path="M 342,184 L 392,184"></animateMotion>
      </circle>
      <circle r="4" fill="#16A34A" opacity="0.9">
        <animateMotion dur="2.2s" begin="1.46s" repeatCount="indefinite" calcMode="linear" path="M 504,184 L 556,184"></animateMotion>
      </circle>
    </svg>

### Three Systems, One Pipeline

RAG is the composition of three distinct components. Each does exactly one job.

🔢

### Embeddings

Convert any text to a point in high-dimensional space. Texts with similar _meaning_ land close together — even if they share no words in common. The embedding model is the only part that requires a GPU or an inference server.

📍

### Vector Database

Stores millions of vectors and answers the question: _"what are the nearest points to this query vector?"_ Uses approximate nearest-neighbour indexes (HNSW, IVFFlat) for millisecond search. kri uses **pgvector** — no separate service needed.

🧩

### RAG

Retrieval-Augmented Generation. At query time: embed the question, search the index, inject the top-k results into the LLM's context window. The LLM reads your actual data — not stale weights from its training run.

## The Technology

### What Is an Embedding, Really?

An embedding model reads a string and outputs a fixed-length array of floating-point numbers — a _vector_. For `nomic-embed-text-v1.5` that is 768 numbers. The critical property: texts with similar meaning produce vectors that are geometrically close in that 768-dimensional space. "mm1 went offline" and "node mm1 is unreachable" will have nearly identical vectors, even though they share only the token "mm1".

Text → Embedding Model → 768-Dimensional Vector

<svg viewBox="0 0 760 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="a2" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#9CA3AF"></polygon>
        </marker>
      </defs>
      <rect width="760" height="200" fill="#F9FAFB"></rect>
      <rect x="28" y="38" width="156" height="124" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="106" y="62" text-anchor="middle" font-size="9" font-weight="700" fill="#4B5563" letter-spacing=".08em">INPUT TEXTS</text>
      <text x="106" y="85"  text-anchor="middle" font-size="11" fill="#374151">"mm1 is offline"</text>
      <text x="106" y="104" text-anchor="middle" font-size="11" fill="#374151">"drift score: 47"</text>
      <text x="106" y="123" text-anchor="middle" font-size="11" fill="#374151">"base.yml play 2"</text>
      <text x="106" y="152" text-anchor="middle" font-size="10" fill="#4B5563">one chunk = one row</text>
      <line x1="184" y1="100" x2="252" y2="100" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a2)"></line>
      <circle r="4" fill="#444CE7" opacity="0.9">
        <animateMotion dur="1.8s" begin="0s" repeatCount="indefinite" calcMode="linear" path="M 184,100 L 252,100"></animateMotion>
      </circle>
      <rect x="254" y="54" width="166" height="92" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
      <text x="337" y="90"  text-anchor="middle" font-size="13" font-weight="600" fill="#E0E7FF">nomic-embed</text>
      <text x="337" y="108" text-anchor="middle" font-size="12" fill="#A5B4FC">text-v1.5</text>
      <text x="337" y="130" text-anchor="middle" font-size="10" fill="#6366F1">768-dim output</text>
      <circle cx="337" cy="100" r="40" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
        <animate attributeName="r"       values="40;68"  dur="1.8s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.4;0"  dur="1.8s" repeatCount="indefinite"></animate>
      </circle>
      <line x1="420" y1="100" x2="488" y2="100" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a2)"></line>
      <circle r="4" fill="#444CE7" opacity="0.9">
        <animateMotion dur="1.8s" begin="0.6s" repeatCount="indefinite" calcMode="linear" path="M 420,100 L 488,100"></animateMotion>
      </circle>
      <rect x="490" y="38" width="242" height="124" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="611" y="62" text-anchor="middle" font-size="9" font-weight="700" fill="#4B5563" letter-spacing=".08em">OUTPUT VECTOR (768 DIMS)</text>
      <rect x="504" y="76" width="9" height="48" rx="2" fill="#444CE7" opacity="0.85">
        <animate attributeName="height" values="48;38;55;48" dur="3s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="76;86;69;76" dur="3s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="518" y="88" width="9" height="36" rx="2" fill="#444CE7" opacity="0.7">
        <animate attributeName="height" values="36;50;30;36" dur="3.2s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="88;74;94;88" dur="3.2s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="532" y="70" width="9" height="54" rx="2" fill="#444CE7" opacity="0.9">
        <animate attributeName="height" values="54;42;60;54" dur="2.8s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="70;82;64;70" dur="2.8s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="546" y="82" width="9" height="42" rx="2" fill="#444CE7" opacity="0.65">
        <animate attributeName="height" values="42;56;35;42" dur="3.4s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="82;68;89;82" dur="3.4s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="560" y="78" width="9" height="46" rx="2" fill="#444CE7" opacity="0.75">
        <animate attributeName="height" values="46;36;52;46" dur="2.6s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="78;88;72;78" dur="2.6s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="574" y="91" width="9" height="33" rx="2" fill="#444CE7" opacity="0.55">
        <animate attributeName="height" values="33;48;28;33" dur="3.1s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="91;76;96;91" dur="3.1s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="588" y="72" width="9" height="52" rx="2" fill="#444CE7" opacity="0.88">
        <animate attributeName="height" values="52;40;58;52" dur="2.9s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="72;84;66;72" dur="2.9s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="602" y="85" width="9" height="39" rx="2" fill="#444CE7" opacity="0.68">
        <animate attributeName="height" values="39;54;33;39" dur="3.3s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="85;70;91;85" dur="3.3s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="616" y="75" width="9" height="49" rx="2" fill="#444CE7" opacity="0.82">
        <animate attributeName="height" values="49;37;56;49" dur="2.7s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="75;87;68;75" dur="2.7s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="630" y="93" width="9" height="31" rx="2" fill="#444CE7" opacity="0.58">
        <animate attributeName="height" values="31;46;26;31" dur="3.5s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="93;78;98;93" dur="3.5s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="644" y="68" width="9" height="56" rx="2" fill="#444CE7" opacity="0.92">
        <animate attributeName="height" values="56;44;62;56" dur="2.5s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="68;80;62;68" dur="2.5s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="658" y="83" width="9" height="41" rx="2" fill="#444CE7" opacity="0.72">
        <animate attributeName="height" values="41;55;35;41" dur="3.2s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="83;69;89;83" dur="3.2s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="672" y="77" width="9" height="47" rx="2" fill="#444CE7" opacity="0.78">
        <animate attributeName="height" values="47;35;53;47" dur="2.8s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="77;89;71;77" dur="2.8s" repeatCount="indefinite"></animate>
      </rect>
      <rect x="686" y="89" width="9" height="35" rx="2" fill="#444CE7" opacity="0.62">
        <animate attributeName="height" values="35;50;29;35" dur="3.0s" repeatCount="indefinite"></animate>
        <animate attributeName="y"      values="89;74;95;89" dur="3.0s" repeatCount="indefinite"></animate>
      </rect>
      <text x="611" y="152" text-anchor="middle" font-size="10" fill="#4B5563">[ 0.23, −0.41, 0.87, 0.14, … ] × 768</text>
    </svg>

### The Vector Space — Similar Meaning Clusters Together

After embedding, every text is a point in 768-dimensional space. Similar texts cluster together. When a query arrives, the embedding model converts it to a vector, and the index returns the geometrically nearest stored vectors — regardless of whether the words match.

2D Projection of 768-Dimensional Embedding Space

<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg">
      <rect width="760" height="300" fill="#F9FAFB"></rect>
      <g stroke="#E5E7EB" stroke-width="0.5">
        <line x1="30"  y1="30"  x2="30"  y2="275"></line>
        <line x1="160" y1="30"  x2="160" y2="275"></line>
        <line x1="290" y1="30"  x2="290" y2="275"></line>
        <line x1="420" y1="30"  x2="420" y2="275"></line>
        <line x1="550" y1="30"  x2="550" y2="275"></line>
        <line x1="680" y1="30"  x2="680" y2="275"></line>
        <line x1="30"  y1="55"  x2="730" y2="55"></line>
        <line x1="30"  y1="120" x2="730" y2="120"></line>
        <line x1="30"  y1="185" x2="730" y2="185"></line>
        <line x1="30"  y1="250" x2="730" y2="250"></line>
      </g>
      <ellipse cx="148" cy="118" rx="58" ry="38" fill="#3B82F6" opacity="0.07" stroke="#3B82F6" stroke-width="1" stroke-dasharray="4,3"></ellipse>
      <circle cx="140" cy="112" r="7.5" fill="#3B82F6" opacity="0.82"></circle>
      <circle cx="168" cy="128" r="7.5" fill="#3B82F6" opacity="0.82"></circle>
      <circle cx="118" cy="132" r="7.5" fill="#3B82F6" opacity="0.82"></circle>
      <circle cx="155" cy="142" r="5.5" fill="#3B82F6" opacity="0.62"></circle>
      <circle cx="127" cy="118" r="5.5" fill="#3B82F6" opacity="0.62"></circle>
      <text x="148" y="86" text-anchor="middle" font-size="11" font-weight="600" fill="#1D4ED8">Node Profiles</text>
      <ellipse cx="535" cy="104" rx="58" ry="36" fill="#16A34A" opacity="0.07" stroke="#16A34A" stroke-width="1" stroke-dasharray="4,3"></ellipse>
      <circle cx="524" cy="98"  r="7.5" fill="#16A34A" opacity="0.82"></circle>
      <circle cx="550" cy="114" r="7.5" fill="#16A34A" opacity="0.82"></circle>
      <circle cx="512" cy="116" r="7.5" fill="#16A34A" opacity="0.82"></circle>
      <circle cx="545" cy="88"  r="5.5" fill="#16A34A" opacity="0.62"></circle>
      <circle cx="566" cy="104" r="5.5" fill="#16A34A" opacity="0.62"></circle>
      <text x="535" y="68" text-anchor="middle" font-size="11" font-weight="600" fill="#166534">Playbooks</text>
      <ellipse cx="324" cy="218" rx="58" ry="34" fill="#D97706" opacity="0.07" stroke="#D97706" stroke-width="1" stroke-dasharray="4,3"></ellipse>
      <circle cx="316" cy="212" r="7.5" fill="#D97706" opacity="0.82"></circle>
      <circle cx="348" cy="204" r="7.5" fill="#D97706" opacity="0.82"></circle>
      <circle cx="296" cy="228" r="7.5" fill="#D97706" opacity="0.82"></circle>
      <circle cx="340" cy="228" r="5.5" fill="#D97706" opacity="0.62"></circle>
      <circle cx="308" cy="204" r="5.5" fill="#D97706" opacity="0.62"></circle>
      <text x="324" y="266" text-anchor="middle" font-size="11" font-weight="600" fill="#92400E">Drift Reports</text>
      <circle cx="175" cy="108" r="11" fill="#7C3AED" opacity="0.95"></circle>
      <circle cx="175" cy="108" r="11" fill="none" stroke="#7C3AED" stroke-width="2" opacity="0">
        <animate attributeName="r"       values="11;44" dur="1.6s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.7;0" dur="1.6s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="175" cy="108" r="11" fill="none" stroke="#7C3AED" stroke-width="1.5" opacity="0">
        <animate attributeName="r"       values="11;44" dur="1.6s" begin="0.55s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.4;0" dur="1.6s" begin="0.55s" repeatCount="indefinite"></animate>
      </circle>
      <text x="175" y="91" text-anchor="middle" font-size="10" font-weight="700" fill="#6D28D9">Query</text>
      <line x1="175" y1="108" x2="140" y2="112" stroke="#7C3AED" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.75"></line>
      <line x1="175" y1="108" x2="127" y2="118" stroke="#7C3AED" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.55"></line>
      <line x1="175" y1="108" x2="168" y2="128" stroke="#7C3AED" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.55"></line>
      <rect x="590" y="218" width="148" height="68" rx="7" fill="#FFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <circle cx="606" cy="234" r="5.5" fill="#7C3AED"></circle>
      <text x="618" y="238" font-size="10" fill="#4B5563">Query vector</text>
      <circle cx="606" cy="251" r="5.5" fill="#3B82F6"></circle>
      <text x="618" y="255" font-size="10" fill="#4B5563">Retrieved result</text>
      <line x1="600" y1="267" x2="615" y2="267" stroke="#7C3AED" stroke-width="1.5" stroke-dasharray="4,3"></line>
      <text x="621" y="271" font-size="10" fill="#4B5563">Cosine distance</text>
    </svg>

### Hybrid Search: BM25 + Vector + RRF

Pure vector search can miss exact strings — node hostnames like "mm1", package names, file paths. Pure keyword search misses synonyms and paraphrases. kri runs both and fuses the two ranked lists using Reciprocal Rank Fusion.

🔍

### BM25 — Keyword Ranking

Full-text search via Postgres `tsvector` + `plainto_tsquery`. Perfect for exact node names, package versions, error codes. Fast. Fails on paraphrase and synonyms.

📐

### Vector — Semantic Ranking

Cosine similarity in 768-dimensional space. Perfect for meaning — "unreachable node" finds "host went down". Can miss exact identifiers it has never seen in training.

**Reciprocal Rank Fusion (RRF):**  Each result scores `1 / (60 + rank)` from each retrieval method. Scores are summed. A chunk ranked #2 in both BM25 and vector beats a chunk ranked #1 in only one. This naturally promotes results that are lexically _and_ semantically relevant.

## In kri

### The kri RAG Pipeline

kri uses **pgvector** directly — no separate vector database service. The `fleet_embeddings` table has a `Vector(768)` column and an HNSW index. Three Celery beat tasks keep it fresh. The AI Fleet Assistant queries it on every fleet request.

kri Fleet Assistant — RAG Pipeline End to End

<svg viewBox="0 0 760 248" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="a4" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#9CA3AF"></polygon>
        </marker>
      </defs>
      <rect width="760" height="248" fill="#F9FAFB"></rect>
      <rect x="28" y="56" width="130" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="93" y="80"  text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Fleet</text>
      <text x="93" y="95"  text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Assistant</text>
      <line x1="158" y1="82" x2="222" y2="82" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a4)"></line>
      <circle r="4" fill="#444CE7" opacity="0.9">
        <animateMotion dur="2.4s" begin="0s" repeatCount="indefinite" calcMode="linear" path="M 158,82 L 222,82"></animateMotion>
      </circle>
      <rect x="224" y="56" width="138" height="52" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
      <text x="293" y="78"  text-anchor="middle" font-size="12" font-weight="600" fill="#E0E7FF">nomic-embed</text>
      <text x="293" y="94"  text-anchor="middle" font-size="11" fill="#A5B4FC">text-v1.5</text>
      <circle cx="293" cy="82" r="36" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
        <animate attributeName="r"       values="36;62" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.4;0" dur="2.4s" repeatCount="indefinite"></animate>
      </circle>
      <line x1="362" y1="82" x2="426" y2="82" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a4)"></line>
      <circle r="4" fill="#444CE7" opacity="0.9">
        <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite" calcMode="linear" path="M 362,82 L 426,82"></animateMotion>
      </circle>
      <rect x="428" y="56" width="126" height="52" rx="8" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
      <text x="491" y="79"  text-anchor="middle" font-size="12" font-weight="600" fill="#3730A3">pgvector</text>
      <text x="491" y="95"  text-anchor="middle" font-size="10" fill="#4338CA">HNSW + BM25 + RRF</text>
      <line x1="554" y1="82"  x2="614" y2="82"  stroke="#D1D5DB" stroke-width="1.5"></line>
      <line x1="614" y1="82"  x2="614" y2="172" stroke="#D1D5DB" stroke-width="1.5"></line>
      <line x1="614" y1="172" x2="556" y2="172" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a4)"></line>
      <circle r="4" fill="#16A34A" opacity="0.9">
        <animateMotion dur="2.4s" begin="1.6s" repeatCount="indefinite" calcMode="linear"
          path="M 554,82 L 614,82 L 614,172 L 556,172"></animateMotion>
      </circle>
      <rect x="428" y="146" width="126" height="52" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
      <text x="491" y="170" text-anchor="middle" font-size="12" font-weight="600" fill="#15803D">Top-6</text>
      <text x="491" y="186" text-anchor="middle" font-size="10" fill="#16A34A">Chunks Retrieved</text>
      <line x1="428" y1="172" x2="364" y2="172" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a4)"></line>
      <circle r="4" fill="#16A34A" opacity="0.9">
        <animateMotion dur="2.4s" begin="2.0s" repeatCount="indefinite" calcMode="linear" path="M 428,172 L 364,172"></animateMotion>
      </circle>
      <rect x="224" y="146" width="138" height="52" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
      <text x="293" y="170" text-anchor="middle" font-size="11" font-weight="600" fill="#92400E">System Prompt</text>
      <text x="293" y="185" text-anchor="middle" font-size="10" fill="#B45309">+ ## Retrieved Knowledge</text>
      <line x1="224" y1="172" x2="160" y2="172" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a4)"></line>
      <circle r="4" fill="#16A34A" opacity="0.9">
        <animateMotion dur="2.4s" begin="2.4s" repeatCount="indefinite" calcMode="linear" path="M 224,172 L 160,172"></animateMotion>
      </circle>
      <rect x="28" y="146" width="130" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="93" y="170" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">LLM</text>
      <text x="93" y="186" text-anchor="middle" font-size="12" font-weight="600" fill="#16A34A">→ Answer</text>
      <text x="380" y="232" text-anchor="middle" font-size="10" fill="#4B5563">
        nodes · playbooks · drift records are embedded into fleet_embeddings (Vector(768), HNSW)
      </text>
    </svg>

### Three Data Sources, One Index

Three Celery beat tasks populate `fleet_embeddings`. They all check `LLM_EMBED_BASE_URL` before running — if unset, they skip silently.

🖥

### Node Profiles

One chunk per node: hostname, IP, status, group, OS, last-seen. Re-embedded only when `content_hash` changes. **Runs every 5 min.**

📋

### Playbooks

One chunk per Ansible play: play name, target hosts, task list. Reads every `.yml` under the configured playbooks directory. **Runs every 15 min.**

📊

### Drift Records

One chunk per drift report from the last 7 days: node, score, missing/extra packages, version mismatches. **Runs every 5 min.**

Background Ingestion — Keeping the Index Fresh

<svg viewBox="0 0 760 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="a5" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#9CA3AF"></polygon>
        </marker>
      </defs>
      <rect width="760" height="240" fill="#F9FAFB"></rect>
      <rect x="30" y="40" width="120" height="50" rx="8" fill="#FFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="90" y="63"  text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Nodes</text>
      <text x="90" y="78"  text-anchor="middle" font-size="10" fill="#4B5563">every 5 min</text>
      <rect x="318" y="40" width="124" height="50" rx="8" fill="#FFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="380" y="63"  text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Playbooks</text>
      <text x="380" y="78"  text-anchor="middle" font-size="10" fill="#4B5563">every 15 min</text>
      <rect x="610" y="40" width="120" height="50" rx="8" fill="#FFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="670" y="63"  text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Drift</text>
      <text x="670" y="78"  text-anchor="middle" font-size="10" fill="#4B5563">every 5 min</text>
      <rect x="276" y="140" width="208" height="52" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
      <text x="380" y="163" text-anchor="middle" font-size="13" font-weight="600" fill="#E0E7FF">nomic-embed-text-v1.5</text>
      <text x="380" y="180" text-anchor="middle" font-size="10" fill="#A5B4FC">chunk → 768-dim vector</text>
      <circle cx="380" cy="166" r="44" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
        <animate attributeName="r"       values="44;76"  dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.35;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <line x1="90"  y1="90"  x2="90"  y2="152" stroke="#D1D5DB" stroke-width="1.5"></line>
      <line x1="90"  y1="152" x2="274" y2="152" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a5)"></line>
      <circle r="3.5" fill="#3B82F6" opacity="0.9">
        <animateMotion dur="2s" begin="0s" repeatCount="indefinite" calcMode="linear"
          path="M 90,90 L 90,152 L 274,152"></animateMotion>
      </circle>
      <line x1="380" y1="90"  x2="380" y2="138" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a5)"></line>
      <circle r="3.5" fill="#16A34A" opacity="0.9">
        <animateMotion dur="2s" begin="0.66s" repeatCount="indefinite" calcMode="linear"
          path="M 380,90 L 380,138"></animateMotion>
      </circle>
      <line x1="670" y1="90"  x2="670" y2="152" stroke="#D1D5DB" stroke-width="1.5"></line>
      <line x1="670" y1="152" x2="486" y2="152" stroke="#D1D5DB" stroke-width="1.5" marker-end="url(#a5)"></line>
      <circle r="3.5" fill="#D97706" opacity="0.9">
        <animateMotion dur="2s" begin="1.33s" repeatCount="indefinite" calcMode="linear"
          path="M 670,90 L 670,152 L 486,152"></animateMotion>
      </circle>
      <text x="380" y="218" text-anchor="middle" font-size="11" font-weight="600" fill="#4B5563">
        ↓ stored in fleet_embeddings (pgvector HNSW index) — ready for query-time retrieval
      </text>
    </svg>

### One Setting Activates Everything

All code is already deployed. The only required step is pointing to an embedding server.

1.  **Run the embedding server** — `./scripts/setup-embed-server.sh` downloads llama.cpp and nomic-embed-text-v1.5.Q8\_0, then serves `POST /v1/embeddings` on port 8080.
2.  **Set `LLM_EMBED_BASE_URL`** in kri Platform Settings to `http://<host>:8080`.
3.  **Within 5 minutes** the three Celery tasks run and populate `fleet_embeddings` with vectors for every node, playbook, and drift record.
4.  **Fleet Assistant queries** with intent `fleet_query` or `fleet_command` now automatically retrieve top-6 relevant chunks and inject them as `## Retrieved Knowledge` in the system prompt before calling the LLM.

**Why pgvector and not a dedicated vector DB?**  
pgvector adds `Vector(N)` column types and HNSW index operators directly to PostgreSQL. kri already runs PostgreSQL in the cluster — no new service, no consistency gap, no sync delay. At fleet sizes of thousands of nodes the HNSW index returns nearest neighbours in under a millisecond. A dedicated vector database would only be worth the operational cost beyond millions of vectors.

**What happens without `LLM_EMBED_BASE_URL`?**  
The three Celery tasks return `{"skipped": "no embed_base_url configured"}` and exit. Fleet Assistant queries still work — they just receive the live node table without semantic retrieval. No errors, no broken UI. RAG activates the moment the setting is saved.
