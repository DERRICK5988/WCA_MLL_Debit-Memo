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
		 * @alias dksh.connectclientrejbackorder.controller.MetadataService
		 */
		constructor: function (oComponent) {
			this._oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
			this._oComponent = oComponent;
			// this._oComponent.getModel().metadataLoaded().then(this._onPlanCustProjMetadataLoaded.bind(this));
			// this._oComponent.getModel("DMR").metadataLoaded().then(this._onDebitMemoMetadataLoaded.bind(this));
		},

		/**
		 * Prepare any metadata service before render to controller/view
		 * @param {sap.ui.base.Event} The parsed metadata object
		 * @private
		 */
		// _onPlanCustProjMetadataLoaded: function (oEvent) {
		// 	this._oComponent.setModel(this._oComponent.getModel().getServiceMetadata().dataServices.schema[0].entityType, "PlanCustProjMetadata");
		// },

		/**
		 * Prepare any metadata service before render to controller/view
		 * @param {sap.ui.base.Event} The parsed metadata object
		 * @private
		 */
		// _onDebitMemoMetadataLoaded: function() {
		// 	this._oComponent.setModel(this._oComponent.getModel("DMR").getServiceMetadata().dataServices.schema[0].entityType, "DebitMemoMetadata");
		// }
	});
});