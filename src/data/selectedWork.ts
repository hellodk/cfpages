/**
 * Selected work — the evidence strip under the homepage hero.
 *
 * Every figure here is sourced from the resume or from a published post on
 * this site. Nothing is estimated, rounded up, or carried over from a draft.
 * Two rules hold for anything added later:
 *
 *  - No employer is named. The homepage is a blog surface; naming the current
 *    employer here is the compliance problem the resume `description` already
 *    caused, and `scripts/check-secrets.mjs` enforces it.
 *  - No running duration ("fifteen years"). It is correct the day it ships and
 *    wrong every year after, because nobody re-reads the string.
 *
 * `note` is the evidence line — the number or credential that makes the claim
 * checkable. `href` is optional and internal-only; entries drawn from the
 * resume have no post to link to.
 */
export interface WorkItem {
  /** Short category chip, e.g. "Incident". */
  kicker: string;
  title: string;
  blurb: string;
  /** The checkable figure or credential. */
  note: string;
  /** Internal path to the post that documents it, when one exists. */
  href?: string;
}

export const selectedWork: WorkItem[] = [
  {
    kicker: 'Reliability',
    title: '99.9999% uptime across datacentre, AWS and Azure',
    blurb:
      "Sysadmin team at India's largest fashion e-commerce platform — on-call rotation, revenue-impact metrics and PCI audit.",
    note: 'Six nines · hybrid infrastructure',
  },
  {
    kicker: 'Incident',
    title: 'A Kubernetes node that served its own NFS mount',
    blurb:
      'Memory pressure starved the NFS daemon the node itself depended on — a self-referencing deadlock that looked like a network fault.',
    note: '1,172 zombie processes · load average 10× cores',
    href: '/nfs-meltdown/',
  },
  {
    kicker: 'Cost',
    title: 'Cut cloud spend by finding what nobody was using',
    blurb:
      'Billing analysis over AWS and Azure ETL, built in Python and Flask, surfacing overprovisioned and idle services.',
    note: '25% reduction',
  },
  {
    kicker: 'Compliance',
    title: 'Securing ISO 27001 certification',
    blurb:
      'VAPT remediation and multi-AZ disaster recovery driven by Ansible. The certification unlocked further client contracts.',
    note: 'ISO 27001 · audited',
  },
  {
    kicker: 'Platform',
    title: 'Secure CI/CD architecture for a national bank',
    blurb:
      'OSA, SAST, DAST and a container trust registry, with policy as code catching issues before release rather than after.',
    note: 'Banking · current role',
  },
  {
    kicker: 'Cost',
    title: 'Catching an AI agent ignoring its own rules',
    blurb:
      'Instrumented the tool loop, found the gap where enforcement was never reached, and closed it with a pre-tool hook.',
    note: '406M wasted tokens recovered',
    href: '/graphify-token-enforcement/',
  },
];
