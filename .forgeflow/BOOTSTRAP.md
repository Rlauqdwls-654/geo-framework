# Bootstrap Constraints

These inputs came directly from the user during /init.
Treat them as binding unless the user explicitly changes them later.

## Locked Inputs Captured During /init
- Product name: Not specified.
- Preferred stack/ecosystem: Not specified.
- Preferred app/runtime framework, starter, or delivery approach: Not specified.
- Exact bootstrap/tooling inputs to preserve: None captured explicitly.
- Testing baseline: Not specified.
- Hosting/deployment target: Not specified.
- Preferred libraries/providers to use or avoid: None stated.
- Integrations/constraints: None stated.

## Rules For Later Pipelines
- PRD.md may summarise these choices in prose, but must not silently remove, weaken, or replace them.
- Issue creation must carry relevant locked inputs into the initial scaffold/bootstrap issue and any later setup-sensitive issues.
- If the user provided an exact starter/template identifier, package manager choice, scaffold command, versioned tooling choice, or explicit use/avoid constraint, preserve it exactly where relevant.
