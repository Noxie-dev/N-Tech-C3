# Specification 11 — Engineering Principles

Status: **Accepted**
Owner: NaniTech Engineering
Last reviewed: 2026-07-29

1. **Evidence Before Opinion**
   Decisions require traceable evidence. Confidence never substitutes for proof.

2. **Local First**
   Cloud services enhance the product but do not become dependencies for core work.

3. **Files Belong to the User**
   Content remains portable, inspectable, and human-readable whenever practical.

4. **Composition Over Configuration**
   Small, explicit building blocks are preferred to monolithic feature systems.

5. **One Source of Truth**
   Every fact has one authoritative owner; all other representations are projections.

6. **Everything Is Linkable**
   Durable engineering knowledge must support explicit, typed relationships.

7. **Design for Evolution**
   Stable contracts and migrations permit extension without routine core rewrites.

8. **Automation Earns Its Place**
   Automation is transparent, traceable, reversible where practical, and controlled
   by the user.

9. **Performance Is a Feature**
   Responsiveness and bounded resource use are part of correctness.

10. **Quality Before Quantity**
    A smaller complete platform is better than a catalogue of unfinished features.

## Conflict resolution

When principles pull in different directions, document the tradeoff and use
Evidence Before Opinion plus One Source of Truth to identify the decision owner.

## Amendment history

- 2026-07-29: Initial accepted engineering principles.
