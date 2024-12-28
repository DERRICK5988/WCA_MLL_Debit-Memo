sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },
        createDebitMemoModel: function () {
            return new JSONModel({
                // bEditable: false,
                // bSelected: false,
                // iSelectedStepIndex: 0,
                // bStepBtnVisible: false,
                sBillingLink: (window.location.origin.includes("sycorcustomdevelopmenttest")) ? "https://my312750.s4hana.ondemand.com/ui#PrelimBillingDocument-displayFactSheet" : "https://my313406.s4hana.ondemand.com/ui#PrelimBillingDocument-displayFactSheet",
                Items: []
            });
        },
    };

});