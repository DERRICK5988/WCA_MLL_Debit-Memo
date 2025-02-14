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
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            this.oBusyDialog = new BusyDialog();
            this.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "Message");
            sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            this.setModel(models.createDebitMemoModel(), "DebitMemo");
            this.byId("idDebitMemoFilterBar").getAggregation("filterGroupItems").map(function (oGroupItems) {
                if (oGroupItems.getControl().mProperties.showValueHelp) {
                    this.getView().byId(oGroupItems.getControl().getId()).addValidator(this._onMultiInputValidate);
                }
            }.bind(this));
            // this.getModel("DebitMemo").attachPropertyChange("/aCreditMemoHdrWiz/aCreditMemoHdrWizItem", this._handleWizItemChanged, this);
            this.oValueHelpModel = this.getOwnerComponent().getModel("ValueHelpConfig");
            this.DmrMetadataExtention = this.getModel("DmrMetadataExtention");
            // this.getRouter().getRoute("DebitMemo").attachPatternMatched(this._onDebitMemoMatched, this);
            this.getView().addEventDelegate({
                onAfterRendering: function (oEvent) {
                    this.registerForP13nDetail.call(this, "idDebitMemoTable");
                }.bind(this)
            });
        },
        onExit: function () {
            sap.ui.getCore().getMessageManager().removeAllMessages();
            // this.getRouter().getRoute("DebitMemo").detachPatternMatched(this._onDebitMemoMatched, this);
        },
        /**
         * Event handler when press clear button to clear input fields/dropdown/checkbox/Input
         * @public
         */
        onClear: function (oEvent) {
            this.handleFilterClear(oEvent);
        },
        openPersoDialog: function (oEvt, sId) {
            var oTable = this.byId(sId);

            Engine.getInstance().show(oTable, ["Columns"], {
                contentHeight: "35rem",
                contentWidth: "32rem",
                source: oEvt.getSource()
            });
        },
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
            // if (sAction === "Cancel")
            // MessageBox["warning"](this.getResourceBundle().getText("CancelDmrConfirmation"), {
            //     actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            //     onClose: function (oAction) {
            //         if (oAction === MessageBox.Action.YES) {
            //             var oDebitMemoModel = this.getModel("DebitMemo");
            //             sap.ui.getCore().getMessageManager().removeAllMessages();
            //         }
            //     }.bind(this)
            // });
            // oDebitMemoModel.setProperty("/sAction", sAction);
            // Clear before set initial selected items
            // this.getModel("DebitMemo").setProperty("/aInitialSelection", []);
            // if (sAction === "Edit" || sAction === "Copy") {
            var oDmr = this._returnSelectedItem("idDebitMemoTable");
            // if (oDmr.bDiffDmr) {
            //     MessageBox.error(this.getResourceBundle().getText("MsgOneDoc"));
            //     return;
            // }
            oDebitMemoModel.setProperty("/aInitialSelection", JSON.parse(JSON.stringify(oDmr.aSelectedItems)));
            // if (sAction === "Copy") {
            //     oDmr.aSelectedItems.forEach(function (oItems) {
            //         oItems.BillingDocumentDateItem = formatter.addMonth(oItems.BillingDocumentDateItem, 1);
            //     });
            // }

            oDebitMemoModel.setProperty("/aSelectedItems", oDmr.aSelectedItems);
            oDebitMemoModel.setProperty("/aCreditMemoHdrWiz", {
                ...oDebitMemoModel.getProperty("/aCreditMemoHdrWiz"),
                ...oDmr.aSelectedItems[0],
                ...{ CreditMemoRequestType: "CR", bSelected: false }
            });
            oDebitMemoModel.setProperty("/aCreditMemoHdrWiz/aCreditMemoItm", oDmr.aSelectedItems);

            // } 
            // else if (sAction === "Create") {
            //     oDebitMemoModel.setProperty("/aCreditMemoHdrWiz", {
            //         SalesOrganization: "1010", DistributionChannel: "11", OrganizationDivision: "00", SalesOffice: "1010", SalesGroup: "0001",
            //         aCreditMemoItm: []
            //     });
            // } else if (sAction === "DelItem" || sAction === "DelHeader") {
            //     oDebitMemoModel.setProperty("/sAction", sAction);
            //     oDebitMemoModel.setProperty("/aSelectedItems", (sAction) === "DelItem" ? this._returnSelectedItem().aSelectedItems : this._returnSelectedItem().aSelectedHdr);
            // }
            this.loadDialog.call(this, sFragmentName).then(function (oDialog) { oDialog.open(); });
        },
        onDialogAfterOpen: function () {
            this._oWizard = this.byId("idDebitMemoHeaderWizard");
            this._iSelectedStepIndex = 0;
            this._oSelectedStep = this._oWizard.getSteps()[this._iSelectedStepIndex];

            // this.handleButtonsVisibility();
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
         * Event handler when exit/close value help
         * @public
         */
        onValueHelpAfterClose: function (oEvent) {
            oEvent.getSource().destroy();
        },
        onDmrRowSelected: function (oEvent) {
            this.getModel("DebitMemo").setProperty("/bSelected", oEvent.getSource().getSelectedIndices().length > 0);
            this.getModel("DebitMemo").setProperty("/bValidate", !this._returnSelectedItem("idDebitMemoTable").bDiff);
        },
        onCreditMemoRowSelected: function (oEvent) {
            this.getModel("DebitMemo").setProperty("/aCreditMemoHdrWiz/bSelected", oEvent.getSource().getSelectedIndices().length > 0);
        },
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
            await this._fetchDebitMemoPreBilling({ "debitMemo": { aFilters: aFilters }, oModel: this.getModel("YY1_V_BILLINGDOC_DMR_CDS") });
            // await this._fetchDebitMemoPreBilling({ "debitMemo": { aFilters: aFilters, oParams: { threshold: 200 } }, oModel: this.getModel("YY1_V_BILLINGDOC_DMR_CDS") });
        },
        OnPressMenu: function (oEvent, sFragmentName, sId) {
            this.loadDialog.call(this, sFragmentName, sId)
        },
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
        onMessagesButtonPress: function (oEvent) {
            debugger;
            // var oMessagesButton = oEvent.getSource();
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
        onPressWizItemBtn: function (oEvent, aCreditMemoHdrWiz, sBtn, sFragmentName) {
            var oDebitMemoModel = this.getModel("DebitMemo"),
                oTable = this.byId("idCreditMemoItemTable");
            // oDmrEntity = { ...Object.assign(this.setEntityProp({ oModel: this.getModel("DebitMemoMetadata"), sEntitySet: 'DebitMemoRequest' }), { DebitMemoRequest: aCreditMemoHdrWiz.DebitMemoRequest }) },
            // aDmrProperties = this.getModel("DebitMemoMetadata").find(o => o.name === "DebitMemoRequest").property,
            // sAction = oDebitMemoModel.getProperty("/sAction");

            if (sBtn === "Add") {
                // if (sAction === "Edit" || sAction === "Copy") {
                //     if (aCreditMemoHdrWiz.aCreditMemoItm.length > 0) {
                //         var oDmrItemLastLine = JSON.parse(JSON.stringify({ ...aCreditMemoHdrWiz.aCreditMemoItm[+aCreditMemoHdrWiz.aCreditMemoItm.length - 1] }));
                //         oDebitMemoModel.getProperty("/aCopyLine").forEach(sProperty => {
                //             if (oDmrItemLastLine[sProperty] && aDmrProperties.find(o => o.name === sProperty).type === "Edm.DateTime") {
                //                 /* Increment month and last day of the month for copy and edit*/
                //                 oDmrEntity[sProperty] = formatter.addMonth(new Date(oDmrItemLastLine[sProperty]), 1, true);
                //             } else {
                //                 oDmrEntity[sProperty] = formatter.validateType(oDmrItemLastLine[sProperty], aDmrProperties.find(o => o.name === sProperty).type)
                //             }
                //         })
                //     }
                // }
                // aCreditMemoHdrWiz.aCreditMemoItm.push(Object.assign(oDmrEntity, { RequestedQuantity: (oDmrEntity.RequestedQuantity > 0) ? oDmrEntity.RequestedQuantity : 0, AutoFill: false, bLineExist: false }));
            } else if (sBtn === "Forecast") {
                // this.loadDialog.call(this, sFragmentName).then(function (oDialog) { oDialog.open(); });
            } else if (sBtn === "Reset") {
                aCreditMemoHdrWiz.aCreditMemoItm = this.getModel("DebitMemo").getProperty("/aInitialSelection").map(item => {
                    return Object.fromEntries(
                        Object.entries(item).map(([key, value]) => {
                            return key.includes("Date") && (value) ? [key, new Date(value)] : [key, value];
                        })
                    );
                });
            } else if (sBtn === "Delete") {
                // --aCreditMemoHdrWiz.aCreditMemoItm.length 
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
            // If any service rendered date larger than current year/ month then enabled
            if (aCreditMemoHdrWiz.aCreditMemoItm.length > 0) {
                // this._validateBtnEnabled(aCreditMemoHdrWiz.aCreditMemoItm);
            }
            oDebitMemoModel.refresh(true);
        },
        // onPressForeCastYes: function (oEvent, oDebitMemo, sId) {
        //     oDebitMemo.aCreditMemoHdrWiz.aCreditMemoItm.map(function (o) {
        //         var oMonthYear = { month: o.ServiceRendredDateItem.getMonth(), year: o.ServiceRendredDateItem.getFullYear() };
        //         var currentMonthYear = { month: new Date().getMonth(), year: new Date().getFullYear() };
        //         if (oMonthYear.year > currentMonthYear.year || (oMonthYear.year === currentMonthYear.year && oMonthYear.month > currentMonthYear.month)) {
        //             o = Object.assign(o, oDebitMemo.oForecast);
        //         }
        //     })
        //     this.getModel("DebitMemo").refresh(true);
        //     this.byId(sId).destroy();
        // },
        handleWizardSave: async function (oEvent, oCreditMemoWiz) {
            debugger;
            var object = { oPayload: {} };
            // oPayload = {},
            // aDmrProperties = this.getModel("CreditMemoMetadata").find(o => o.name === "A_CreditMemoRequestType").property;
            sap.ui.getCore().getMessageManager().removeAllMessages();
            object.oModel = this.getModel("API_CREDIT_MEMO_REQUEST_SRV");
            // this.getModel("DMR").setUseBatch(false);
            // if (this.getModel("DebitMemo").getProperty("/sAction") === "Create") {

            this.oBusyDialog.setText(this.getResourceBundle().getText("CreatingDmrMsg")).open();
            // object.sKey = (oCreditMemoWiz.aCreditMemoItm.length > 0) ? "/DebitMemoRequest" : "/DebitMemoRequestHeader"
            object.sEntity = "/A_CreditMemoRequest";
            try {
                // this.getModel("DmrMetadataExtention").getData().filter(o => o.createPayload && o.isHeader).forEach(function (oDmrMetadaExt) {
                //     object.oPayload = { ...object.oPayload, ...{ [oDmrMetadaExt.property]: formatter.validateType(oCreditMemoWiz[oDmrMetadaExt.property], aDmrProperties.find(o => o.name === oDmrMetadaExt.property).type) } };
                // }.bind(this))
                var { BillingDocument, YY1_LABID_BDI } = oCreditMemoWiz.aCreditMemoItm[0];
                object.oPayload = {
                    "CreditMemoRequestType": oCreditMemoWiz.CreditMemoRequestType,
                    "SalesOrganization": oCreditMemoWiz.SalesOrganization,
                    "DistributionChannel": oCreditMemoWiz.DistributionChannel,
                    "OrganizationDivision": oCreditMemoWiz.Division,
                    "SoldToParty": oCreditMemoWiz.SoldToParty,
                    "PurchaseOrderByCustomer": BillingDocument && YY1_LABID_BDI ? `${BillingDocument}_${YY1_LABID_BDI}` : BillingDocument,
                    // "ReferenceSDDocument": "1234578012321",
                    "to_Item": []
                }
                if (oCreditMemoWiz.aCreditMemoItm.length > 0) {
                    oCreditMemoWiz.aCreditMemoItm.forEach(function (oItem) {
                        object.oPayload.to_Item.push({
                            "CreditMemoRequestItem": oItem.BillingDocumentItem,
                            "Material": oItem.Product,
                            "RequestedQuantity": oItem.BillingQuantity,
                            "RequestedQuantityUnit": oItem.BillingQuantityUnit,
                            "NetAmount": oItem.NetAmount.toString(),
                            "TransactionCurrency": oItem.TransactionCurrency,
                            "YY1_LABID_SDI": oItem.YY1_LABID_BDI
                        });
                    }.bind(this));
                }
                await this.createRec(object).then(async function (oResponse) {
                    debugger;
                    // if (oResponse.Success) {
                    //     MessageBox.success(oResponse.Message);
                    //     this.handleCloseDialog({}, "idDebitMemoWizard")
                    // }
                    // MessageBox.success("Create Memo Request: " + oResponse.CreditMemoRequest + " is created");
                    this.getModel("DebitMemo").setProperty("/bStepBtnVisible", false);
                    // this.getModel("DebitMemo").setProperty("/aCreditMemoHdrWiz", { aCreditMemoItm: [] });
                    this.getModel("DebitMemo").refresh(true);
                    this.oBusyDialog.close();
                    this._pressMessagePopUp()
                }.bind(this)).catch(function (oError) {
                    // debugger;
                    this.getModel("Message").getData().map(o => Object.assign(o, {
                        // description: `Status code: ${o.technicalDetails.statusCode}: ${JSON.parse(oError.responseText).error.message.value}`
                        description: `Status code: ${o.technicalDetails.statusCode} - ${oError.responseText}`
                    }));
                    // this.getModel("Message").setProperty("/");
                    this.oBusyDialog.close();
                    this._pressMessagePopUp()
                }.bind(this))
            } catch (error) {
                MessageBox.error(error);
                this.oBusyDialog.close();
            }
            // }
        },
        onPressExportExcel: function (oEvent, aDebitMemo, sAction, sFragmentName) {
            this.getModel("DebitMemo").setProperty("/sAction", sAction);
            this.loadDialog.call(this, sFragmentName).then(function (oDialog) { oDialog.open(); });
        },
        // handleExcelDownload: async function (oEvent) {
        //     var oDebitMemo = this.getModel("DebitMemo"),
        //         oExcel = oDebitMemo.getProperty("/oExcel"),
        //         aFilters = [],
        //         aResource;

        //     if (!oExcel.lowDebitMemoRequest && !oExcel.highDebitMemoRequest && !oExcel.CreationStartDate && !oExcel.CreationEndDate) {
        //         MessageBox["warning"](this.getResourceBundle().getText("ExcelMsgHeader"), {
        //             actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        //             onClose: async function (oAction) {
        //                 if (oAction === MessageBox.Action.YES) {
        //                     this.oBusyDialog.setText(this.getResourceBundle().getText("FetctDmrMsg")).open();
        //                     aResource = await this._fetchDebitMemoPreBilling({ "debitMemo": { aFilters: aFilters, oParams: { $top: 999999 } }, oModel: this.getModel("DMR") });
        //                     this._generateExcel(aResource);
        //                 } else {
        //                     this.oBusyDialog.close();
        //                 }
        //             }.bind(this)
        //         });
        //     } else {
        //         this.oBusyDialog.setText(this.getResourceBundle().getText("FetctDmrMsg")).open();
        //         if (oExcel.lowDebitMemoRequest && oExcel.highDebitMemoRequest) {
        //             aFilters.push(new Filter("DebitMemoRequest", FilterOperator.BT, oExcel.lowDebitMemoRequest, oExcel.highDebitMemoRequest));
        //         } else if (oExcel.lowDebitMemoRequest) {
        //             aFilters.push(new Filter("DebitMemoRequest", FilterOperator.EQ, oExcel.lowDebitMemoRequest));
        //         }
        //         if (oExcel.CreationStartDate && oExcel.CreationEndDate) {
        //             aFilters.push(new Filter("CreationDate", FilterOperator.BT, formatter.formatDate1(oExcel.CreationStartDate, "yyyy-MM-dd"), formatter.formatDate1(oExcel.CreationEndDate, "yyyy-MM-dd")));
        //         }
        //         aResource = await this._fetchDebitMemoPreBilling({ "debitMemo": { aFilters: aFilters }, oModel: this.getModel("DMR") });
        //         if (aResource.length === 0) {
        //             MessageBox.information(this.getResourceBundle().getText("ExcelNoDataFound"));
        //             this.oBusyDialog.close();
        //             return;
        //         }
        //         this._generateExcel(aResource);
        //     }
        // },
        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */
        // _onDebitMemoMatched: async function (oEvent) {
        //     this.getModel("appView").setProperty("/layout", "OneColumn");
        // },
        _fetchDebitMemoPreBilling: function (object) {
            return new Promise((resolve, reject) => {
                Promise.all(this._getResourcePath(object).map(resource => this.fetchResources.call(this, resource))).then(async function (oResp) {
                    var [aResource] = oResp.map(({ results }) => results);

                    // if (this.getModel("DebitMemo").getProperty("/sAction") && this.getModel("DebitMemo").getProperty("/sAction") === "DownloadExcel") {
                    //     resolve(aResource);
                    // } else {
                    //     resolve(this.getModel("DebitMemo").setProperty("/Items", aResource.map(o => Object.assign(o, { Status: "None", Message: "", bLineExist: o.DebitMemoRequestItem === "0" ? false : true }))));
                    //     this.getModel("DebitMemo").refresh(true);
                    // }
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
        _getResourcePath: function (Object) {
            return [{
                oModel: Object.oModel, sPath: "/YY1_V_BILLINGDOC_DMR",
                aFilters: Object["debitMemo"].aFilters || [],
                aSort: [new Sorter("BillingDocument", true), new Sorter("BillingDocumentItem", false)],
                oParams: Object["debitMemo"].oParams || {}
            }];
        },
        _generateExcel: function (aResource) {
            var oSettings, oSheet, sFormat = "yyyy-MM-dd";

            aResource = aResource.map(function (oItem) {
                return Object.assign(oItem, {
                    CustomerReferenceDate: formatter.formatDate1(oItem.CustomerReferenceDate, sFormat),
                    BillingDocumentDate: formatter.formatDate1(oItem.BillingDocumentDate, sFormat),
                    ServicesRenderedDate: formatter.formatDate1(oItem.ServicesRenderedDate, sFormat),
                    PricingDate: formatter.formatDate1(oItem.PricingDate, sFormat),
                    PricngDateItem: formatter.formatDate1(oItem.PricngDateItem, sFormat),
                    BillingDocumentDateItem: formatter.formatDate1(oItem.BillingDocumentDateItem, sFormat),
                    ServiceRendredDateItem: formatter.formatDate1(oItem.ServiceRendredDateItem, sFormat),
                    Autofill: "",
                    ProcessDetails: ""
                });
            }.bind(this));
            oSettings = {
                workbook: {
                    columns: this.getModel("DebitMemo").getProperty("/aExcelProperties").map(o => Object.assign(o, { type: EdmType.String })),
                    context: { sheetName: "DMR" }
                },
                // dataSource: oBinding,
                dataSource: aResource,
                fileName: "DMR Template.xlsx",
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    MessageToast.show(this.getResourceBundle().getText("CompleteExport"));
                }).finally(function () {
                    oSheet.destroy();
                });
        },
        onDmrDeletion: async function (oEvent, aSelectedItem) {
            this.oBusyDialog.setText(this.getResourceBundle().getText("DeletingMsg")).open();
            var object = {};

            object.oModel = this.getModel("DMR");
            this.getModel("DMR").setUseBatch(false);
            object.mParameters = {
                // groupId: "BatchQuery",
                // method: "DELETE",
                // headers: {
                //     "X-CSRF-Token": await this._fetchCsrfToken.call(this, object.oModel)
                // }
            };
            var promise = Promise.resolve();
            aSelectedItem.forEach(function (oItem) {
                promise = promise.then(function () {
                    if (this.getModel("DebitMemo").getProperty("/sAction") === "DelHeader") {
                        object.sKey = object.oModel.createKey("/DebitMemoRequestFull", {
                            DebitMemoRequest: oItem.DebitMemoRequest, DebitMemoRequestItem: "0"
                        });
                    } else {
                        object.sKey = object.oModel.createKey("/DebitMemoRequest", {
                            DebitMemoRequest: oItem.DebitMemoRequest, DebitMemoRequestItem: oItem.DebitMemoRequestItem
                        });
                    }
                    return this.deleteRec.call(this, object).then(function (oResp) {
                        // Message manager only contain error
                        this.addMessageManager({ description: JSON.stringify({ Success: oResp.Success, Message: oResp.Message }), type: sap.ui.core.MessageType.Success });
                        return Promise.resolve(oResp);
                    }.bind(this)).catch(function (oError) {
                        return Promise.resolve();
                    }.bind(this));
                }.bind(this));
            }.bind(this));

            promise.then(async function (oResp) {
                this.getModel("DebitMemo").getProperty("/aSelectedItems").map(oItem => {
                    var aMessageData = this.getModel("Message").getData();
                    if (this.getModel("DebitMemo").getProperty("/sAction") === "DelHeader") {
                        var oMessage = JSON.parse(aMessageData[0].description)
                        oMessage = aMessageData.map(o => JSON.parse(o.description)).find(o => o.Success ? o.Message.match(/\d+/g)[0] === oItem.DebitMemoRequest : o.Message.match(/Debit Memo Request: (\d+)/)[1] === oItem.DebitMemoRequest);
                    } else {
                        oMessage = aMessageData.map(o => JSON.parse(o.description)).find(o => o.Success ? o.Message.match(/\d+/g)[0] === oItem.DebitMemoRequest && o.Message.match(/\d+/g)[1] === oItem.DebitMemoRequestItem : o.Message.match(/Debit Memo Request: (\d+)/)[1] === oItem.DebitMemoRequest && o.Success ? o.Message.match(/\d+/g)[1] : o.Message.match(/Debit Memo Request Item: (\d+)/)[1] === oItem.DebitMemoRequestItem);
                    }
                    oItem = Object.assign(oItem, { Message: oMessage.Message, Status: oMessage.Success ? "Success" : "Error" });
                })
                // if consist of success deletion then refresh data
                if (this.getModel("DebitMemo").getProperty("/aSelectedItems").some(o => o.Status === "Success")) {
                    await this.onSearch();
                }
                this.getModel("DebitMemo").setProperty("/oDeletion/bVisible", false);
                this.oBusyDialog.close();
                this.getModel("DebitMemo").refresh(true);
            }.bind(this));
        },
        // onNavSmart: function (oEvent) {
        //     debugger;
        //     this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
        //     this.getModel("appView").setProperty("/layout", "EndColumnFullScreen");
        //     this.getRouter().navTo("SmartTable", {}, !Device.system.phone);
        //     debugger;
        // },
        handleCloseDialog: function (oEvent, sId) {
            // Reset
            this.getModel("DebitMemo").setProperty("/oDeletion/bVisible", true);
            this.getModel("DebitMemo").setProperty("/sAction", "")
            this.getModel("DebitMemo").setProperty("/aSelectedItems", [])
            this.getModel("DebitMemo").refresh(true);
            this.byId("idDebitMemoTable").clearSelection();
            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.byId(sId).destroy();
        },
        onWizardCancel: function (oEvent, sId, DebitMemo) {
            MessageBox["warning"](this.getResourceBundle().getText("CancelWiz"), {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        this._oWizard.discardProgress(this._oWizard.getSteps()[0]);
                        // Reset
                        DebitMemo.bStepBtnVisible = false;
                        DebitMemo.aCreditMemoHdrWiz = { aCreditMemoItm: [] };
                        this.handleCloseDialog(oEvent, sId);
                    }
                }.bind(this)
            });
        },
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
        _getCopyPayload: function (object) {
            var oPayload = {};
            this.getModel("DmrMetadataExtention").getData().filter(o => o.copyPayload).forEach(function (oDmrMetadaExt) {
                if (oDmrMetadaExt.property === "NetAmount") {
                    var nAmount = formatter.validateType(object.oItem[oDmrMetadaExt.property], object.aDmrProperties.find(o => o.name === oDmrMetadaExt.property).type);
                    /*  */
                    nAmount = (object.oItem["RequestedQuantity"] > 0) ? +nAmount / +object.oItem["RequestedQuantity"] : +nAmount;
                    Object.assign(oPayload,
                        {
                            // [oDmrMetadaExt.property]: +object.oItem[oDmrMetadaExt.property] > 0 ? formatter.validateType(object.oItem[oDmrMetadaExt.property], object.aDmrProperties.find(o => o.name === oDmrMetadaExt.property).type) : ""
                            [oDmrMetadaExt.property]: +nAmount > 0 ? nAmount : ""
                        });
                } else {
                    Object.assign(oPayload,
                        {
                            [oDmrMetadaExt.property]: formatter.validateType(object.oItem[oDmrMetadaExt.property], object.aDmrProperties.find(o => o.name === oDmrMetadaExt.property).type)
                        });
                }
            }.bind(this));
            return oPayload;
        },
        _updateRec: function (object) {
            return this.updateRec.call(this, object).then(function (oResp) {
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
        _handleWizItemChanged: function (oEvent) {
            var oContext = oEvent.getParameter("context");
            // Enable forecast button by verifying ServiceRendredDateItem > current year/ month
            if (oEvent.getParameters().path === "ServiceRendredDateItem") {
                var oModelContent = oContext.oModel.getProperty(oContext.sPath);
                oContext.oModel.setProperty("/oForecast/bEnabled", oModelContent.ServiceRendredDateItem && +(oModelContent.ServiceRendredDateItem.getFullYear() + "" + oModelContent.ServiceRendredDateItem.getMonth() + 1) > +(new Date().getFullYear() + "" + new Date().getMonth() + 1) ? true : false)
            }
        },
        _validateBtnEnabled: function (aItems) {
            this.getModel("DebitMemo").setProperty("/oForecast/bEnabled", aItems.some(o =>
                o.ServiceRendredDateItem &&
                +(o.ServiceRendredDateItem.getFullYear() + "" + ((o.ServiceRendredDateItem.getMonth() + 1).toString().padStart(2, '0') + 1)) > +(new Date().getFullYear() + "" + ((new Date().getMonth() + 1).toString().padStart(2, '0') + 1))
            ))
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
        _pressMessagePopUp: function () {
            setTimeout(function () {
                this.onMessagesButtonPress();
            }.bind(this), 100);
        }
    });
});