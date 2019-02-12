// *******************************************
// My Awesome Extension
// *******************************************
function EC3Extension(viewer, options) {
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

    // SubToolbar
    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup('ec3integration');
    this.subToolbar.addControl(exportButton);
    this.subToolbar.addControl(importButton);

    viewer.toolbar.addControl(this.subToolbar);
};

EC3Extension.prototype.unload = function () {
    this.viewer.toolbar.removeControl(this.subToolbar);
    return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension('EC3Extension', EC3Extension);