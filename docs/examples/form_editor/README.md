# Form Editor - A Visual Manifest Authoring Tour

<!-- docuserve:example-launch:start -->
> **[Launch the live app](examples/form%5Feditor/index.html)** - runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->

The Form Editor example is the canonical host application for
`pict-section-formeditor`. It wires the editor view to an in-memory manifest,
adds a sample-loader bar above the editor, and lets you switch between eight
real `pict-section-form` manifests - a simple form, several tables, a
gradebook, a Manyfest editor, and an entity-bundle (Distill) configuration.
Every tab of the editor is exercised: visual layout, raw JSON, live preview,
and the embedded help browser.

The host code is small - almost the entire app is one `addView()` call against
`Pict-Section-FormEditor` plus a chrome-light selector bar to swap manifests
into `AppData.FormConfig`. The editor watches that address, so any external
mutation (sample load, CSV/JSON import, programmatic edit) becomes a re-render.

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| Mounting the editor against an `AppData` address | `ManifestDataAddress: 'AppData.FormConfig'` on the view options |
| Initial-tab selection (`visual` / `json` / `preview`) | `ActiveTab: 'visual'` in the view options |
| Custom per-input properties via the descriptor extension hook | `ExtendedDescriptorProperties: [{ Name: 'Units', Address: 'PictForm.Units', DataType: 'String' }]` |
| Switching manifests at runtime | `loadManifest(pIndex)` swaps `AppData.FormConfig` and calls `render()` |
| Toggling drag-and-drop reordering | `_DragDropProvider.setDragAndDropEnabled(true|false)` from a host button |
| Switching the visual editor's label style | `_UtilitiesProvider.setInputDisplayMode('hash' | 'name')` |
| Catching CSV / JSON import events from the editor | The `onImport(pManifests, pFileName)` callback on the view |
| Adding imported manifests to the host's selector list | `_handleImportedManifests()` pushes new entries and re-renders the selector |
| Loading manifests by HTTP, by inline data, or as "blank" | The three branches inside `loadManifest()` |

## Key files

- `FormEditor-Example-Application.js` - the entire host application: a small
  `PictApplication` subclass that mounts the editor, manages a manifest
  selector, and wires the editor's import callback. Read top-to-bottom; the
  ordering mirrors this writeup.
- `html/index.html` - the HTML shell: a `#PICT-CSS` style sink, a fixed-height
  body with header/content panes, the `#FormEditor-Selector` and
  `#FormEditor-Container` mount points, and the `<script>` tags that load
  `pict.js`, the CodeJar editor, and the example bundle.
- `manifests/Simple-Form.json` (and seven siblings) - the seed manifests
  presented in the selector. They are copied into `dist/manifests/` by the
  build (see `copyFiles` in `package.json`) and fetched via XHR on demand.

## The data model

There is exactly one piece of application state: `AppData.FormConfig`. It is
a pict-section-form manifest - `Scope`, `Sections`, `Descriptors` - and the
editor reads and writes it in place. Everything else (the manifest selector
list, drag/drop toggle, display mode) is host-side state on the application
instance itself.

```js
this.pict.AppData.FormConfig =
{
    Scope: 'NewForm',
    Sections: [],
    Descriptors: {}
};
```

When the user picks a manifest from the selector, the host overwrites
`AppData.FormConfig` and calls the editor's `render()` - the editor diffs
against the new manifest and rebuilds its tree. There is no separate "load"
or "reset" API; the address binding does the work.

---

## Feature 1 - Mounting the editor

The editor is a single Pict view. Register it with the application, point
`ManifestDataAddress` at the address where the manifest lives in AppData, and
pick the starting tab:

```js
this._FormEditorView = this.pict.addView('FormEditor',
{
    ViewIdentifier: 'FormEditor',
    ManifestDataAddress: 'AppData.FormConfig',
    DefaultDestinationAddress: '#FormEditor-Container',
    ActiveTab: 'visual',
    ExtendedDescriptorProperties:
    [
        { Name: 'Units', Address: 'PictForm.Units', DataType: 'String', Description: 'Unit of measure (e.g. kg, lbs, meters)' }
    ],
    Renderables:
    [
        {
            RenderableHash: 'FormEditor-Container',
            TemplateHash: 'FormEditor-Container-Template',
            DestinationAddress: '#FormEditor-Container',
            RenderMethod: 'replace'
        }
    ]
}, libPictSectionFormEditor);

this._FormEditorView.initialize();
this._FormEditorView.render();
```

A few specifics worth knowing:

- **`ManifestDataAddress`** is mandatory - the editor refuses to render
  meaningful content without an address that resolves to a Pict-Section-Form
  manifest. It is a dot-notation address in the Pict address space (so
  `AppData.X`, `Bundle.Y`, `Options.Z` are all valid).
- **`ActiveTab`** is one of `formoverview`, `visual`, `objecteditor`, `json`,
  `preview`, or `help`. The example starts on `visual` so the user lands in
  the drag-and-drop editor by default.
- **`Renderables`** is the standard pict-view renderable list. The editor only
  needs one renderable - its outer container - because all of the inner
  panels are managed by sub-views and providers it constructs internally.

## Feature 2 - Extending the input properties panel

Real-world manifests often need custom per-input metadata the framework
doesn't natively understand - a unit label, an entity hint, a category. The
editor lets the host **declare additional descriptor properties** that appear
as editable fields in the right-hand Input properties panel, persisted at
their declared dot-notation address inside each `Descriptor`:

```js
ExtendedDescriptorProperties:
[
    { Name: 'Units', Address: 'PictForm.Units', DataType: 'String', Description: 'Unit of measure (e.g. kg, lbs, meters)' }
]
```

Each entry has four keys:

| Key | Purpose |
|-----|---------|
| `Name` | Display label in the properties panel |
| `Address` | Dot-notation path relative to the `Descriptor` object (required) |
| `DataType` | `String` (default), `Number`, or `Boolean` |
| `Description` | Optional placeholder / tooltip text |

So with the example's single-entry list, selecting any input shows a `Units`
text field that reads from and writes to `Descriptor.PictForm.Units`. The
field is part of every input in the manifest, but optional - the editor only
shows it when the panel renders, and only writes it when the user types.

Extended descriptor properties can also be added at runtime via
`view.addExtendedDescriptorProperty(...)` and removed via
`view.removeExtendedDescriptorProperty(address)`. The runtime API is what
makes this safe for host UIs that discover the property set later (e.g. from
a server schema).

## Feature 3 - Loading manifests at runtime

The example's `loadManifest(pIndex)` handles three different cases - and
together they show every supported way to push a manifest into the editor:

```js
loadManifest(pIndex)
{
    let tmpEntry = this._ManifestList[pIndex];

    if (tmpEntry.ManifestData)
    {
        // Directly loaded manifest (e.g. from CSV import)
        this.pict.AppData.FormConfig = tmpEntry.ManifestData;
        this._refreshEditor();
        return;
    }

    if (!tmpEntry.File)
    {
        // "New Form" - empty manifest
        this.pict.AppData.FormConfig =
        {
            Scope: 'NewForm',
            Sections: [],
            Descriptors: {}
        };
        this._refreshEditor();
        return;
    }

    // Fetch the manifest JSON
    let tmpXHR = new XMLHttpRequest();
    tmpXHR.open('GET', tmpEntry.File, true);
    tmpXHR.onreadystatechange = () =>
    {
        if (tmpXHR.readyState === 4)
        {
            if (tmpXHR.status === 200)
            {
                try
                {
                    this.pict.AppData.FormConfig = JSON.parse(tmpXHR.responseText);
                    this._refreshEditor();
                }
                catch (pError)
                {
                    this.log.error(`Error parsing manifest JSON from ${tmpEntry.File}: ${pError.message}`);
                }
            }
        }
    };
    tmpXHR.send();
}
```

`_refreshEditor()` is a one-liner - `this._FormEditorView.render()` - but it
is the *only* thing that drives a refresh. Because the manifest lives at an
`AppData` address the editor watches, the contract is simply "mutate the
address, then re-render." There is no `loadManifest()` API on the editor
itself; the host owns the data and the editor reads it.

The empty-manifest branch is worth calling out: an empty manifest is just
`{ Scope, Sections: [], Descriptors: {} }`. The editor handles this cleanly,
showing an empty visual tree and a JSON tab that already has the right
skeleton waiting for the user to add the first section.

## Feature 4 - Catching CSV / JSON import events

The editor's "Import" affordance accepts both CSV and JSON. CSV is decoded
into one or more manifests (one per worksheet / sheet name); JSON is parsed
directly. The example wires the editor's `onImport` callback so any
*additional* manifests produced by the import get appended to the selector
bar - the first one is auto-loaded by the editor, the rest are surfaced to
the user:

```js
this._FormEditorView.onImport = function(pManifests, pFileName)
{
    tmpSelf._handleImportedManifests(pManifests, pFileName);
};

// ...

_handleImportedManifests(pManifests, pFileName)
{
    let tmpManifestKeys = Object.keys(pManifests);
    if (tmpManifestKeys.length <= 1)
    {
        return;
    }

    let tmpSourceLabel = pFileName.toLowerCase().endsWith('.json') ? 'JSON' : 'CSV';

    for (let i = 1; i < tmpManifestKeys.length; i++)
    {
        let tmpKey = tmpManifestKeys[i];
        let tmpFormName = pManifests[tmpKey].FormName || tmpKey;
        let tmpEntry = { Name: `${tmpSourceLabel}: ${tmpFormName}`, File: false, ManifestData: pManifests[tmpKey] };
        this._ManifestList.push(tmpEntry);
    }

    this.renderSelector();
}
```

`onImport(pManifests, pFileName)` fires once per import action; `pManifests`
is keyed by sheet / form name. The example trusts the editor to have
auto-loaded the first key already, so it slices from index 1 onward and tags
each added entry with `JSON:` or `CSV:` so the user can tell the source.

This same pattern lets a host build cross-manifest tools - e.g. a "merge two
forms" button - entirely outside the editor. The editor stays focused on
single-manifest editing; the host owns the multi-manifest UI.

## Feature 5 - Toggling drag-and-drop and label style

The editor exposes its internal providers on the view, so the host can drive
optional behaviors without touching the manifest. The example shows two:

```js
toggleDragAndDrop()
{
    this._DragDropEnabled = !this._DragDropEnabled;
    if (this._FormEditorView)
    {
        this._FormEditorView._DragDropProvider.setDragAndDropEnabled(this._DragDropEnabled);
    }
    // ... update the toolbar button color/label
}

toggleDisplayMode()
{
    this._ShowHashes = !this._ShowHashes;
    if (this._FormEditorView)
    {
        this._FormEditorView._UtilitiesProvider.setInputDisplayMode(this._ShowHashes ? 'hash' : 'name');
    }
    // ... update the toolbar button color/label
}
```

`setDragAndDropEnabled(true)` turns on the per-element drag handles
(sections, groups, rows, inputs) and the drop-zone markers; passing `false`
restores the static layout. The default is *off* - keeping the editor calm
for read-heavy review and turning it on for active authoring.

`setInputDisplayMode('hash' | 'name')` switches every input chip in the
visual editor between its descriptor hash and its display name. Useful when
the manifest uses long hashes that diverge from the human-readable names -
the hash mode lets the user spot a typo without opening the JSON tab.

Both providers are kept on the view (e.g. `_DragDropProvider`,
`_UtilitiesProvider`) so the host can reach them by reference. They are
internal implementation details - but stable enough that the example relies
on them, and stable enough to document.

## Feature 6 - The selector bar and HTML shell

The host paints a tiny toolbar above the editor - a `<select>` plus a few
buttons. It is not a Pict view; it is direct HTML written into
`#FormEditor-Selector` via `ContentAssignment`:

```js
let tmpHTML = '';
tmpHTML += '<div class="pict-fe-selector-bar">';
tmpHTML += '<label class="pict-fe-selector-label" for="FormEditor-ManifestSelect">Load Configuration:</label>';
tmpHTML += '<select class="pict-fe-selector-select" id="FormEditor-ManifestSelect">';
for (let i = 0; i < this._ManifestList.length; i++)
{
    tmpHTML += `<option value="${i}">${this._escapeHTML(this._ManifestList[i].Name)}</option>`;
}
tmpHTML += '</select>';
tmpHTML += `<button class="pict-fe-selector-btn" onclick="${this.pict.browserAddress}.PictApplication.loadSelectedManifest()">Load</button>`;
tmpHTML += `<button class="pict-fe-selector-btn" id="FormEditor-DragDropToggle" onclick="${this.pict.browserAddress}.PictApplication.toggleDragAndDrop()" style="margin-left:auto; background:#8A7F72;">Enable Drag &amp; Drop</button>`;
tmpHTML += `<button class="pict-fe-selector-btn" id="FormEditor-DisplayModeToggle" onclick="${this.pict.browserAddress}.PictApplication.toggleDisplayMode()" style="background:#8A7F72;">Show Hashes</button>`;
tmpHTML += '</div>';

this.pict.ContentAssignment.assignContent('#FormEditor-Selector', tmpHTML);
```

The selector demonstrates a few small but useful patterns:

- **Two mount points, one app.** `index.html` has a `#FormEditor-Selector`
  and `#FormEditor-Container` side by side. The host owns the first; the
  editor view owns the second.
- **`this.pict.browserAddress`** is the global address of the pict instance
  (e.g. `_Pict`), so `onclick` strings can reach the application via
  `_Pict.PictApplication.<method>()`. This is the inline-handler pattern
  every Pict view uses.
- **Re-rendering the selector on import.** The `_handleImportedManifests`
  flow above ends with `this.renderSelector()` - a full re-paint of the
  toolbar HTML, which is fine because the toolbar has no other state. The
  editor below is untouched.

## Feature 7 - The HTML shell, in one screen

The shell is deliberately minimal - a fixed-height flex column with a header
strip, the selector mount, and the editor container. The editor injects its
CSS into `#PICT-CSS` automatically; no external stylesheet is required:

```html
<style id="PICT-CSS"></style>
<style>
    .pict-example-content { padding: 1.5rem; flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .pict-example-content #FormEditor-Container { flex: 1; min-height: 0; }
    .pict-example-content #FormEditor-Container .pict-formeditor { height: 100%; }
    /* ... selector bar styles ... */
</style>
<script src="./pict.js"></script>
<script src="./codejar.js"></script>
<script src="./codemirror-bundle.js"></script>
<script>Pict.safeOnDocumentReady(() => { Pict.safeLoadPictApplication(FormEditorExample, 1)});</script>
```

The two extra `<script>` tags (CodeJar and the CodeMirror bundle) are the
JSON and Solver editor dependencies. They are loaded eagerly so the JSON tab
is interactive on first click; the editor falls back to a plain `<textarea>`
if CodeJar is missing.

## Running the example

```bash
cd example_applications/form_editor
npm install
npm run build
# serve ./dist and open index.html in a browser
```

`npm run build` runs `npx quack build && npx quack copy` - Quackage bundles
the application file, then copies the HTML shell, the sample manifests, the
Pict runtime, and the embedded help docs into `dist/`.

## Things to try

- **Switch samples** - pick a different manifest from the selector and click
  *Load*. The visual editor rebuilds; the JSON tab reflects the new manifest;
  the Preview tab will render the form on demand.
- **Edit an input's Units** - select an input in the visual editor, scroll
  to the bottom of the Input properties panel, and type into the *Units*
  field. Open the JSON tab to see `PictForm.Units` appear on the descriptor.
- **Enable drag-and-drop** - click *Enable Drag & Drop* in the top-right of
  the selector. Drag handles appear next to every section / group / row /
  input; drop targets light up while dragging.
- **Toggle hashes** - click *Show Hashes*; the input chips flip from their
  display names to their descriptor hashes. Use this to find a typo'd hash
  inside a long manifest without opening the JSON tab.
- **Import a CSV** - drop a CSV with multiple sheets onto the *Import*
  affordance; the editor loads the first sheet, and the host appends the
  remaining sheets to the selector with `CSV:` prefixes.

## Takeaways

1. **The editor is a single view.** One `addView()` call against an
   `AppData` address is the whole integration surface. Everything else is
   host code.
2. **`AppData` is the contract.** There is no `setManifest()` / `getManifest()`
   API on the view - the host mutates the address and calls `render()`. That
   keeps round-trips, save-load cycles, and undo/redo trivial: snapshot the
   address, restore it, re-render.
3. **`ExtendedDescriptorProperties` is the right hook for custom per-input
   metadata.** Don't fork the editor; declare the extra fields and let the
   panel render them, persisted at their declared dot-notation address.
4. **Providers are reachable on the view.** Drag-and-drop, label style, and
   utility functions are all on internal providers (`_DragDropProvider`,
   `_UtilitiesProvider`) the host can drive without monkey-patching.
5. **Import is event-driven.** The editor handles the file parsing and
   loads the first manifest; the host listens via `onImport` and decides
   what to do with the rest. The pattern composes - a host can chain
   imports, transform manifests, or persist them.

## Related documentation

- [Overview](../../README.md) - module landing page with the quick-start
- [Sections](../../user-docs/Sections.md) - top-level container reference
- [Groups](../../user-docs/Groups.md) - group layout and ordering
- [Inputs](../../user-docs/Inputs.md) - input types and the descriptor model
- [Solvers](../../user-docs/Solvers.md) - solver expressions and the editor panel
- [Solver Expression Walkthrough](../../user-docs/Solver-Expression-Walkthrough.md) - tutorial through the solver editor
