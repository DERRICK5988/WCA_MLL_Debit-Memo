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
                    bSelected: false,
                    bValidate: false,
                    bCreditMemoExist: false,
                    bWizValidation: true,
                    iSelectedStepIndex: 0,
                    bStepBtnVisible: false,
                    // Check environment
                    sBillingDocLink: (window.location.href.includes("env=dev")) ? "https://my403379.s4hana.cloud.sap/ui#BillingDocument-manage&/object/display/" : "https://my403692.s4hana.cloud.sap/ui#BillingDocument-manage&/object/display/",
                    sDebitMemoLink: (window.location.href.includes("env=dev")) ? "https://my403379.s4hana.cloud.sap/ui#DebitMemoRequest-display?$basicSearch=&DebitMemoRequest=" : "https://my403692.s4hana.cloud.sap/ui#DebitMemoRequest-display?$basicSearch=&DebitMemoRequest=",
                    sCreditMemoLink: (window.location.href.includes("env=dev")) ? "https://my403379.s4hana.cloud.sap/ui#CreditMemoRequest-display?$basicSearch=&CreditMemoRequest=" : "https://my403692.s4hana.cloud.sap/ui#CreditMemoRequest-display?$basicSearch=&CreditMemoRequest=",
                    aCreditMemoHdrWiz: { aCreditMemoItm: [] },
                    Items: []
                });
            },
            createMetadataHelper: function () {
                const oTable = this.byId("idDebitMemoTable");
                return oTable.getColumns().map((oColumn, iIndex) => ({
                    key: this.getView().getLocalId(oColumn.getId()) || oColumn.getId(),
                    label: oColumn.getLabel()?.getText() || "",
                    index: iIndex
                }));
            }
        };

    });