sap.ui.define([
    "sap/ui/core/UIComponent",
    "mll/model/models",
    "./controller/MetadataService"
], (UIComponent, models, MetadataService) => {
    "use strict";

    return UIComponent.extend("mll.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

            // Initialize all metadata
            this._oMetadataService = new MetadataService(this);
        },

        /**
         * The component is destroyed by UI5 automatically.
         * In this method, the _oMetadataService are destroyed.
         * @public
         * @override
         */
        destroy: function () {
            this._oMetadataService.destroy();

            // call the base component's destroy function
            UIComponent.prototype.destroy.apply(this, arguments);
        }
    });
});