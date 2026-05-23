# Form Editor (Flex Height) — Embedding Inside a Scrolling Page

<!-- docuserve:example-launch:start -->
> **[&#9654; Launch the live app](examples/form%5Feditor%5Fflex/index.html)** — runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->

The default form editor is built for a *viewport-filling* host: it claims
the available height and scrolls its tabs internally. That is the right
default for a dedicated editor screen, but it does not embed cleanly into a
documentation page, a CMS, or any other layout that flows top-to-bottom and
expects the editor to grow with the page rather than scroll inside its own
shell.

This reference application shows how to **patch the editor's default CSS at
construction time** so it lives inside a normal page flow, then makes the
right-hand properties panel **`position: sticky`** so it stays visible as
the user scrolls through long manifests. The two changes together turn the
editor into a well-behaved citizen of a scrolling page — without forking the
view or touching its source.

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| Cloning the editor's default configuration before mounting | `JSON.parse(JSON.stringify(libPictSectionFormEditor.default_configuration))` |
| Patching the `.pict-formeditor` rule to drop the fixed viewport height | `tmpCSS.replace(/\.pict-formeditor\s*\{[^}]*\}/, ...)` |
| Patching `.pict-fe-editor-layout` to remove `overflow: hidden` and `min-height: 0` | Second `tmpCSS.replace(...)` block |
| Patching `.pict-fe-editor-content` to flow naturally | Third `tmpCSS.replace(...)` block |
| Patching `.pict-fe-tabcontent` to drop internal scroll | Fourth `tmpCSS.replace(...)` block |
| Appending sticky-panel CSS for the open properties panel | `tmpCSS += "\n.pict-fe-properties-panel-open { position: sticky; top: 0; ... }"` |
| Mounting with the patched configuration | `pict.addView('FormEditor', Object.assign({}, tmpDefaultConfig, { … }), libPictSectionFormEditor)` |
| Sticky-top page header that survives scroll | `.pict-example-header { position: sticky; top: 0; z-index: 100; … }` in the HTML shell |
| Two large seed manifests for exercising vertical scroll | *Patient Intake* and *Project Proposal* in the manifest selector |

## Key files

- `FormEditorFlex-Example-Application.js` — the host application. Same
  manifest-selector chrome as the standard `form_editor` example, but the
  `onAfterInitializeAsync` body builds a *patched* configuration object
  before calling `addView`. Read top-to-bottom; the CSS substitutions are
  the load-bearing part.
- `html/index.html` — a normal-flow page shell with a `position: sticky`
  header. Crucially, the body and `<html>` are **not** set to
  `height: 100%` / `overflow: hidden` — the page is allowed to grow.
- `html/manifests/Patient-Intake.json`, `Project-Proposal.json`, and six
  others — the manifests in the selector. Patient Intake and Project
  Proposal are deliberately large so vertical scrolling kicks in.

## The strategy

The editor's `default_configuration` is a normal JavaScript object — it
exposes `CSS`, `Templates`, `Renderables`, and all the other defaults via
`module.exports.default_configuration`. Because Pict applies CSS by
*registration*, not by stylesheet import, the host can substitute a tweaked
CSS string into the configuration *before* it ever reaches the view's
constructor. The view then registers the tweaked CSS into the cascade and
nothing else changes — the templates, lifecycle, and behavior are intact.

```js
// Override the default CSS to remove the fixed height and use natural flow
let tmpDefaultConfig = JSON.parse(JSON.stringify(libPictSectionFormEditor.default_configuration));

let tmpCSS = tmpDefaultConfig.CSS;
// … patch tmpCSS …
tmpDefaultConfig.CSS = tmpCSS;

this._FormEditorView = this.pict.addView('FormEditor',
    Object.assign({}, tmpDefaultConfig,
    {
        ViewIdentifier: 'FormEditor',
        ManifestDataAddress: 'AppData.FormConfig',
        // …
    }), libPictSectionFormEditor);
```

The `JSON.parse(JSON.stringify(...))` deep-clone is intentional —
`default_configuration` is shared across every instance of the view in the
process, and mutating it in place would leak into anyone else who instantiates
the view from the same require. The clone keeps the changes scoped to this
mount.

---

## Feature 1 — Removing the fixed viewport height

The editor's default `.pict-formeditor` rule sets
`height: calc(100vh - 120px)` and `overflow: hidden`. That is what makes the
editor "fill the viewport," and it is what we have to undo to let the editor
grow with its content:

```js
tmpCSS = tmpCSS.replace(
    /\.pict-formeditor\s*\{[^}]*\}/,
    `.pict-formeditor
{
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: var(--theme-color-text-primary, #3D3229);
    background: var(--theme-color-background-panel, #FDFCFA);
    border: 1px solid #E8E3DA;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
}`
);
```

The substitution targets the first `.pict-formeditor { … }` block in the
CSS string. The replacement keeps the same visual chrome (border, radius,
background, typography) but drops the `height` and `overflow` lines.
`display: flex; flex-direction: column;` stays so the inner tab-bar / tab-
content stack still flows correctly.

Three more replacements follow in the same pattern — each targets one
internal selector that participates in the "fill the viewport" chain:

```js
// .pict-fe-editor-layout — remove overflow:hidden and min-height:0
tmpCSS = tmpCSS.replace(/\.pict-fe-editor-layout\s*\{[^}]*\}/, /* … */);

// .pict-fe-editor-content — let it grow naturally
tmpCSS = tmpCSS.replace(/\.pict-fe-editor-content\s*\{[^}]*\}/, /* … */);

// .pict-fe-tabcontent — remove min-height:0 and overflow:auto
tmpCSS = tmpCSS.replace(/\.pict-fe-tabcontent\s*\{[^}]*\}/, /* … */);
```

You can read the strategy off the replacement names: drop every `overflow:
hidden` / `overflow: auto` / `min-height: 0` along the path from the editor
root to the tab content, so each level allows its child to grow rather than
clip. The editor ends up with the same flex stack, but without the height
ceiling.

## Feature 2 — Sticky properties panel

The right-hand properties panel is the editor's selection inspector. In the
default fixed-height layout it scrolls internally; in the flex-height
layout it would simply slide off the screen as the user scrolls down the
visual tree.

The fix is one additional CSS rule, appended after the substitutions:

```js
tmpCSS += `

/* === Flex-height sticky panel overrides === */
.pict-fe-properties-panel-open
{
    position: sticky;
    top: 0;
    align-self: flex-start;
    max-height: 100vh;
    overflow-y: auto;
}
`;
```

`position: sticky` anchors the panel to the top of its scrolling ancestor
once the user scrolls past it. `align-self: flex-start` keeps the panel
from being stretched by the flex container to match the tree's height —
without this, the panel would consume the full tree height before sticking,
so it would *never* stick. `max-height: 100vh; overflow-y: auto;` ensures
the panel itself can scroll internally when the manifest's input properties
exceed the viewport.

Note the class is `.pict-fe-properties-panel-open` — the editor adds the
`-open` modifier only when the panel is showing, so this rule only applies
when there's something for the user to see. Closing the panel returns it
to its 0-width hidden state automatically.

## Feature 3 — Mounting with the patched configuration

Once `tmpCSS` carries every patch, the merged configuration goes straight to
`addView` via `Object.assign`:

```js
tmpDefaultConfig.CSS = tmpCSS;

this._FormEditorView = this.pict.addView('FormEditor',
Object.assign({}, tmpDefaultConfig,
{
    ViewIdentifier: 'FormEditor',
    ManifestDataAddress: 'AppData.FormConfig',
    DefaultDestinationAddress: '#FormEditor-Container',
    ActiveTab: 'visual',
    Renderables:
    [
        {
            RenderableHash: 'FormEditor-Container',
            TemplateHash: 'FormEditor-Container-Template',
            DestinationAddress: '#FormEditor-Container',
            RenderMethod: 'replace'
        }
    ]
}), libPictSectionFormEditor);
```

`Object.assign({}, tmpDefaultConfig, { … })` is the host-options layer on
top of the cloned defaults — the same shape every other Pict view uses for
options.  The patched `CSS` rides along on `tmpDefaultConfig`; the
host-specific options (`ViewIdentifier`, `ManifestDataAddress`,
`ActiveTab`, `Renderables`) override the defaults for *this* mount only.

## Feature 4 — The page-flow HTML shell

The HTML shell is the visible counterpart of the CSS patches. It is the
fragment that proves the editor really does flow with the page:

```html
<style>
    *, *::before, *::after { box-sizing: border-box; }
    html { margin: 0; padding: 0; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAEDCD; color: #264653; }

    /* Header Bar (sticky at top of page) */
    .pict-example-header { position: sticky; top: 0; z-index: 100; display: flex; align-items: stretch; background: #264653; border-bottom: 3px solid #E76F51; }

    /* Content Area — flows naturally, no fixed height */
    .pict-example-content { padding: 1.5rem; }
</style>
```

Compare with the standard `form_editor` shell, which sets
`html, body { height: 100%; overflow: hidden; }` and pins the body into a
fixed-height flex column. Here `html` and `body` carry no height / overflow
constraints — the document simply grows as the editor grows.

The `.pict-example-header` is itself `position: sticky` so the brand strip
stays at the top of the viewport while the editor scrolls beneath. The
header and the properties panel both stick to the same top (`top: 0`), so
they share the visible space cleanly: the brand strip on top, the
properties panel under it once it pins.

## Feature 5 — Sample manifests that exercise scroll

The selector exposes the same eight manifests as the standard
`form_editor` example, but the default load is *Patient Intake* — one of
two manifests deliberately added to this example for testing vertical
flow:

```js
const _ManifestList =
[
    { Name: 'New Form', File: false },
    { Name: 'Patient Intake (large)', File: 'manifests/Patient-Intake.json' },
    { Name: 'Project Proposal (large)', File: 'manifests/Project-Proposal.json' },
    { Name: 'Complex Table', File: 'manifests/Complex-Table.json' },
    /* … */
];

// …
let tmpDefaultIndex = 1;  // Patient Intake — the first large manifest
```

Patient Intake spans several sections of medical and demographic inputs;
Project Proposal carries a long sequence of milestones and budget rows.
Both are big enough that scrolling kicks in on a 13-inch laptop, so the
sticky properties panel and sticky page header have a real job to do.

## Feature 6 — Everything else is the same

This example deliberately keeps the rest of the host code identical to
`form_editor` — manifest selector, drag-and-drop toggle, hash/name display
toggle, CSV/JSON import handling. That mirroring is the point of the
example: the *only* delta you need to embed the editor in a scrolling page
is the configuration-time CSS patch and the sticky-panel rule. Nothing
else about the integration changes.

```js
// Identical to the standard form_editor example:
this._FormEditorView.onImport = function(pManifests, pFileName)
{
    tmpSelf._handleImportedManifests(pManifests, pFileName);
};

// … and …

toggleDragAndDrop()
{
    this._DragDropEnabled = !this._DragDropEnabled;
    if (this._FormEditorView)
    {
        this._FormEditorView._DragDropProvider.setDragAndDropEnabled(this._DragDropEnabled);
    }
    // …
}
```

If you have read the standard `form_editor` writeup, treat this example as
"that, but with a `tmpCSS.replace(...)` chain in front of `addView`."

## Running the example

```bash
cd example_applications/form_editor_flex
npm install
npm run build
# serve ./dist and open index.html in a browser
```

Try resizing the browser window vertically once the editor is loaded —
the page header stays anchored to the top, the editor's properties panel
sticks under it (when open), and the manifest tree scrolls naturally with
the page.

## Things to try

- **Pick *Project Proposal*** from the selector — it has enough milestones
  and budget rows that the editor scrolls a couple of viewports tall.
  Watch the sticky properties panel pin to the top of the viewport once
  you scroll past it.
- **Open the properties panel** by clicking any input. Scroll the page;
  the panel sticks at `top: 0`, beneath the brand strip.
- **Resize the window narrower.** The page-flow layout reflows; the
  editor's two-column tree+panel layout becomes a single growing column
  if the panel is closed. Sticky behavior keeps working.
- **Switch to the JSON tab**, then scroll. The JSON editor inside the tab
  is allowed to grow as tall as it needs to — no longer pinned to the
  viewport height.

## Takeaways

1. **You can change CSS at construction time, not just runtime.** Cloning
   `default_configuration`, patching its `CSS` string, and passing the
   patched object to `addView` keeps the view's behaviour intact while
   completely changing its layout posture.
2. **The view registers CSS by Pict's cascade.** Because the cascade
   deduplicates by hash and sorts by priority, patching the CSS *before*
   construction is the cleanest way to override the defaults — the
   modified rules win because they share the registered hash.
3. **`position: sticky` is the right tool for editor properties panels.**
   It works inside any scrolling ancestor without `JS`, with `align-self:
   flex-start` to keep the panel from being stretched away from a stick.
4. **Embedding-friendly defaults are an opt-in, not a flip.** The standard
   editor's viewport-filling layout is the right default for a
   dedicated-screen host; this example shows what to override for a
   page-flow host. The same view supports both.
5. **Patches are scoped to one mount.** A deep-clone of
   `default_configuration` keeps the changes from leaking to other
   instances. Treat `default_configuration` as a read-only template; clone
   when you mean to modify.

## Related documentation

- [Overview](../../README.md) — module landing page with the basic mounting flow
- [Sections](../../user-docs/Sections.md) — sections, groups, and rows reference
- [Inputs](../../user-docs/Inputs.md) — descriptor model and the per-input panel
- [Groups](../../user-docs/Groups.md) — group layout options
- [Solver Expression Walkthrough](../../user-docs/Solver-Expression-Walkthrough.md) — the solver editor panel that benefits most from a sticky right column
