sap.ui.define([
    "./BaseController",
    "../model/models",
    "sap/ui/model/Sorter",
    "sap/m/BusyDialog",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/MessagePopover",
    "sap/m/MessagePopoverItem",
    "sap/ui/export/library",
    "sap/ui/export/Spreadsheet",
    "../controller/formatter",
    "sap/m/p13n/Engine",
    "sap/m/Token",
    "sap/ui/Device",
], (BaseController, models, Sorter, BusyDialog, Filter, FilterOperator, MessageToast, MessageBox, MessagePopover, MessagePopoverItem, exportLibrary, Spreadsheet, formatter, Engine, Token, Device) => {
    "use strict";

    return BaseController.extend("mll.controller.DebitMemo", {
        formatter: formatter,
        onInit: function () {
            debugger;
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            this.oBusyDialog = new BusyDialog();
            this.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "Message");
            sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            this.setModel(models.createDebitMemoModel.call(this), "DebitMemo");
            this.byId("idDebitMemoFilterBar").getAggregation("filterGroupItems").map(function (oGroupItems) {
                if (oGroupItems.getControl().mProperties.showValueHelp) {
                    this.getView().byId(oGroupItems.getControl().getId()).addValidator(this._onMultiInputValidate);
                }
            }.bind(this));
            this.oValueHelpModel = this.getOwnerComponent().getModel("ValueHelpConfig");
            this.DmrMetadataExtention = this.getModel("DmrMetadataExtention");
            this.getView().addEventDelegate({
                onAfterRendering: function (oEvent) {
                    this.registerForP13nDetail.call(this, "idDebitMemoTable");
                }.bind(this)
            });
        },


        onExit: function () {
            sap.ui.getCore().getMessageManager().removeAllMessages();
        },

        /**
         * Event handler when press clear button to clear input fields/dropdown/checkbox/Input
         * @public
         */
        onClear: function (oEvent) {
            this.handleFilterClear(oEvent);
        },
        /**
         * @public
         */
        openPersoDialog: function (oEvt, sId) {
            var oTable = this.byId(sId);

            Engine.getInstance().show(oTable, ["Columns"], {
                contentHeight: "35rem",
                contentWidth: "32rem",
                source: oEvt.getSource(),
                panelConfig: {
                    Columns: {
                        enableSelectAll: true
                    }
                }
            });
        },
        /**
         * @public
         */
        onColumnMove: function (oEvt, sId) {
            var oTable = this.byId(sId);
            var oAffectedColumn = oEvt.getParameter("column");
            var iNewPos = oEvt.getParameter("newPos");
            var sKey = this._getKey(oAffectedColumn);
            oEvt.preventDefault();

            Engine.getInstance().retrieveState(oTable).then(function (oState) {
                var oCol = oState.Columns.find(function (oColumn) {
                    return oColumn.key === sKey;
                }) || { key: sKey };
                oCol.position = iNewPos;

                Engine.getInstance().applyState(oTable, { Columns: [oCol] });
            });
        },
        /**
         * Event handler when press clear button to clear input fields/dropdown/checkbox/Input
         * @public
         */
        onPressDmrMenu: function (oEvent, sAction, sFragmentName) {
            var oDebitMemoModel = this.getModel("DebitMemo");
            var oDmr = this._returnSelectedItem("idDebitMemoTable");

            oDmr.aSelectedItems = oDmr.aSelectedItems.map(o => ({
                ...o,
                BillingAmount: o.NetAmount,
                BillingQuantityCheck: o.BillingQuantity,
                NetAmountCheck: o.NetAmount,
                NetAmount: (Number(o.NetAmount) - Number(o.CancelledAmount)).toFixed(2)
            }));

            oDebitMemoModel.setProperty("/aInitialSelection", JSON.parse(JSON.stringify(oDmr.aSelectedItems)));
            oDebitMemoModel.setProperty("/aSelectedItems", oDmr.aSelectedItems);
            oDebitMemoModel.setProperty("/aCreditMemoHdrWiz", {
                ...oDebitMemoModel.getProperty("/aCreditMemoHdrWiz"),
                ...oDmr.aSelectedItems[0],
                ...{
                    NetAmount: oDmr.aSelectedItems[0].NetAmount - oDmr.aSelectedItems[0].CancelledAmount,
                    // This for display purpose, and not using this value to create credit memo
                    // Will use 'G2' as credit memo type for creation later since G2 is link with GSA and CR in config.
                    CreditMemoRequestType: navigator.language.startsWith('de') ? 'GSA' : 'CR',
                    bSelected: false
                }
            });
            oDebitMemoModel.setProperty("/aCreditMemoHdrWiz/aCreditMemoItm", oDmr.aSelectedItems);
            this.loadDialog.call(this, sFragmentName).then(function (oDialog) { oDialog.open(); });
        },
        onDialogAfterOpen: function () {
            this._oWizard = this.byId("idDebitMemoHeaderWizard");
            this._iSelectedStepIndex = 0;
            this._oSelectedStep = this._oWizard.getSteps()[this._iSelectedStepIndex];
        },
        onValueHelpRequested: function (oEvent, isMulti) {
            var oInput = oEvent.getSource();
            this._oInput = oInput;
            this.loadValueHelpFragment({ oInput: oInput, Config: { bMulti: isMulti, bSupRange: false } });
        },
        /**
         * Event handler when press ok button for value help
         * Set tokens into input field
         * @public
         */
        onValueHelpOkPress: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            if (aTokens.length > 0) {
                if (oEvent.getSource().getProperty("supportMultiselect")) {
                    this._oInput.setTokens(aTokens);
                } else {
                    this._oInput.setValue(aTokens[0].getKey());
                }
            }
            oEvent.getSource().close();
        },

        /**
         * Event handler when press cancel button for value help
         * @public
         */
        onValueHelpCancelPress: function (oEvent) {
            oEvent.getSource().close();
        },

        /**
         * Event handler when exit/close for value help
         * @public
         */
        onValueHelpAfterClose: function (oEvent) {
            oEvent.getSource().destroy();
        },

        /**
        * Event handler when debit memo row selected
        * This event is to validate if the row is valid to be cancelled
        * Only allow to select same billing doc [bCreditMemoExist]
        * Only allow to select billing is not cancel or partial cancel [bValidate]
        * Only allow to cancel invoice if actual customer is maintained [bActualCustomerExist]
        * Flag bSelected when selected row
        * @public
        */
        onDebitMemoRowSelected: function (oEvent) {
            debugger;
            var oSelectedItem = this._returnSelectedItem("idDebitMemoTable"),
                bCancelEnabled = false,
                bCreditMemoExist = false,
                bActualCustomerExist = false;
            this.getModel("DebitMemo").setProperty("/bSelected", oEvent.getSource().getSelectedIndices().length > 0);
            this.getModel("DebitMemo").setProperty("/bValidate", !oSelectedItem.bDiff);
            bCancelEnabled = !oSelectedItem.bDiff;

            for (const { CreditMemoRequest, CancelledAmount, NetAmount, YY1_ActualCustomer_BDI } of oSelectedItem.aSelectedItems) {
                // Disable cancel button if credit memo (cancelled invoiced) found or actual customer is not maintained in billing doc.
                bCancelEnabled = !(CreditMemoRequest && CancelledAmount === NetAmount && CancelledAmount > 0 || !YY1_ActualCustomer_BDI);
                this.getModel("DebitMemo").setProperty("/bCreditMemoExist", !!CreditMemoRequest);
                this.getModel("DebitMemo").setProperty("/bActualCustomerExist", !!YY1_ActualCustomer_BDI);
                // Break the loop if found any error
                if (!bCancelEnabled) {
                    break;
                }
            }
            this.getModel("DebitMemo").setProperty("/bCancelEnabled", bCancelEnabled);
        },

        /**
        * Event handler when credit memo is selected
        * Flag bSelected to control 
        * @public
        */
        onCreditMemoRowSelected: function (oEvent) {
            this.getModel("DebitMemo").setProperty("/aCreditMemoHdrWiz/bSelected", oEvent.getSource().getSelectedIndices().length > 0);
        },

        /**
        * Event handler when click go button to search debit memo
        * @public
        */
        onSearch: async function (oEvent) {
            var aFilterGroupItems = this.byId("idDebitMemoFilterBar").getAggregation("filterGroupItems"),
                aKeys = Object.keys(this.oValueHelpModel.getData()),
                aFilters = [];

            for (var index in aFilterGroupItems) {
                var oFilterGroupItems = aFilterGroupItems[index];
                if (!aKeys.includes(oFilterGroupItems.getName())) {
                    continue;
                }
                var oValueHelp = this.oValueHelpModel.getData()[oFilterGroupItems.getName()];
                if (oValueHelp.isValueHelp && oFilterGroupItems.getControl().getTokens().length > 0) {
                    oFilterGroupItems.getControl().getTokens().map(function (oTokens) {
                        aFilters.push(new Filter(oValueHelp.sFilter, oValueHelp.FilterOperator, oTokens.getKey()));
                    });
                    continue;
                }
                if (oValueHelp.isComboBox && oFilterGroupItems.getControl().getSelectedKeys().length > 0) {
                    oFilterGroupItems.getControl().getSelectedKeys().map(function (sValue) {
                        aFilters.push(new Filter(oValueHelp.sFilter, oValueHelp.FilterOperator, sValue));
                    });
                }
                if (oValueHelp.isCheckBox) {
                }
                if (oValueHelp.isDate) {
                    var dDateValue = oFilterGroupItems.getControl().getDateValue(),
                        dSecondDateValue = oFilterGroupItems.getControl().getSecondDateValue();

                    if (!dDateValue && !dSecondDateValue) {
                        continue;
                    }
                    aFilters.push(new Filter(oValueHelp.sFilter, oValueHelp.FilterOperator,
                        this.formatter.formatDate1(dDateValue, "yyyy-MM-dd'T'HH:mm:ss"),
                        this.formatter.formatDate1(dSecondDateValue, "yyyy-MM-dd'T'HH:mm:ss")
                    ));
                }
            }
            this.oBusyDialog.setText(this.getResourceBundle().getText("FetctDmrMsg")).open();
            await this._fetchDebitMemoPreBilling({ "debitMemo": { aFilters: aFilters, oParams: { "$top": 2000 } }, oModel: this.getModel("YY1_V_BILLINGDOC_DMR_CDS") });
            // await this._fetchDebitMemoPreBilling({ "debitMemo": { aFilters: aFilters, oParams: { threshold: 200 } }, oModel: this.getModel("YY1_V_BILLINGDOC_DMR_CDS") });
        },
        // OnPressMenu: function (oEvent, sFragmentName, sId) {
        //     this.loadDialog.call(this, sFragmentName, sId)
        // },

        /**
        * Event handler when input value help to display suggestion item in DebitMemo.view.xml
        * @param {oEvent} sap.ui.base.Event 
        * @public
        */
        onSuggest: function (oEvent) {
            var sTerm = oEvent.getParameter("suggestValue");
            var aFilters = [];
            var aSorters = [];

            if (sTerm) {
                aFilters.push(new Filter(this.oValueHelpModel.getData()[oEvent.getSource().getName()].sKey, FilterOperator.Contains, sTerm));
                if (this.oValueHelpModel.getData()[oEvent.getSource().getName()].sDescription) {
                    aFilters.push(new Filter(this.oValueHelpModel.getData()[oEvent.getSource().getName()].sDescription, FilterOperator.Contains, sTerm));
                }
            }
            oEvent.getSource().getBinding("suggestionItems").filter(new Filter({ filters: aFilters, and: false }));
            oEvent.getSource().setFilterSuggests(false);
        },

        /**
        * Event handler when input expand message pop up below in DebitMemoWizard.fragment.xml
        * @param {oEvent} sap.ui.base.Event 
        * @public
        */
        onMessagesButtonPress: function (oEvent) {
            var oMessagesButton = this.getView().byId("idMessagePopOver");
            this._messagePopover = new MessagePopover({
                items: {
                    path: "Message>/",
                    template: new MessagePopoverItem({
                        description: "{Message>description}",
                        type: "{Message>type}",
                        title: "{Message>message}"
                    })
                }
            });
            oMessagesButton.addDependent(this._messagePopover);
            this._messagePopover.toggle(oMessagesButton);
        },

        /**
        * Event handler when click reset or delete button in DebitMemoWizard.fragment.xml
        * Reset/ Delete the credit memo item
        * @param {oEvent} sap.ui.base.Event 
        * @param {aCreditMemoHdrWiz} From DebitMemo Model
        * @param {sBtn} Identical action. 'Reset' or 'Delete'
        * @public
        */
        onPressWizItemBtn: function (oEvent, aCreditMemoHdrWiz, sBtn, sFragmentName) {
            var oDebitMemoModel = this.getModel("DebitMemo"),
                oTable = this.byId("idCreditMemoItemTable");

            if (sBtn === "Reset") {
                aCreditMemoHdrWiz.aCreditMemoItm = this.getModel("DebitMemo").getProperty("/aInitialSelection").map(item => {
                    return Object.fromEntries(
                        Object.entries(item).map(([key, value]) => {
                            return key.includes("Date") && (value) ? [key, new Date(value)] : [key, value];
                        })
                    );
                });
            } else if (sBtn === "Delete") {
                var aIndices = oTable.getSelectedIndices().sort((a, b) => b - a);
                var aItems = oDebitMemoModel.getProperty("/aCreditMemoHdrWiz/aCreditMemoItm");

                aIndices.forEach((i) => {
                    if (i >= 0 && i < aItems.length) {
                        aItems.splice(i, 1);
                    }
                });
                oDebitMemoModel.setProperty("/aCreditMemoHdrWiz/aCreditMemoItm", aItems);
                oTable.clearSelection();
            }
            oDebitMemoModel.refresh(true);
        },
        /**
        * Event and buttons from DebitMemoWizard.fragment
        * Save credit memo to cancel billing document
        * @param {oEvent} sap.ui.base.Event 
        * @param {oCreditMemoWiz} From DebitMemo Model
        * @public
        */
        handleWizardSave: async function (oEvent, oCreditMemoWiz) {
            var object = { oPayload: {} };

            // Remove all message before process
            sap.ui.getCore().getMessageManager().removeAllMessages();
            object.oModel = this.getModel("API_CREDIT_MEMO_REQUEST_SRV");
            this.oBusyDialog.setText(this.getResourceBundle().getText("CreatingDmrMsg")).open();
            object.sEntity = "/A_CreditMemoRequest";
            // Additional fields YY1_PATIENT_ID_BDI, YY1_PATIENT_BIRTH_DATE_BDI, YY1_LABID_SDI need to populate as these field need to be displayed
            // other form development in MLL
            var { BillingDocument, YY1_LABID_BDI, YY1_PATIENT_BIRTH_DATE_BDI, YY1_PATIENT_ID_BDI, YY1_PATIENT_NAME_BDI, YY1_Abrechnungsweg_SDH } = oCreditMemoWiz.aCreditMemoItm[0];
            try {
                debugger;
                object.oPayload = {
                    // Usingq 'G2' because G2 is link with GSA and CR in config and language dependency.
                    "CreditMemoRequestType": 'G2',
                    // "CreditMemoRequestType": oCreditMemoWiz.CreditMemoRequestType,
                    "SalesOrganization": oCreditMemoWiz.SalesOrganization,
                    "DistributionChannel": oCreditMemoWiz.DistributionChannel,
                    "OrganizationDivision": oCreditMemoWiz.Division,
                    "SoldToParty": oCreditMemoWiz.YY1_ActualCustomer_BDI,
                    "PurchaseOrderByCustomer": BillingDocument && YY1_LABID_BDI ? `${BillingDocument}_${YY1_LABID_BDI}` : BillingDocument,
                    "YY1_PATIENT_ID_SDH": YY1_PATIENT_ID_BDI,
                    "YY1_PATIENT_NAME_SDH": YY1_PATIENT_NAME_BDI,
                    // "YY1_PATIENT_BIRTH_DATE_SDH": this.formatter.formatDate1(YY1_PATIENT_BIRTH_DATE_BDI, "yyyy-MM-dd'T'HH:mm:ss") || null,
                    "YY1_PATIENT_BIRTH_DATE_SDH": !!YY1_PATIENT_BIRTH_DATE_BDI
                        ? this.formatter.formatDate1(YY1_PATIENT_BIRTH_DATE_BDI, "yyyy-MM-dd'T'HH:mm:ss") : null,
                    "YY1_LABID_SDH": YY1_LABID_BDI,
                    "to_Item": []
                }
                if (oCreditMemoWiz.aCreditMemoItm.length > 0) {
                    oCreditMemoWiz.aCreditMemoItm.forEach(function (oItem) {
                        object.oPayload.to_Item.push({
                            "Material": oItem.Product,
                            "RequestedQuantity": oItem.BillingQuantity,
                            "RequestedQuantityUnit": oItem.BillingQuantityUnit,
                            "TransactionCurrency": oItem.TransactionCurrency,
                            "YY1_LABID_SDI": oItem.YY1_LABID_BDI,
                            "YY1_CancelledDocRef_SDI": oItem.BillingDocument.padStart(10, '0'),
                            "YY1_CancelledRefItem_SDI": oItem.BillingDocumentItem,
                            // "YY1_DiagnosisCertainty_BDI": oItem.YY1_DiagnosisCertainty_BDI,
                            "YY1_ICDCODE_SDI": oItem.YY1_ICDCODE_BDI,
                            "ProfitCenter": oItem.ProfitCenter,
                            // "YY1_Abrechnungsweg_SDI": oItem.YY1_Abrechnungsweg_BDI,
                            // Netmount field is not able to update with API so use pricing element to update net amount
                            "to_PricingElement": [{
                                "PricingProcedureStep": "20",
                                "PricingProcedureCounter": "0",
                                "ConditionType": "PPR0",
                                "ConditionRateValue": (oItem.NetAmount).toString(),
                                "ConditionCurrency": oItem.TransactionCurrency,
                                "ConditionQuantity": oItem.BillingQuantity
                            }]
                        });
                    }.bind(this));
                }
                await this.createRec(object).then(async function (oResponse) {
                    this.getModel("DebitMemo").setProperty("/bStepBtnVisible", false);
                    this.getModel("DebitMemo").setProperty("/aCreditMemoHdrWiz", { aCreditMemoItm: [] });
                    this.oBusyDialog.close();
                    await this.onSearch();
                    this.getModel("DebitMemo").refresh(true);
                    this._pressMessagePopUp()
                }.bind(this)).catch(function (oError) {
                    this.getModel("Message").getData().map(o => Object.assign(o, {
                        description: `Status code: ${o.technicalDetails.statusCode} - ${oError.responseText}`
                    }));
                    this.oBusyDialog.close();
                    this._pressMessagePopUp()
                }.bind(this))
            } catch (error) {
                MessageBox.error(error);
                this.oBusyDialog.close();
            }
        },
        /**
        * Event and buttons from DebitMemoWizard.fragment
        * @param {oEvent} sap.ui.base.Event 
        * @param {sId} id = idDebitMemoWizard
        * @param {DebitMemo} From DebitMemo Model
        * @public
        */
        onCloseDialog: function (oEvent, sId, DebitMemo) {
            this.handleCloseDialog.call(this, oEvent, sId, DebitMemo);
        },
        /**
        * Reusable function to close for wizard dialog
        * @param {oEvent} sap.ui.base.Event 
        * @param {sId} id = idDebitMemoWizard
        * @param {DebitMemo} Object - DebitMemo Model
        * @public
        */
        handleCloseDialog: function (oEvent, sId, DebitMemo) {
            // Reset before close dialog
            this._oWizard.discardProgress(this._oWizard.getSteps()[0]);
            DebitMemo.bStepBtnVisible = false;
            DebitMemo.bWizValidation = true;
            DebitMemo.aCreditMemoHdrWiz = { aCreditMemoItm: [] };
            DebitMemo.aSelectedItems = [];
            // this.getModel("DebitMemo").setProperty("/aSelectedItems", [])
            this.getModel("DebitMemo").refresh(true);
            this.byId("idDebitMemoTable").clearSelection();
            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.byId(sId).destroy();
        },
        /**
        * Event and button to cancel for wizard dialog
        * @param {oEvent} sap.ui.base.Event 
        * @param {sId} string id = idDebitMemoWizard
        * @param {DebitMemo} Object - DebitMemo Model
        * @public
        */
        onWizardCancel: function (oEvent, sId, DebitMemo) {
            MessageBox["warning"](this.getResourceBundle().getText("CancelWiz"), {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        // Close and Reset model
                        this.handleCloseDialog.call(this, oEvent, sId, DebitMemo);
                    }
                }.bind(this)
            });
        },
        /**
        * Event and next button in DebitMemoWizard.fragment
        * @param {oEvent} sap.ui.base.Event
        * @public
        */
        onDialogNextButton: function (oEvent) {
            var steps = this._oWizard.getSteps();
            if (this._oSelectedStep && !this._oSelectedStep.bLast) {
                this._oWizard.goToStep(steps[++this._iSelectedStepIndex] || steps[steps.length - 1], true);
                this._oSelectedStep = steps[this._iSelectedStepIndex];
            } else {
                this._oWizard.nextStep();
            }
            this.getModel("DebitMemo").setProperty("/bStepBtnVisible", true);
        },
        /**
        * Event from DebitMemo.view
        * @param {oEvent} sap.ui.base.Event
        * @param {sFragmentName} string
        * @param {sId} string
        * @public
        */
        handleOpenLegend: function (oEvent, sFragmentName, sId) {
            this.loadDialog.call(this, sFragmentName, sId).then(function (oDialog) {
                if (oDialog.isOpen()) {
                    oDialog.close();
                } else {
                    oDialog.openBy(oEvent.getSource());
                }
            }.bind(this));
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
        * Function triggered from onSearch function to retrive Debit memo/ billing doc detail 
        * @param {object} sap.ui.base.Event 
        * @private
        */
        _fetchDebitMemoPreBilling: function (object) {
            return new Promise((resolve, reject) => {
                Promise.all(this._getResourcePath(object).map(resource => this.fetchResources.call(this, resource))).then(async function (oResp) {
                    var [aResource] = oResp.map(({ results }) => results);

                    resolve(this.getModel("DebitMemo").setProperty("/Items", aResource.map(o => Object.assign(o, { Status: "None", Message: "", bLineExist: o.DebitMemoRequestItem === "0" ? false : true }))));
                    this.getModel("DebitMemo").refresh(true);
                    this.oBusyDialog.close();
                }.bind(this)).catch(function (oErr) {
                    this.oBusyDialog.close();
                    MessageBox.error(oErr.message)
                    reject(oErr);
                }.bind(this));
            });
        },
        /**
        * Function to comsolidate service param/ URI/ sort/ filtering for odata service
        * @private
        */
        _getResourcePath: function (Object) {
            return [{
                oModel: Object.oModel, sPath: "/YY1_V_BILLINGDOC_DMR",
                aFilters: Object["debitMemo"].aFilters || [],
                aSort: [new Sorter("BillingDocument", true), new Sorter("BillingDocumentItem", false)],
                oParams: Object["debitMemo"].oParams || {}
            }];
        },
        /**
        * Function for odata service post
        * Function from BaseController
        * @private
        */
        _createRec: function (object) {
            return this.createRec.call(this, object).then(function (oResp) {
                // Message manager only contain error
                var oUpdateModel = this.getModel("DebitMemo").getProperty("/aSelectedItems").find(o => o.DebitMemoRequest === object.oItem.DebitMemoRequest && o.DebitMemoRequestItem === object.oItem.DebitMemoRequestItem);
                oUpdateModel.Status = "Success";
                this.addMessageManager({ description: oResp.Message, type: sap.ui.core.MessageType.Success });
                return Promise.resolve(oResp);
            }.bind(this)).catch(function (oError) {
                var oUpdateModel = this.getModel("DebitMemo").getProperty("/aSelectedItems").find(o => o.DebitMemoRequest === object.oItem.DebitMemoRequest && o.DebitMemoRequestItem === object.oItem.DebitMemoRequestItem);
                oUpdateModel.Status = "Error";
                return Promise.resolve();
            }.bind(this));
        },
        /**
        * Function to validate selected item/row of billing item
        * @private
        */
        _returnSelectedItem: function (sTableID) {
            var oTable = this.byId(sTableID),
                aSelectedIndices = oTable.getSelectedIndices(),
                aDiffBillDoc = aSelectedIndices.map(index => oTable.getContextByIndex(index)).map(o => o.getObject().BillingDocument).filter((value, index, self) => self.indexOf(value) === index),
                aSelectedItems = aSelectedIndices.map(index => oTable.getContextByIndex(index)).map(o => Object.assign(oTable.getModel("DebitMemo").getProperty(o.sPath), { Status: "None", Message: "" })),
                aSelectedHdr = aSelectedItems.reduce((accumulator, item) => {
                    if (!accumulator.some(uniqueItem => uniqueItem.BillingDocument === item.BillingDocument)) {
                        accumulator.push(item);
                    }
                    return accumulator;
                }, []);

            aSelectedItems = aSelectedItems.map(o => Object.assign(o, { Status: "None", Message: "" }));
            // this._validateBtnEnabled(aSelectedItems);
            return { bDiff: aDiffBillDoc.length > 1 ? true : false, aSelectedHdr: aSelectedHdr, aSelectedItems: aSelectedItems }
        },
        /**
        * @private
        */
        _onMultiInputValidate: function (oEvent) {
            var oToken = new Token();
            oToken.setKey(oEvent.text);
            oToken.setText(oEvent.text);
            return oToken;
        },
        /**
        * @private
        */
        _pressMessagePopUp: function () {
            setTimeout(function () {
                this.onMessagesButtonPress();
            }.bind(this), 100);
        }
    });
});