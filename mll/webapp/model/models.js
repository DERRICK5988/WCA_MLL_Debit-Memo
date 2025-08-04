sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ui/unified/library",
],
    function (JSONModel, Device, unifiedLibrary) {
        "use strict";

        var CalendarDayType = unifiedLibrary.CalendarDayType;
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
            /**
             * Define default content for credit memo model during initial load
             * @returns {sap.ui.model.json.JSONModel} The credit memo model.
             */
            createDebitMemoModel: function () {
                debugger;
                var s4Base = window.location.hostname.includes("pro697a8440") ? "my404517" : // Production
                    window.location.hostname.includes("pro774184b2") ? "my403692" : // Quality
                        "my403379"; // Dev as default
                return new JSONModel({
                    bSelected: false,
                    bValidate: false,
                    bActualCustomerExist: false,
                    bCreditMemoExist: false,
                    bCancelEnabled: false,
                    bWizValidation: true,
                    iSelectedStepIndex: 0,
                    bStepBtnVisible: false,
                    sBillingDocLink: `https://${s4Base}.s4hana.cloud.sap/ui#BillingDocument-manage&/object/display/`,
                    sDebitMemoLink: `https://${s4Base}.s4hana.cloud.sap/ui#DebitMemoRequest-display?$basicSearch=&DebitMemoRequest=`,
                    sCreditMemoLink: `https://${s4Base}.s4hana.cloud.sap/ui#CreditMemoRequest-display?$basicSearch=&CreditMemoRequest=`,
                    aCreditMemoHdrWiz: { aCreditMemoItm: [] },
                    Items: [],
                    legendItems: [
						{
							text: this.getResourceBundle().getText("PartialCancel"),
                            color: "#dd6100"
						},
                    ]
                });
            },
            /**
             * Capture the table columns defined in the view
             * @returns {Object}  Metadatahelper.
             */
            createMetadataHelper: function () {
                var oTable = this.byId("idDebitMemoTable");
                return oTable.getColumns().map((oColumn, iIndex) => ({
                    key: this.getView().getLocalId(oColumn.getId()) || oColumn.getId(),
                    label: oColumn.getLabel()?.getText() || "",
                    index: iIndex
                }));
            }
        };

    });