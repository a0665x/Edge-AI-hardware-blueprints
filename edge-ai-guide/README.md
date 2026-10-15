# Edge AI workbench

See the [project README](../README.md) for the live demo, full-page screenshots and development commands.

- `src/engine.js`: application constraints, resource estimates and device ranking.
- `src/app.js`: interactive selection workbench and exports.
- `src/workflow/`: product stages, role applicability, ownership, RACI and SVG export.
- `src/workflow-bridge.js`: live synchronization between selection and delivery planning.
- `src/locales/`: English labels and contextual explanations.
- `context_reference.py` and `reference_view.py`: linked bilingual reference guide.
- `assets/`: optimized scenario illustrations and credited hardware imagery.
- `tests/`: evaluation, UI, workflow, references and browser fixtures.

Generated `index.html`, `reference.html` and `reference-en.html` are ready to open locally or host as static files. The optional `standalone.html` bundle is excluded from version control.
