import BaseComponent from "sap/ui/core/UIComponent";
import MetadataService from "./controller/MetadataService";
import { createDeviceModel } from "./model/models";

/**
 * @namespace mll
 */
export default class Component extends BaseComponent {

    private _oMetadataService: MetadataService;

	public static metadata = {
		manifest: "json",
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ]
	};

	public init() : void {
		// call the base component's init function
		super.init();

        // set the device model
        this.setModel(createDeviceModel(), "device");

        // enable routing
        this.getRouter().initialize();

        // Initialize the MetadataService
        this._oMetadataService = new MetadataService(this);
	}

    /**
     * The component is destroyed by UI5 automatically.
     * In this method, the _oMetadataService is destroyed.
     * @public
     * @override
     */
    public destroy(): void {
        if (this._oMetadataService) {
            this._oMetadataService.destroy();
        }

        // Call the base component's destroy function
        super.destroy();
    }
}