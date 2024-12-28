sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "../controller/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/comp/filterbar/FilterBar",
    "sap/ui/comp/filterbar/FilterGroupItem",
    "sap/ui/core/message/Message",
    "sap/ui/core/Fragment",
    "sap/m/SearchField",
    "sap/m/ColumnListItem",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/p13n/Engine",
    "sap/m/p13n/MetadataHelper",
    "sap/m/p13n/SelectionController",
    "../model/models",
], function (Controller, History, JSONModel, formatter, Filter, FilterOperator, FilterBar, FilterGroupItem, Message, Fragment, SearchField, ColumnListItem, Input, Label, Engine, MetadataHelper, SelectionController, models) {
    "use strict";

    return Controller.extend("mll.controller.BaseController", {
        formatter: formatter,
        /**
         * Convenience method for accessing the router in every controller of the application.
         * @public
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Convenience method for getting the view model by name in every controller of the application.
         * @public
         * @param {string} sName the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model in every controller of the application.
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Convenience method for getting the resource bundle.
         * @public
         * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },
        /**
         * Event handler for navigating back.
         * It there is a history entry we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the list route.
         * @public
         */
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();

            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("list", {}, true);
            }
        },
        /**
         * Reuseable function and share across all controller
         * Value help config is defined in ValueHelpModel.json
         * Data access logic is included to filter data which has no permission
         * @param:	{object} oInput 
         *      	{object} oSetValConfig:  Set additional config on value help (master/ detail)
        * @public
        */
        loadValueHelpFragment: function (Object) {
            var oValueHelpModel = this.oValueHelpModel.getData()[Object.oInput.getName()],

                aCols = oValueHelpModel.aCols;
            Fragment.load({
                // name: [oResourceBundle.getText("fragmentPath"), "ValueHelpDialog"].join(""),
                name: "sycor.gap0160.fragments.ValueHelpDialog",
                controller: this
            }).then(function name(oFragment) {
                var oCol = aCols[1] || aCols[0];

                this.oValueHelpDialogue = oFragment;
                this.getView().addDependent(this.oValueHelpDialogue);
                this.oValueHelpDialogue.setTitle(this.getResourceBundle().getText(oValueHelpModel.sTitle));
                // this.oValueHelpDialogue.setKey(oCol.template.split(">")[1] || oCol.template);
                this.oValueHelpDialogue.setKey(aCols[0].template.split(">")[1] || aCols[0].template);
                this.oValueHelpDialogue.setDescriptionKey(
                    oCol.template.split(">")[1] || oCol.template
                );
                this.oValueHelpDialogue.setSupportMultiselect(Object.Config.bMulti);
                this.oValueHelpDialogue.setFilterBar(
                    new FilterBar({
                        advancedMode: false,
                        filterBarExpanded: true,
                        search: this._onFilterBarSearch.bind(this),
                        isRunningInValueHelpDialog: true,
                        showFilterConfiguration: false,
                        filterGroupItems: aCols.map(function (oColumn) {
                            return new FilterGroupItem({
                                groupName: "__$INTERNAL$",
                                name: oColumn.template,
                                label: oColumn.label,
                                visibleInFilterBar: true,
                                control: new Input({
                                    name: oColumn.template
                                })
                            });
                        }.bind(this)),
                        basicSearch: new SearchField({
                            showSearchButton: true,
                            width: "77%",
                            search: this._onFilterBarSearch.bind(this)
                        })
                    })
                );
                // this.oValueHelpDialogue.setSupportRanges(true);
                // if (oSetValConfig.bSupRange) {
                //     this.oValueHelpDialogue.setSupportRanges(oSetValConfig.bSupRange);
                //     this.oValueHelpDialogue.setRangeKeyFields([{
                //         label: "Code",
                //         key: "code",
                //         type: "string"
                //     }]);
                //     this.oValueHelpDialogue.setIncludeRangeOperations([ValueHelpRangeOperation.EQ], "string");
                // }
                var oBindingInfo = {
                    path: oValueHelpModel.EntitySet,
                    filters: [],
                    suspended: oValueHelpModel.bSuspend,
                    events: {
                        dataReceived: function () {
                            this.oValueHelpDialogue.update();
                        }.bind(this)
                    }
                };
                this.oValueHelpDialogue.getTableAsync().then(function (oTable) {
                    oTable.setEnableSelectAll(true);
                    oTable.setModel(new JSONModel({
                        cols: aCols
                    }), "columns");
                    if (oTable.bindRows) {
                        // Bind rows to the ODataModel and add columns
                        oTable.bindAggregation("rows", oBindingInfo);
                    }
                    if (oTable.bindItems) {
                        oTable.bindAggregation("items", oBindingInfo, function () {
                            return new ColumnListItem({
                                cells: aCols.map(function (column) {
                                    return new Label({
                                        text: "{" + column.template + "}"
                                    });
                                })
                            });
                        });
                    }
                    this.oValueHelpDialogue.update();
                }.bind(this));
                if (Object.Config.bMulti) {
                    this.oValueHelpDialogue.setTokens(this._oInput.getTokens());
                }
                this.oValueHelpDialogue.open();
            }.bind(this));
        },

        /**
         * Fetch project resources
         * @param {Object} Json model property for read request
         * @public
         */
        fetchResources: function (Object) {
            // @ts-ignore
            return new Promise(
                function (resolve, reject) {
                    Object.oModel.read(Object.sPath, {
                        filters: Object.aFilters,
                        sorters: Object.aSort,
                        urlParameters: Object.oParams,
                        // @ts-ignore
                        success: function (oData, oResponse) {
                            resolve(oData);
                        }.bind(this),
                        error: function (error) {
                            reject(error);
                        }.bind(this)
                    });
                }.bind(this));
        },
        /**
         * Create
         * @param {Object} Json model property for create request
         * @public
         */
        createRec: function (object) {
            return new Promise(function (resolve, reject) {
                object.oModel.create(object.sKey, object.oPayload, {
                    success: function (oResp) {
                        resolve(oResp);
                    }.bind(this),
                    error: function (oErr) {
                        reject(oErr);
                    }.bind(this)
                })
            }.bind(this));
        },
        /**
         * Copy
         * @param {Object} Json model property for update request
         * @public
         */
        updateRec: function (object) {
            return new Promise(function (resolve, reject) {
                object.oModel.update(object.sKey, object.oPayload, {
                    success: function (oResp) {
                        resolve(oResp);
                    }.bind(this),
                    error: function (oErr) {
                        reject(oErr);
                    }.bind(this)
                })
            }.bind(this));
        },
        /**
         * Update
         * @param {object} Json model property for update request
         * @public
         */
        updateRes: function (object) {
            object.oModel.update(object.sKey, object.oPayload, object.mParameters);
        },
        deleteRec: function (object) {
            // @ts-ignore
            return new Promise(function (resolve, reject) {
                object.oModel.remove(object.sKey, {
                    success: function (oResp) {
                        resolve(oResp);
                    }.bind(this),
                    error: function (oErr) {
                        reject(oErr);
                    }.bind(this)
                })
            }.bind(this));
        },
        batchChange: function (object) {
            return new Promise(function (resolve, reject) {
                object.oModel.submitChanges(Object.assign(object.mParameters, {
                    success: function (oResp, o) {
                        object.oModel.setUseBatch(false);
                        resolve(oResp);
                    }.bind(this),
                    error: function (oErr) {
                        object.oModel.setUseBatch(false);
                        reject(oErr);
                    }.bind(this)
                }));
            }.bind(this))
        },
        handleFilterClear: function (oEvent) {
            var oSource = oEvent.getSource(),
                aFilterGroupItems = oSource.getAggregation("filterGroupItems"),
                aClear = Object.keys(this.oValueHelpModel.getData());
            for (var index in aClear) {
                if (!aFilterGroupItems.find(o => o.getName() === aClear[index])) continue;
                var oFilterBar = aFilterGroupItems.find(o => o.getName() === aClear[index]).getControl();
                //Value help
                if (this.oValueHelpModel.getData()[aClear[index]].isValueHelp) {
                    oFilterBar.removeAllTokens();
                }
                //Dropdown
                if (this.oValueHelpModel.getData()[aClear[index]].isComboBox) {
                    oFilterBar.removeAllSelectedItems();
                }
                //Checkbox
                // if (this.oValueHelpModel.getData()[aClear[index]].isCheckBox) {
                //     oFilterBar.setSelected(false);
                // }
                // Input
                if (this.oValueHelpModel.getData()[aClear[index]].isInput) {
                    oFilterBar.setValue(null);
                }
            }
        },
        /**
         * Refresh csrf token
         * @param {Object} Dynamic model
         * @returns {Promise} The promisified csrf token
         * @private
         */
        fetchCsrfToken: function (oModel) {

            return new Promise((resolve, reject) => {
                try {
                    oModel.refreshSecurityToken(function (oResp) {
                        resolve(oModel.getSecurityToken());
                    }.bind(this));
                } catch (oError) {
                    oModel.setProperty("/busy", false);
                    reject(oError);
                }
            })
        },
        setEntityProp: function (object) {
            return object.oModel.find(o => o.name === object.sEntitySet).property.reduce((a, o) => {
                if (o.type === "Edm.DateTimeOffset") {
                    a[o.name] = null;
                } else if (o.type === "Edm.Boolean") {
                    a[o.name] = false;
                } else {
                    a[o.name] = "";
                }
                return a;
            }, {})
        },
        getEntityMetadata: function (object) {
            return object.oModel.find(o => o.name === object.sEntitySet).property;
        },

        loadDialog: function(sFragmentName, sBtnId) {
            var oView = this.getView();
            return Fragment.load({
                id: oView.getId(),
                name: "mll.fragments." + sFragmentName,
                controller: this
            }).then(function (oDialog) {
                if (sFragmentName === "DebitMemoMenu") {
                    oDialog.openBy(oView.byId(sBtnId));
                };
                if (sFragmentName === "DebitMemoWizard") {
                    oDialog.attachAfterOpen(this.onDialogAfterOpen, this);
                };
                oDialog.setModel(this.getModel("DebitMemo"), "DebitMemo")
                oView.addDependent(oDialog);
                return oDialog;
            }.bind(this));
        },
        registerForP13nDetail: function(sId) {
            var oTable = this.byId(sId);
            this.oMetadataHelper = new MetadataHelper(models.createMetadataHelper("DebitMemoPersonalization").map((o, i) => Object.assign(o, { label: this.getResourceBundle().getText(o.label) })));

            Engine.getInstance().register(oTable, {
				helper: this.oMetadataHelper,
				controller: {
					Columns: new SelectionController({
						targetAggregation: "columns",
						control: oTable
					})
				}
			});
            Engine.getInstance().attachStateChange(this.handleStateChange.bind(this, sId));
        },
        handleStateChange: function(sId, oEvt) {
			var oTable = this.byId(sId);
			var oState = oEvt.getParameter("state");
            var aMetadataHelper = models.createMetadataHelper("DebitMemoPersonalization");

			oTable.getColumns().forEach(function(oColumn){
				oColumn.setVisible(false);
			}.bind(this));

			oState.Columns.forEach(function(oProp, iIndex){
				var oCol = this.byId(oProp.key);
				oCol.setVisible(true);
			}.bind(this));

			// oTable.getBinding("rows");
		},
		_getKey: function(oControl) {
			return this.getView().getLocalId(oControl.getId());
		},
    
        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Trigger from onValueHelpRequested event
         * @private
         */
        _onFilterBarSearch: function () {
            var oFilterBar = this.oValueHelpDialogue.getFilterBar();
            var sSearchQuery = oFilterBar.getBasicSearchValue();
            var aFilterItems = oFilterBar.getFilterGroupItems();
            var aBasicFilters = [];
            var aFilters = [];

            aFilterItems.map(function (oItem) {
                if (sSearchQuery) {
                    aBasicFilters.push(
                        // new Filter((oItem.getName().includes(">")) ? oItem.getName().split(">")[1] : oItem.getName(), FilterOperator.Contains, sSearchQuery)
                        new Filter(oItem.getName().split(">")[1] || oItem.getName(), FilterOperator.Contains, sSearchQuery)
                    );
                }
                if (oItem.getControl().getValue()) {
                    aFilters.push(
                        new Filter(oItem.getName().split(">")[1] || oItem.getName(), FilterOperator.Contains, oItem.getControl().getValue())

                    );
                }
            }.bind(this));
            if (aBasicFilters.length > 0) {
                aFilters.push(
                    new Filter({
                        filters: aBasicFilters,
                        and: false
                    })
                );
            }
            this.oValueHelpDialogue.getTableAsync().then(function (oTable) {
                if (oTable.getBinding("items")) {
                    oTable.getBinding("items").filter(aFilters);
                    if (oTable.getBinding("items").bSuspended) {
                        oTable.getBinding("items").resume();
                    }
                } else {
                    oTable.getBinding("rows").filter(aFilters);
                    if (oTable.getBinding("rows").bSuspended) {
                        oTable.getBinding("rows").resume();
                    }
                }
                this.oValueHelpDialogue.update();
            }.bind(this));
        },
        /**
         * @param {Object} Object to add for message manager
         * @public
         */
        addMessageManager: function (Object) {
            var oMessage = new Message({
                message: Object.description,
                description: Object.description,
                type: Object.type,
                target: "/messagePath",
                processor: null
            });
            sap.ui.getCore().getMessageManager().addMessages(oMessage);
        }
    });

});