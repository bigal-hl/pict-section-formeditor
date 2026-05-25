// Application Code for the Form Editor playground.
//
// `Base` is the synthesized PictApplication wrapper that registers the
// FormEditor view from your Pict Config (under `FormEditorViewConfig`).
// The view edits the pict-section-form manifest sitting at
// `AppData.FormConfig` — change the manifest in the "Initial AppData"
// tab and click Run to see the editor reload with the new shape.
//
// The FormEditor view internally manages its own preview Pict instance
// for the live form-preview tab, so the playground host only needs to
// boot a single Pict + register the view.  Return a class that extends
// `Base` to customize lifecycle hooks or register additional views.
//
return class extends Base
{
	onAfterInitialize()
	{
		super.onAfterInitialize();
		console.log('[playground] Initial FormConfig =', this.pict.AppData.FormConfig);
	}
};
