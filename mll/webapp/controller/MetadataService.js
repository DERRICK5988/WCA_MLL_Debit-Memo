// @ts-nocheck
sap.ui.define([
	"sap/ui/base/Object"
], function (UI5Object) {
	"use strict";

	return UI5Object.extend("mll.controller.MetadataService", {

		/**
		 * @class
		 * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
		 * @public
		 */
		constructor: function (oComponent) {
			this._oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
			this._oComponent = oComponent;
			this._oComponent.getModel("API_CREDIT_MEMO_REQUEST_SRV").metadataLoaded().then(this._onCreditMemoMetadataLoaded.bind(this));
		},

		/**
		 * Prepare any metadata service before render to controller/view
		 * @param {sap.ui.base.Event} The parsed metadata object
		 * @private
		 */
		_onCreditMemoMetadataLoaded: function() {
			this._oComponent.setModel(this._oComponent.getModel("API_CREDIT_MEMO_REQUEST_SRV").getServiceMetadata().dataServices.schema[0].entityType, "CreditMemoMetadata");
		}
	});
});