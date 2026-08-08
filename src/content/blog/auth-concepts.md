---
title: "Authentication Concepts — Persona Platform"
date: 2026-06-06
description: "LDAP, SSO, OIDC, OAuth 2.0, SAML 2.0, and Keycloak — explained with diagrams"
tags: [auth, oidc, security, concepts]
draft: false
---

LDAP, SSO, OIDC, OAuth 2.0, SAML 2.0, and Keycloak — explained with diagrams

## LDAP

## LDAP — Lightweight Directory Access Protocol

LDAP is a protocol for reading and writing a hierarchical directory of entries — users, groups, and machines. It is the canonical user store for Linux systems and enterprise networks. Applications query LDAP to authenticate users and look up attributes, but LDAP itself issues no tokens and provides no web SSO.

<svg viewBox="0 0 800 320" width="100%" xmlns="http://www.w3.org/2000/svg">
        <line x1="400" y1="60" x2="180" y2="118" stroke="#E2E8F0" stroke-width="2" class="anim-line" style="animation-delay:.1s"></line>
        <line x1="400" y1="60" x2="560" y2="118" stroke="#E2E8F0" stroke-width="2" class="anim-line" style="animation-delay:.1s"></line>
        <line x1="180" y1="152" x2="68"  y2="206" stroke="#E2E8F0" stroke-width="2" class="anim-line" style="animation-delay:.4s"></line>
        <line x1="180" y1="152" x2="180" y2="206" stroke="#E2E8F0" stroke-width="2" class="anim-line" style="animation-delay:.4s"></line>
        <line x1="180" y1="152" x2="292" y2="206" stroke="#E2E8F0" stroke-width="2" class="anim-line" style="animation-delay:.4s"></line>
        <line x1="560" y1="152" x2="448" y2="206" stroke="#E2E8F0" stroke-width="2" class="anim-line" style="animation-delay:.4s"></line>
        <line x1="560" y1="152" x2="560" y2="206" stroke="#E2E8F0" stroke-width="2" class="anim-line" style="animation-delay:.4s"></line>
        <line x1="560" y1="152" x2="672" y2="206" stroke="#E2E8F0" stroke-width="2" class="anim-line" style="animation-delay:.4s"></line>
        <g class="anim-node" style="animation-delay:.0s">
          <rect x="330" y="24" width="140" height="36" rx="6" fill="#1E40AF"></rect>
          <text x="400" y="47" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">dc=persona,dc=local</text>
        </g>
        <g class="anim-node" style="animation-delay:.25s">
          <rect x="108" y="118" width="144" height="34" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="180" y="130" text-anchor="middle" font-size="10" font-weight="700" fill="#4B5563" letter-spacing="0.06em">USERS</text>
          <text x="180" y="144" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">ou=users</text>
        </g>
        <g class="anim-node" style="animation-delay:.3s">
          <rect x="488" y="118" width="144" height="34" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="560" y="130" text-anchor="middle" font-size="10" font-weight="700" fill="#4B5563" letter-spacing="0.06em">GROUPS</text>
          <text x="560" y="144" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">ou=groups</text>
        </g>
        <g class="anim-node" style="animation-delay:.55s">
          <rect x="18" y="206" width="100" height="34" rx="6" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="1.5"></rect>
          <text x="68" y="222" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">cn=alice</text>
          <text x="68" y="234" text-anchor="middle" font-size="11" fill="#2563EB">admin</text>
        </g>
        <g class="anim-node" style="animation-delay:.65s">
          <rect x="130" y="206" width="100" height="34" rx="6" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="1.5"></rect>
          <text x="180" y="222" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">cn=bob</text>
          <text x="180" y="234" text-anchor="middle" font-size="11" fill="#4B5563">developer</text>
        </g>
        <g class="anim-node" style="animation-delay:.75s">
          <rect x="242" y="206" width="100" height="34" rx="6" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="1.5"></rect>
          <text x="292" y="222" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">cn=carol</text>
          <text x="292" y="234" text-anchor="middle" font-size="11" fill="#4B5563">viewer</text>
        </g>
        <g class="anim-node" style="animation-delay:.55s">
          <rect x="398" y="206" width="100" height="34" rx="6" fill="#FFFFFF" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="448" y="228" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">cn=admins</text>
        </g>
        <g class="anim-node" style="animation-delay:.65s">
          <rect x="510" y="206" width="100" height="34" rx="6" fill="#FFFFFF" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="560" y="228" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">cn=devs</text>
        </g>
        <g class="anim-node" style="animation-delay:.75s">
          <rect x="622" y="206" width="100" height="34" rx="6" fill="#FFFFFF" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="672" y="228" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">cn=viewers</text>
        </g>
        <g class="anim-node" style="animation-delay:1s">
          <line x1="18" y1="258" x2="772" y2="258" stroke="#E2E8F0" stroke-width="1"></line>
          <text x="18" y="277" font-size="10" font-weight="700" fill="#4B5563" letter-spacing="0.06em">ATTRIBUTES</text>
          <text x="107" y="277" font-size="11" fill="#4B5563">uid · cn · mail · userPassword · uidNumber · homeDirectory</text>
          <text x="615" y="277" font-size="10" font-weight="700" fill="#4B5563" letter-spacing="0.06em">PORTS</text>
          <text x="655" y="277" font-size="11" fill="#4B5563">389 · 636 (TLS)</text>
        </g>
        <defs>
          <path id="rp-ldap-1" d="M 400 60 L 180 118"></path>
          <path id="rp-ldap-2" d="M 400 60 L 560 118"></path>
          <path id="rp-ldap-3" d="M 180 152 L 68 206"></path>
          <path id="rp-ldap-4" d="M 180 152 L 180 206"></path>
          <path id="rp-ldap-5" d="M 180 152 L 292 206"></path>
          <path id="rp-ldap-6" d="M 560 152 L 448 206"></path>
          <path id="rp-ldap-7" d="M 560 152 L 672 206"></path>
        </defs>
        <g class="radar-ping">
          <circle r="5" fill="#2563EB"><animateMotion dur="1.8s" repeatCount="indefinite" begin="0s"><mpath href="#rp-ldap-1"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.8s" repeatCount="indefinite" begin="0s"><mpath href="#rp-ldap-1"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#D97706"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-ldap-2"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#D97706" stroke-width="1.5"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-ldap-2"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-0.3s"><mpath href="#rp-ldap-3"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-0.3s"><mpath href="#rp-ldap-3"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-0.8s"><mpath href="#rp-ldap-4"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-0.8s"><mpath href="#rp-ldap-4"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-1.2s"><mpath href="#rp-ldap-5"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-1.2s"><mpath href="#rp-ldap-5"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#D97706"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-0.5s"><mpath href="#rp-ldap-6"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#D97706" stroke-width="1.5"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-0.5s"><mpath href="#rp-ldap-6"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#D97706"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-1.1s"><mpath href="#rp-ldap-7"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#D97706" stroke-width="1.5"><animateMotion dur="1.4s" repeatCount="indefinite" begin="-1.1s"><mpath href="#rp-ldap-7"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
        </g>
      </svg>

### Use Cases

-   Central user store for Linux/Unix systems
-   Legacy enterprise apps and VPN authentication
-   Source of truth federated into Keycloak
-   SSH key and sudo rule distribution

### Limitations

-   No web SSO — no tokens, no browser redirects
-   Passwords travel as bind requests — requires TLS
-   No delegation or consent flows
-   Schema changes require server restart on many implementations

## SSO

## SSO — Single Sign-On

SSO lets a user authenticate once — to a central Identity Provider — and then access multiple applications without entering credentials again. The IdP issues a session or token after successful login; each application trusts that token rather than asking for a password. One login, one logout, one revocation point.

<svg viewBox="0 0 780 300" width="100%" xmlns="http://www.w3.org/2000/svg">
        <g class="anim-node" style="animation-delay:.0s">
          <rect x="20" y="115" width="100" height="54" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="70" y="139" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">User</text>
          <text x="70" y="156" text-anchor="middle" font-size="12" fill="#4B5563">browser</text>
        </g>
        <g class="anim-node" style="animation-delay:.3s">
          <line x1="120" y1="138" x2="248" y2="138" stroke="#2563EB" stroke-width="2" marker-end="url(#arr-blue)" class="anim-line" style="stroke-dasharray:130;animation-delay:.3s"></line>
          <text x="169" y="131" text-anchor="middle" font-size="12" fill="#2563EB" font-weight="600">1. Login</text>
        </g>
        <g class="anim-node" style="animation-delay:.2s">
          <rect x="250" y="96" width="150" height="90" rx="8" fill="#1E40AF"></rect>
          <text x="325" y="130" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">Identity</text>
          <text x="325" y="148" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">Provider</text>
          <text x="325" y="168" text-anchor="middle" font-size="12" fill="#DBEAFE">(Keycloak)</text>
        </g>
        <g class="anim-node" style="animation-delay:.6s">
          <line x1="250" y1="168" x2="120" y2="168" stroke="#16A34A" stroke-width="2" fill="none" marker-end="url(#arr-green)" stroke-dasharray="130" stroke-dashoffset="130" style="animation: line-draw 0.6s ease 0.6s forwards"></line>
          <text x="190" y="189" text-anchor="middle" font-size="12" fill="#16A34A" font-weight="600">2. Token</text>
        </g>
        <g class="anim-line" style="stroke-dasharray:170;animation-delay:.9s">
          <line x1="400" y1="112" x2="495" y2="56" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr-gray)"></line>
        </g>
        <g class="anim-line" style="stroke-dasharray:100;animation-delay:1s">
          <line x1="400" y1="141" x2="495" y2="141" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr-gray)"></line>
        </g>
        <g class="anim-line" style="stroke-dasharray:170;animation-delay:1.1s">
          <line x1="400" y1="170" x2="495" y2="226" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr-gray)"></line>
        </g>
        <g class="anim-node" style="animation-delay:.85s">
          <text x="448" y="131" text-anchor="middle" font-size="12" fill="#4B5563" font-weight="600">3. Access</text>
        </g>
        <g class="anim-node" style="animation-delay:.7s">
          <rect x="480" y="14" width="148" height="264" rx="10" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="6 3"></rect>
          <text x="554" y="32" text-anchor="middle" font-size="10" font-weight="700" fill="#4B5563" letter-spacing="0.06em">APPLICATIONS</text>
        </g>
        <g class="anim-node" style="animation-delay:.9s">
          <rect x="495" y="26" width="110" height="40" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="550" y="51" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">ArgoCD</text>
        </g>
        <g class="anim-node" style="animation-delay:1s">
          <rect x="495" y="116" width="110" height="40" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="550" y="141" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Grafana</text>
        </g>
        <g class="anim-node" style="animation-delay:1.1s">
          <rect x="495" y="206" width="110" height="40" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="550" y="231" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">MinIO</text>
        </g>
        <g class="anim-node" style="animation-delay:1.2s">
          <rect x="626" y="90" width="130" height="104" rx="6" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="691" y="112" text-anchor="middle" font-size="12" font-weight="700" fill="#92400E">Session</text>
          <text x="691" y="130" text-anchor="middle" font-size="12" fill="#92400E">Create</text>
          <text x="691" y="145" text-anchor="middle" font-size="12" fill="#4B5563">↓</text>
          <text x="691" y="160" text-anchor="middle" font-size="12" fill="#92400E">Use</text>
          <text x="691" y="175" text-anchor="middle" font-size="12" fill="#4B5563">↓</text>
          <text x="691" y="186" text-anchor="middle" font-size="12" fill="#DC2626">Expire / Logout</text>
        </g>
        <defs>
          <marker id="arr-blue"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path></marker>
          <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path></marker>
          <marker id="arr-gray"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4B5563"></path></marker>
          <path id="rp-sso-login" d="M 120 138 L 248 138"></path>
          <path id="rp-sso-token" d="M 250 168 L 120 168"></path>
          <path id="rp-sso-app1"  d="M 400 112 L 495 56"></path>
          <path id="rp-sso-app2"  d="M 400 141 L 495 141"></path>
          <path id="rp-sso-app3"  d="M 400 170 L 495 226"></path>
        </defs>
        <g class="radar-ping">
          <circle r="5" fill="#2563EB"><animateMotion dur="1.4s" repeatCount="indefinite" begin="0s"><mpath href="#rp-sso-login"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.4s" repeatCount="indefinite" begin="0s"><mpath href="#rp-sso-login"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="1.6s" repeatCount="indefinite" begin="-0.5s"><mpath href="#rp-sso-token"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="1.6s" repeatCount="indefinite" begin="-0.5s"><mpath href="#rp-sso-token"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#4B5563"><animateMotion dur="1.2s" repeatCount="indefinite" begin="0s"><mpath href="#rp-sso-app1"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#4B5563" stroke-width="1.5"><animateMotion dur="1.2s" repeatCount="indefinite" begin="0s"><mpath href="#rp-sso-app1"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#4B5563"><animateMotion dur="1.2s" repeatCount="indefinite" begin="-0.4s"><mpath href="#rp-sso-app2"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#4B5563" stroke-width="1.5"><animateMotion dur="1.2s" repeatCount="indefinite" begin="-0.4s"><mpath href="#rp-sso-app2"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#4B5563"><animateMotion dur="1.2s" repeatCount="indefinite" begin="-0.8s"><mpath href="#rp-sso-app3"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#4B5563" stroke-width="1.5"><animateMotion dur="1.2s" repeatCount="indefinite" begin="-0.8s"><mpath href="#rp-sso-app3"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
        </g>
      </svg>

### Key Benefits

-   One credential — reduced password fatigue
-   One revocation point — disable user once, locked everywhere
-   Centralised audit log of all logins
-   MFA enforced once, applies to all apps

### Common Implementations

-   Keycloak (open source, self-hosted)
-   Okta, Auth0 (SaaS)
-   Microsoft Entra ID (formerly Azure AD)
-   Google Workspace (consumer SSO)

## OIDC

## OIDC — OpenID Connect

OpenID Connect is an identity layer built on top of OAuth 2.0. Where OAuth 2.0 answers "what can this app do?", OIDC answers "who is this user?". It introduces the **ID Token** — a signed JWT that carries user identity claims. Modern applications use OIDC for both authentication and obtaining user profile information.

<svg viewBox="0 0 720 340" width="100%" xmlns="http://www.w3.org/2000/svg">
        <g class="anim-node" style="animation-delay:.0s">
          <rect x="20" y="24" width="90" height="44" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="65" y="45" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Browser</text>
          <text x="65" y="60" text-anchor="middle" font-size="12" fill="#4B5563">/ App</text>
        </g>
        <g class="anim-node" style="animation-delay:.1s">
          <rect x="290" y="24" width="130" height="44" rx="6" fill="#1E40AF"></rect>
          <text x="355" y="45" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Authorization</text>
          <text x="355" y="60" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Server (IdP)</text>
        </g>
        <g class="anim-node" style="animation-delay:.2s">
          <rect x="580" y="24" width="110" height="44" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="635" y="45" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Resource</text>
          <text x="635" y="60" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Server</text>
        </g>
        <line x1="65" y1="68" x2="65" y2="318" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 3"></line>
        <line x1="355" y1="68" x2="355" y2="318" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 3"></line>
        <line x1="635" y1="68" x2="635" y2="318" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 3"></line>
        <g class="anim-node" style="animation-delay:.35s">
          <line x1="65" y1="96" x2="348" y2="96" stroke="#2563EB" stroke-width="1.5" marker-end="url(#o-blue)" class="anim-line" style="stroke-dasharray:290;animation-delay:.35s"></line>
          <text x="210" y="90" text-anchor="middle" font-size="12" fill="#2563EB" font-weight="600">1  Auth Request + redirect_uri</text>
        </g>
        <g class="anim-node" style="animation-delay:.55s">
          <line x1="355" y1="120" x2="72" y2="120" stroke="#4B5563" stroke-width="1.5" marker-end="url(#o-gray)" class="anim-line" style="stroke-dasharray:290;animation-delay:.55s"></line>
          <text x="210" y="114" text-anchor="middle" font-size="12" fill="#4B5563" font-weight="600">2  Redirect to login page</text>
        </g>
        <g class="anim-node" style="animation-delay:.75s">
          <line x1="65" y1="148" x2="348" y2="148" stroke="#2563EB" stroke-width="1.5" marker-end="url(#o-blue)" class="anim-line" style="stroke-dasharray:290;animation-delay:.75s"></line>
          <text x="210" y="142" text-anchor="middle" font-size="12" fill="#2563EB" font-weight="600">3  User submits credentials</text>
        </g>
        <g class="anim-node" style="animation-delay:.95s">
          <line x1="355" y1="176" x2="72" y2="176" stroke="#16A34A" stroke-width="1.5" marker-end="url(#o-green)" class="anim-line" style="stroke-dasharray:290;animation-delay:.95s"></line>
          <text x="210" y="170" text-anchor="middle" font-size="12" fill="#16A34A" font-weight="600">4  Authorization Code (short-lived)</text>
        </g>
        <g class="anim-node" style="animation-delay:1.15s">
          <line x1="65" y1="206" x2="348" y2="206" stroke="#2563EB" stroke-width="1.5" marker-end="url(#o-blue)" class="anim-line" style="stroke-dasharray:290;animation-delay:1.15s"></line>
          <text x="210" y="200" text-anchor="middle" font-size="12" fill="#2563EB" font-weight="600">5  Token Request (code + secret)</text>
        </g>
        <g class="anim-node" style="animation-delay:1.35s">
          <line x1="355" y1="234" x2="72" y2="234" stroke="#16A34A" stroke-width="1.5" marker-end="url(#o-green)" class="anim-line" style="stroke-dasharray:290;animation-delay:1.35s"></line>
          <text x="195" y="228" text-anchor="middle" font-size="12" fill="#16A34A" font-weight="600">6  ID Token + Access Token (JWT)</text>
        </g>
        <g class="anim-node" style="animation-delay:1.55s">
          <line x1="65" y1="264" x2="622" y2="264" stroke="#D97706" stroke-width="1.5" marker-end="url(#o-warn)" class="anim-line" style="stroke-dasharray:570;animation-delay:1.55s"></line>
          <text x="340" y="258" text-anchor="middle" font-size="12" fill="#92400E" font-weight="600">7  API call with Access Token</text>
        </g>
        <g class="anim-node" style="animation-delay:1.75s">
          <line x1="635" y1="288" x2="72" y2="288" stroke="#4B5563" stroke-width="1.5" marker-end="url(#o-gray)" class="anim-line" style="stroke-dasharray:570;animation-delay:1.75s"></line>
          <text x="340" y="282" text-anchor="middle" font-size="12" fill="#4B5563" font-weight="600">8  Protected resource</text>
        </g>
        <defs>
          <marker id="o-blue"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path></marker>
          <marker id="o-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path></marker>
          <marker id="o-gray"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4B5563"></path></marker>
          <marker id="o-warn"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#D97706"></path></marker>
          <path id="rp-oidc-1" d="M 65 96  L 348 96"></path>
          <path id="rp-oidc-2" d="M 355 120 L 72 120"></path>
          <path id="rp-oidc-3" d="M 65 148 L 348 148"></path>
          <path id="rp-oidc-4" d="M 355 176 L 72 176"></path>
          <path id="rp-oidc-5" d="M 65 206 L 348 206"></path>
          <path id="rp-oidc-6" d="M 355 234 L 72 234"></path>
          <path id="rp-oidc-7" d="M 65 264 L 622 264"></path>
          <path id="rp-oidc-8" d="M 635 288 L 72 288"></path>
        </defs>
        <g class="radar-ping">
          <circle r="5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" begin="0s"><mpath href="#rp-oidc-1"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="2.2s" repeatCount="indefinite" begin="0s"><mpath href="#rp-oidc-1"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#4B5563"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-oidc-2"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#4B5563" stroke-width="1.5"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-oidc-2"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-0.3s"><mpath href="#rp-oidc-3"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-0.3s"><mpath href="#rp-oidc-3"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-1.2s"><mpath href="#rp-oidc-4"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-1.2s"><mpath href="#rp-oidc-4"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-0.6s"><mpath href="#rp-oidc-5"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-0.6s"><mpath href="#rp-oidc-5"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-1.5s"><mpath href="#rp-oidc-6"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="2.2s" repeatCount="indefinite" begin="-1.5s"><mpath href="#rp-oidc-6"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#D97706"><animateMotion dur="2.8s" repeatCount="indefinite" begin="-1.0s"><mpath href="#rp-oidc-7"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#D97706" stroke-width="1.5"><animateMotion dur="2.8s" repeatCount="indefinite" begin="-1.0s"><mpath href="#rp-oidc-7"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#4B5563"><animateMotion dur="2.8s" repeatCount="indefinite" begin="-1.8s"><mpath href="#rp-oidc-8"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#4B5563" stroke-width="1.5"><animateMotion dur="2.8s" repeatCount="indefinite" begin="-1.8s"><mpath href="#rp-oidc-8"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
        </g>
      </svg>

### Token Types

-   **ID Token** — signed JWT; proves who the user is (sub, email, name, groups)
-   **Access Token** — proves what the app is allowed to do; sent to APIs
-   **Refresh Token** — long-lived; used to get new access tokens silently

### Discovery

-   Every OIDC provider exposes `/.well-known/openid-configuration`
-   Contains token endpoint, auth endpoint, JWKS URI
-   Keycloak: `/realms/persona/.well-known/openid-configuration`
-   Claims: `sub`, `email`, `name`, `groups`, `roles`

## OAuth 2.0

## OAuth 2.0 — Authorization Framework

OAuth 2.0 is an authorization framework — it answers "what is this application allowed to do?" not "who is this user?". It defines how a client application can obtain limited access to a resource on behalf of a user, without ever seeing the user's password. OIDC is built on top of OAuth 2.0 and adds the identity layer.

<svg viewBox="0 0 680 280" width="100%" xmlns="http://www.w3.org/2000/svg">
        <g class="anim-node" style="animation-delay:.0s">
          <rect x="20" y="80" width="130" height="56" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="85" y="104" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Resource Owner</text>
          <text x="85" y="122" text-anchor="middle" font-size="12" fill="#4B5563">(the user)</text>
        </g>
        <g class="anim-node" style="animation-delay:.1s">
          <rect x="240" y="80" width="130" height="56" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="305" y="104" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Client App</text>
          <text x="305" y="122" text-anchor="middle" font-size="12" fill="#4B5563">(your application)</text>
        </g>
        <g class="anim-node" style="animation-delay:.3s">
          <rect x="460" y="80" width="130" height="56" rx="8" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1.5"></rect>
          <text x="525" y="104" text-anchor="middle" font-size="12" font-weight="700" fill="#92400E">Resource</text>
          <text x="525" y="122" text-anchor="middle" font-size="12" font-weight="700" fill="#92400E">Server</text>
        </g>
        <g class="anim-node" style="animation-delay:.2s">
          <rect x="240" y="196" width="130" height="56" rx="8" fill="#1E40AF"></rect>
          <text x="305" y="222" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Authorization</text>
          <text x="305" y="238" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Server</text>
        </g>
        <g class="anim-node" style="animation-delay:.45s">
          <line x1="150" y1="108" x2="240" y2="108" stroke="#16A34A" stroke-width="1.5" marker-end="url(#qa-green)" class="anim-line" style="stroke-dasharray:90;animation-delay:.45s"></line>
          <text x="195" y="102" font-size="12" fill="#16A34A" font-weight="600" text-anchor="middle">Grant</text>
        </g>
        <g class="anim-node" style="animation-delay:.65s">
          <line x1="305" y1="136" x2="305" y2="196" stroke="#2563EB" stroke-width="1.5" marker-end="url(#qa-blue)" class="anim-line" style="stroke-dasharray:60;animation-delay:.65s"></line>
          <text x="322" y="170" font-size="12" fill="#2563EB" font-weight="600">Token Req</text>
        </g>
        <g class="anim-node" style="animation-delay:.85s">
          <line x1="278" y1="196" x2="278" y2="136" stroke="#16A34A" stroke-width="1.5" marker-end="url(#qa-green)" class="anim-line" style="stroke-dasharray:60;animation-delay:.85s"></line>
          <text x="260" y="170" font-size="12" fill="#16A34A" font-weight="600" text-anchor="end">Token</text>
        </g>
        <g class="anim-node" style="animation-delay:1.05s">
          <line x1="370" y1="108" x2="460" y2="108" stroke="#D97706" stroke-width="1.5" marker-end="url(#qa-warn)" class="anim-line" style="stroke-dasharray:90;animation-delay:1.05s"></line>
          <text x="415" y="102" font-size="12" fill="#92400E" font-weight="600" text-anchor="middle">Access (token)</text>
        </g>
        <g class="anim-node" style="animation-delay:.5s">
          <path d="M85 136 L85 224 L240 224" stroke="#4B5563" stroke-width="1.5" fill="none" marker-end="url(#qa-gray)" class="anim-line" style="stroke-dasharray:243;animation-delay:.5s"></path>
          <text x="162" y="218" font-size="12" fill="#4B5563" font-weight="600" text-anchor="middle">Authenticate</text>
        </g>
        <g class="anim-node" style="animation-delay:1.2s">
          <rect x="420" y="190" width="200" height="62" rx="6" fill="#F9FAFB" stroke="#E5E7EB"></rect>
          <text x="430" y="208" font-size="12" font-weight="700" fill="#111827">Scopes (what's permitted):</text>
          <text x="430" y="224" font-size="12" fill="#4B5563">read:profile  write:data</text>
          <text x="430" y="240" font-size="12" fill="#4B5563">openid  email  groups</text>
        </g>
        <defs>
          <marker id="qa-blue"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path></marker>
          <marker id="qa-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path></marker>
          <marker id="qa-gray"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4B5563"></path></marker>
          <marker id="qa-warn"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#D97706"></path></marker>
          <path id="rp-oa-grant"  d="M 150 108 L 240 108"></path>
          <path id="rp-oa-treq"   d="M 305 136 L 305 196"></path>
          <path id="rp-oa-token"  d="M 278 196 L 278 136"></path>
          <path id="rp-oa-access" d="M 370 108 L 460 108"></path>
          <path id="rp-oa-auth"   d="M 85 136 L 85 224 L 240 224"></path>
        </defs>
        <g class="radar-ping">
          <circle r="5" fill="#16A34A"><animateMotion dur="1.4s" repeatCount="indefinite" begin="0s"><mpath href="#rp-oa-grant"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="1.4s" repeatCount="indefinite" begin="0s"><mpath href="#rp-oa-grant"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="1.3s" repeatCount="indefinite" begin="-0.4s"><mpath href="#rp-oa-treq"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.3s" repeatCount="indefinite" begin="-0.4s"><mpath href="#rp-oa-treq"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="1.3s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-oa-token"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="1.3s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-oa-token"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#D97706"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.6s"><mpath href="#rp-oa-access"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#D97706" stroke-width="1.5"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.6s"><mpath href="#rp-oa-access"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#4B5563"><animateMotion dur="1.6s" repeatCount="indefinite" begin="-0.2s"><mpath href="#rp-oa-auth"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#4B5563" stroke-width="1.5"><animateMotion dur="1.6s" repeatCount="indefinite" begin="-0.2s"><mpath href="#rp-oa-auth"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
        </g>
      </svg>

### Grant Types

| Grant Type | When to Use | Who Gets the Token |
| --- | --- | --- |
| Authorization Code | Web apps, mobile apps — user present | Backend server (after code exchange) |
| Client Credentials | Machine-to-machine (no user) | The service itself |
| Device Flow | CLI tools, TV apps, limited input | Device polls until user approves on phone |
| Implicit (deprecated) | Old SPAs — avoid; use Auth Code + PKCE | Browser (unsafe) |

## SAML 2.0

## SAML 2.0 — Security Assertion Markup Language

SAML is an XML-based open standard for exchanging authentication and authorisation data between an Identity Provider and a Service Provider. Predating OIDC by a decade, it is the dominant protocol in enterprise on-premise environments (Salesforce, Workday, legacy SaaS). Keycloak supports SAML alongside OIDC.

<svg viewBox="0 0 700 290" width="100%" xmlns="http://www.w3.org/2000/svg">
        <g class="anim-node" style="animation-delay:.0s">
          <rect x="20" y="104" width="90" height="44" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="65" y="124" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">User</text>
          <text x="65" y="140" text-anchor="middle" font-size="12" fill="#4B5563">Browser</text>
        </g>
        <g class="anim-node" style="animation-delay:.1s">
          <rect x="270" y="104" width="130" height="44" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="335" y="124" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Service</text>
          <text x="335" y="140" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Provider (SP)</text>
        </g>
        <g class="anim-node" style="animation-delay:.2s">
          <rect x="556" y="104" width="120" height="44" rx="6" fill="#1E40AF"></rect>
          <text x="616" y="124" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Identity</text>
          <text x="616" y="140" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Provider (IdP)</text>
        </g>
        <line x1="65" y1="148" x2="65" y2="278" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 3"></line>
        <line x1="335" y1="148" x2="335" y2="278" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 3"></line>
        <line x1="616" y1="148" x2="616" y2="278" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 3"></line>
        <g class="anim-node" style="animation-delay:.35s">
          <line x1="65" y1="165" x2="268" y2="165" stroke="#2563EB" stroke-width="1.5" marker-end="url(#sa-blue)" class="anim-line" style="stroke-dasharray:210;animation-delay:.35s"></line>
          <text x="167" y="159" text-anchor="middle" font-size="12" fill="#2563EB" font-weight="600">1  Access protected resource</text>
        </g>
        <g class="anim-node" style="animation-delay:.55s">
          <line x1="335" y1="186" x2="554" y2="186" stroke="#2563EB" stroke-width="1.5" marker-end="url(#sa-blue)" class="anim-line" style="stroke-dasharray:225;animation-delay:.55s"></line>
          <text x="444" y="180" text-anchor="middle" font-size="12" fill="#2563EB" font-weight="600">2  SAML AuthnRequest (redirect)</text>
        </g>
        <g class="anim-node" style="animation-delay:.75s">
          <line x1="616" y1="206" x2="72" y2="206" stroke="#4B5563" stroke-width="1.5" marker-end="url(#sa-gray)" class="anim-line" style="stroke-dasharray:550;animation-delay:.75s"></line>
          <text x="308" y="200" text-anchor="middle" font-size="12" fill="#4B5563" font-weight="600">3  Redirect — login page</text>
        </g>
        <g class="anim-node" style="animation-delay:.95s">
          <line x1="65" y1="226" x2="554" y2="226" stroke="#2563EB" stroke-width="1.5" marker-end="url(#sa-blue)" class="anim-line" style="stroke-dasharray:495;animation-delay:.95s"></line>
          <text x="308" y="220" text-anchor="middle" font-size="12" fill="#2563EB" font-weight="600">4  Submit credentials</text>
        </g>
        <g class="anim-node" style="animation-delay:1.15s">
          <line x1="616" y1="248" x2="72" y2="248" stroke="#16A34A" stroke-width="1.5" marker-end="url(#sa-green)" class="anim-line" style="stroke-dasharray:550;animation-delay:1.15s"></line>
          <text x="310" y="241" text-anchor="middle" font-size="12" fill="#16A34A" font-weight="600">5  SAML Assertion POST (signed XML)</text>
        </g>
        <g class="anim-node" style="animation-delay:1.35s">
          <line x1="335" y1="268" x2="72" y2="268" stroke="#16A34A" stroke-width="1.5" marker-end="url(#sa-green)" class="anim-line" style="stroke-dasharray:270;animation-delay:1.35s"></line>
          <text x="202" y="262" text-anchor="middle" font-size="12" fill="#16A34A" font-weight="600">6  SP validates assertion — access granted</text>
        </g>
        <defs>
          <marker id="sa-blue"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path></marker>
          <marker id="sa-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path></marker>
          <marker id="sa-gray"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4B5563"></path></marker>
          <path id="rp-sa-1" d="M 65 165 L 268 165"></path>
          <path id="rp-sa-2" d="M 335 186 L 554 186"></path>
          <path id="rp-sa-3" d="M 616 206 L 72 206"></path>
          <path id="rp-sa-4" d="M 65 226 L 554 226"></path>
          <path id="rp-sa-5" d="M 616 248 L 72 248"></path>
          <path id="rp-sa-6" d="M 335 268 L 72 268"></path>
        </defs>
        <g class="radar-ping">
          <circle r="5" fill="#2563EB"><animateMotion dur="1.6s" repeatCount="indefinite" begin="0s"><mpath href="#rp-sa-1"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.6s" repeatCount="indefinite" begin="0s"><mpath href="#rp-sa-1"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.7s"><mpath href="#rp-sa-2"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.7s"><mpath href="#rp-sa-2"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#4B5563"><animateMotion dur="2.5s" repeatCount="indefinite" begin="-1.2s"><mpath href="#rp-sa-3"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#4B5563" stroke-width="1.5"><animateMotion dur="2.5s" repeatCount="indefinite" begin="-1.2s"><mpath href="#rp-sa-3"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="2.5s" repeatCount="indefinite" begin="-0.4s"><mpath href="#rp-sa-4"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="2.5s" repeatCount="indefinite" begin="-0.4s"><mpath href="#rp-sa-4"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="2.5s" repeatCount="indefinite" begin="-1.8s"><mpath href="#rp-sa-5"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="2.5s" repeatCount="indefinite" begin="-1.8s"><mpath href="#rp-sa-5"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="2.0s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-sa-6"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="2.0s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-sa-6"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
        </g>
      </svg>

### SAML vs OIDC

| Aspect | SAML 2.0 | OIDC |
| --- | --- | --- |
| Format | XML assertions | JSON / JWT |
| Transport | HTTP POST / redirect (form) | HTTP redirect + JSON API |
| Best for | Enterprise on-prem, legacy SaaS | APIs, mobile, modern web apps |
| Complexity | High — XML signatures, metadata exchange | Lower — JWT, discovery endpoint |
| Mobile support | Poor (POST binding needs browser) | Excellent |

## Keycloak

## Keycloak — Unified Identity Hub

Keycloak is an open-source Identity and Access Management server. A single Keycloak instance can serve multiple **Realms** (isolated identity domains), each with its own users, clients (applications), roles, and groups. It speaks OIDC, OAuth 2.0, and SAML simultaneously, and federates from LDAP or Active Directory. For Persona, one Keycloak login unlocks every internal tool.

<svg viewBox="0 0 700 340" width="100%" xmlns="http://www.w3.org/2000/svg">
        <g class="anim-node" style="animation-delay:.1s">
          <rect x="265" y="120" width="170" height="80" rx="10" fill="#1E40AF"></rect>
          <text x="350" y="150" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">Keycloak</text>
          <text x="350" y="168" text-anchor="middle" font-size="12" fill="#DBEAFE">persona realm</text>
          <text x="350" y="184" text-anchor="middle" font-size="12" fill="#DBEAFE">OIDC · OAuth2 · SAML</text>
        </g>
        <g class="anim-node" style="animation-delay:.0s">
          <rect x="24" y="136" width="110" height="48" rx="8" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1.5"></rect>
          <text x="79" y="158" text-anchor="middle" font-size="12" font-weight="700" fill="#92400E">OpenLDAP</text>
          <text x="79" y="174" text-anchor="middle" font-size="12" fill="#92400E">User Store</text>
        </g>
        <g class="anim-node" style="animation-delay:.35s">
          <line x1="134" y1="160" x2="264" y2="160" stroke="#D97706" stroke-width="2" marker-end="url(#kc-warn)" class="anim-line" style="stroke-dasharray:135;animation-delay:.35s"></line>
          <text x="199" y="155" text-anchor="middle" font-size="12" fill="#92400E" font-weight="600">LDAP Federation</text>
        </g>
        <g class="anim-node" style="animation-delay:.5s">
          <rect x="80" y="24" width="90" height="38" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="125" y="47" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">ArgoCD</text>
        </g>
        <g class="anim-node" style="animation-delay:.6s">
          <rect x="280" y="24" width="90" height="38" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="325" y="47" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Grafana</text>
        </g>
        <g class="anim-node" style="animation-delay:.7s">
          <rect x="480" y="24" width="90" height="38" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="525" y="47" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Temporal</text>
        </g>
        <g class="anim-node" style="animation-delay:.8s">
          <rect x="80" y="270" width="90" height="38" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="125" y="293" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">MinIO</text>
        </g>
        <g class="anim-node" style="animation-delay:.9s">
          <rect x="280" y="270" width="90" height="38" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="325" y="293" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Qdrant</text>
        </g>
        <g class="anim-node" style="animation-delay:1.0s">
          <rect x="480" y="270" width="120" height="38" rx="6" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="540" y="293" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Persona App</text>
        </g>
        <g class="anim-node" style="animation-delay:.55s">
          <path d="M125 62 L125 130 L265 130" stroke="#16A34A" stroke-width="1.5" fill="none" marker-end="url(#kc-green)" class="anim-line" style="stroke-dasharray:208;animation-delay:.55s"></path>
          <text x="195" y="125" font-size="12" fill="#16A34A" font-weight="600" text-anchor="middle">OIDC</text>
        </g>
        <g class="anim-node" style="animation-delay:.65s">
          <line x1="325" y1="62" x2="325" y2="120" stroke="#16A34A" stroke-width="1.5" marker-end="url(#kc-green)" class="anim-line" style="stroke-dasharray:58;animation-delay:.65s"></line>
          <text x="340" y="94" font-size="12" fill="#16A34A" font-weight="600">OIDC</text>
        </g>
        <g class="anim-node" style="animation-delay:.75s">
          <path d="M525 62 L525 130 L435 130" stroke="#16A34A" stroke-width="1.5" fill="none" marker-end="url(#kc-green)" class="anim-line" style="stroke-dasharray:158;animation-delay:.75s"></path>
          <text x="480" y="125" font-size="12" fill="#16A34A" font-weight="600" text-anchor="middle">OIDC</text>
        </g>
        <g class="anim-node" style="animation-delay:.85s">
          <path d="M125 270 L125 190 L265 190" stroke="#16A34A" stroke-width="1.5" fill="none" marker-end="url(#kc-green)" class="anim-line" style="stroke-dasharray:220;animation-delay:.85s"></path>
          <text x="195" y="185" font-size="12" fill="#16A34A" font-weight="600" text-anchor="middle">OIDC</text>
        </g>
        <g class="anim-node" style="animation-delay:.95s">
          <line x1="325" y1="270" x2="325" y2="200" stroke="#16A34A" stroke-width="1.5" marker-end="url(#kc-green)" class="anim-line" style="stroke-dasharray:70;animation-delay:.95s"></line>
          <text x="340" y="240" font-size="12" fill="#16A34A" font-weight="600">OIDC</text>
        </g>
        <g class="anim-node" style="animation-delay:1.05s">
          <path d="M540 270 L540 190 L435 190" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#kc-blue)" class="anim-line" style="stroke-dasharray:185;animation-delay:1.05s"></path>
          <text x="488" y="185" font-size="12" fill="#2563EB" font-weight="600" text-anchor="middle">OIDC</text>
        </g>
        <g class="anim-node" style="animation-delay:1.2s">
          <rect x="568" y="120" width="116" height="80" rx="6" fill="#F9FAFB" stroke="#E5E7EB"></rect>
          <text x="578" y="138" font-size="12" font-weight="700" fill="#111827">Realm hierarchy:</text>
          <text x="578" y="154" font-size="12" fill="#4B5563">Realm: persona</text>
          <text x="592" y="168" font-size="12" fill="#4B5563">Clients (apps)</text>
          <text x="592" y="182" font-size="12" fill="#4B5563">Roles / Groups</text>
          <text x="592" y="196" font-size="12" fill="#4B5563">Users (or LDAP)</text>
        </g>
        <defs>
          <marker id="kc-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path></marker>
          <marker id="kc-blue"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path></marker>
          <marker id="kc-warn"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#D97706"></path></marker>
          <path id="rp-kc-ldap"    d="M 134 160 L 264 160"></path>
          <path id="rp-kc-argo"    d="M 125 62 L 125 130 L 265 130"></path>
          <path id="rp-kc-grafana" d="M 325 62 L 325 120"></path>
          <path id="rp-kc-temp"    d="M 525 62 L 525 130 L 435 130"></path>
          <path id="rp-kc-minio"   d="M 125 270 L 125 190 L 265 190"></path>
          <path id="rp-kc-qdrant"  d="M 325 270 L 325 200"></path>
          <path id="rp-kc-persona" d="M 540 270 L 540 190 L 435 190"></path>
        </defs>
        <g class="radar-ping">
          <circle r="5" fill="#D97706"><animateMotion dur="1.4s" repeatCount="indefinite" begin="0s"><mpath href="#rp-kc-ldap"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#D97706" stroke-width="1.5"><animateMotion dur="1.4s" repeatCount="indefinite" begin="0s"><mpath href="#rp-kc-ldap"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="1.8s" repeatCount="indefinite" begin="0s"><mpath href="#rp-kc-argo"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="1.8s" repeatCount="indefinite" begin="0s"><mpath href="#rp-kc-argo"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="1.2s" repeatCount="indefinite" begin="-0.5s"><mpath href="#rp-kc-grafana"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="1.2s" repeatCount="indefinite" begin="-0.5s"><mpath href="#rp-kc-grafana"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-kc-temp"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.9s"><mpath href="#rp-kc-temp"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.3s"><mpath href="#rp-kc-minio"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-0.3s"><mpath href="#rp-kc-minio"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#16A34A"><animateMotion dur="1.2s" repeatCount="indefinite" begin="-1.1s"><mpath href="#rp-kc-qdrant"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#16A34A" stroke-width="1.5"><animateMotion dur="1.2s" repeatCount="indefinite" begin="-1.1s"><mpath href="#rp-kc-qdrant"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
          <circle r="5" fill="#2563EB"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-1.4s"><mpath href="#rp-kc-persona"></mpath></animateMotion></circle>
          <circle r="5" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.8s" repeatCount="indefinite" begin="-1.4s"><mpath href="#rp-kc-persona"></mpath></animateMotion><animate attributeName="r" from="5" to="18" dur="0.7s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.7s" repeatCount="indefinite"></animate></circle>
        </g>
      </svg>

### Persona Setup Plan

-   Create `persona` realm (isolated from other projects)
-   Add OpenLDAP federation (user source of truth)
-   Register OIDC clients: ArgoCD, Grafana, Temporal, MinIO
-   Wire Traefik ForwardAuth for apps without native OIDC (Qdrant)
-   Groups: `admins`, `developers`, `viewers`

### Key Concepts

-   **Realm** — isolated domain; own users, clients, settings
-   **Client** — an application registered to use Keycloak OIDC
-   **Client Secret** — shared secret for backend code exchange
-   **Role** — permission unit; assigned to users or groups
-   **Federation** — Keycloak reads users from external LDAP
