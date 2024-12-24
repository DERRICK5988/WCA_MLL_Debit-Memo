import ResourceBundle from "sap/base/i18n/ResourceBundle";
import UI5Object from "sap/ui/base/Object";
import UIComponent from "sap/ui/core/UIComponent";

export default class MetadataService extends UI5Object {

    /**
     * @class
     * @param {UIComponent} oComponent - Reference to the app's component
     * @public
     */
    constructor(oComponent: UIComponent) {
        super();
        this._oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
        this._oComponent = oComponent;

        // // Ensuring metadataLoaded promises are resolved
        this._oComponent.getModel()?.metadataLoaded().then(this._onCdsMetadataLoad.bind(this));
    }

    /**
     * Prepare metadata service before rendering to controller/view
     * @param {Event} oEvent - The parsed metadata object
     * @private
     */
    private _onCdsMetadataLoad(oEvent: Event): void {
        const serviceMetadata = this._oComponent.getModel()?.getServiceMetadata();
        if (serviceMetadata) {
            const entityType = serviceMetadata.dataServices.schema[0].entityType;
            this._oComponent.setModel(entityType, "BillingDocMetadata");
        }
    }

    /**
     * Prepare metadata service before rendering to controller/view
     * @private
     */
    // private _onDebitMemoMetadataLoaded(): void {
    //     const serviceMetadata = this._oComponent.getModel("DMR")?.getServiceMetadata();
    //     if (serviceMetadata) {
    //         const entityType = serviceMetadata.dataServices.schema[0].entityType;
    //         this._oComponent.setModel(entityType, "DebitMemoMetadata");
    //     }
    // }
}
