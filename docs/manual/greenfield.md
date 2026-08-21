# Start small on a greenfield project

A greenfield project begins with possibility, not evidence. Kanmer's setup
interview turns a product brief into governing documents and a first backlog;
this playbook keeps that first pass useful without mistaking prediction for a
plan.

## Pick the depth before you add detail

Choose the smallest depth that fits the consequence of being wrong. The point
is to spend attention where uncertainty or risk warrants it, not to make every
new project look like a large programme.

| Depth | Use it when | First-pass output |
|---|---|---|
| Lean | A small, reversible product or internal tool has one clear user and low cost of correction. | A one-page brief, explicit non-goals, and one walking-skeleton horizon. |
| Standard | A product has several user journeys, meaningful integrations, or a cost to rework. | The brief plus the governing documents and a first horizon detailed enough to sequence the real risks. |
| High-assurance | Safety, money, regulated data, irreversible operations, or a serious failure cost changes what must be proved. | The standard output plus explicit risk, security, operational, and acceptance evidence before broadening scope. |

Changing depth later is normal. Start lean when the consequence permits it and
raise the level only when real evidence says you need to.

## 1. Write a one-page brief and non-goals

State what you are building, for whom, and the outcome that would make the
first release worthwhile. Keep it short enough that every later decision can be
checked against it. Then name what the first release will *not* solve: users,
workflows, integrations, scale targets, or guarantees that are deliberately
outside the first horizon.

If that paragraph cannot be written yet, stop and resolve the product question
with the people who own it. Do not invent a product from an empty repository.

## 2. Build a walking skeleton before a framework

Find the smallest end-to-end path that makes the intended value real: one user
can complete one meaningful outcome through the actual delivery shape. Prefer a
thin, observable slice over a generalized platform, shared abstraction, or
catalogue of future options. The skeleton is where assumptions about users,
data, integrations, deployment, and operations become evidence.

## 3. Detail only the first horizon

Turn the brief into the governing documents and tickets needed to reach the
walking skeleton. Order work around the riskiest unanswered question and the
first usable outcome. Describe later directions as possibilities, dependencies,
or questions—not a pre-committed implementation queue.

**Do not create a lifetime backlog before the walking skeleton reveals which
assumptions were wrong.** A long initial list looks thorough, but it records
guesses as commitments and makes changing course needlessly expensive.

## 4. Release, learn, and replan

After the first real release, review what users did, what broke, what took too
long, and which assumptions survived contact with reality. Update the brief,
non-goals, governing documents, and next horizon from that evidence. Add depth
where the release exposed risk; remove planned work whose premise is no longer
true.

The next horizon is a new planning decision, not the automatic continuation of
a backlog written before the first release.

## Use this with setup

At the greenfield interview, use this page to choose an appropriate starting
depth, then follow `kanmer-setup`'s brief-first workflow. Setup still asks for a
real brief, materialises governing documents, and shows the proposed areas,
profiles, and backlog counts for user confirmation before it creates anything.
