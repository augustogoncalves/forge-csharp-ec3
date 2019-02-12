// *******************************************
// My Awesome Extension
// *******************************************
function EC3Extension(viewer, options) {
    this.panel = null;
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

EC3Extension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
EC3Extension.prototype.constructor = EC3Extension;

EC3Extension.prototype.load = function () {
    if (this.viewer.toolbar) {
        // Toolbar is already available, create the UI
        this.createUI();
    } else {
        // Toolbar hasn't been created yet, wait until we get notification of its creation
        this.onToolbarCreatedBinded = this.onToolbarCreated.bind(this);
        this.viewer.addEventListener(av.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
    }
    return true;
};

EC3Extension.prototype.onToolbarCreated = function () {
    this.viewer.removeEventListener(av.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
    this.onToolbarCreatedBinded = null;
    this.createUI();
};

EC3Extension.prototype.createUI = function () {
    var viewer = this.viewer;
    var panel = this.panel;

    // export
    var exportButton = new Autodesk.Viewing.UI.Button('ec3export');
    exportButton.onClick = function (e) {
        ec3export();
    };
    exportButton.addClass('ec3exportToolbarButton');
    exportButton.setToolTip('Send data to Building Transparency');

    // import
    var importButton = new Autodesk.Viewing.UI.Button('ec3import');
    importButton.onClick = function (e) {
        ec3import();
    };
    importButton.addClass('ec3importToolbarButton');
    importButton.setToolTip('Show data from Building Transparency');

    // properties
    var propertiesButton = new Autodesk.Viewing.UI.Button('ec3properties');
    propertiesButton.onClick = function (e) {
        // check if the panel is created or not
        if (panel == null) {
            panel = new EC3PropertiesPanel(viewer, viewer.container, 'modelSummaryPanel', 'Building Transparency');
        }
        // show/hide docking panel
        panel.setVisible(!panel.isVisible());

        // if panel is NOT visible, exit the function
        if (!panel.isVisible()) return;
        // ok, it's visible, let's get the summary!
    };
    propertiesButton.addClass('ec3propertiesToolbarButton');
    propertiesButton.setToolTip('Building Transparency Properties');
    viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, function (e) {
        if (panel) {
            panel.removeAllProperties();
            if (e.dbIdArray.length == 0) return;
            if (values == undefined) return;
            var v = values[e.dbIdArray[0]];
            panel.addProperty(
                /*name*/     'Conservative',
                /*value*/    v.gwpc,
                /*category*/ 'GWP');

            panel.addProperty(
                    /*name*/     'Achievable',
                    /*value*/    v.gwpa,
                    /*category*/ 'GWP');
        }
    })

    // SubToolbar
    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup('ec3integration');
    this.subToolbar.addControl(exportButton);
    this.subToolbar.addControl(importButton);
    this.subToolbar.addControl(propertiesButton);

    viewer.toolbar.addControl(this.subToolbar);
};

EC3Extension.prototype.unload = function () {
    this.viewer.toolbar.removeControl(this.subToolbar);
    return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension('EC3Extension', EC3Extension);

// *******************************************
// Model Summary Panel
// *******************************************
function EC3PropertiesPanel(viewer, container, id, title, options) {
    this.viewer = viewer;
    Autodesk.Viewing.UI.PropertyPanel.call(this, container, id, title, options);
}
EC3PropertiesPanel.prototype = Object.create(Autodesk.Viewing.UI.PropertyPanel.prototype);
EC3PropertiesPanel.prototype.constructor = EC3PropertiesPanel;