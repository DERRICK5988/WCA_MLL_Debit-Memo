sap.ui.define(["sap/ui/core/format/DateFormat", "sap/ui/core/format/NumberFormat"
], function (DateFormat, NumberFormat) {
    "use strict";

    return {
        /**
        * Format date
        * @public
        * @param {string} sFormat: date pattern, e.g ddMMyyyy
        * @returns {string} formatted date
        */
        returnDataFormat: function (sFormat) {
            return DateFormat.getDateInstance({
                pattern: sFormat
            });
        },
        /**
        * Format date
        * @public
        * @param {string} sDate: Incoming date
        */
        formatDate: function (sDate) {
            if (sDate) {
                var date = new Date(parseInt(sDate.substr(6)));
                var oDateFormat = DateFormat.getDateInstance({
                    pattern: "dd.MM.yyyy"
                });
                return oDateFormat.format(date);
            }
            return "";
        },
        /**
        * Format date
        * @public
        * @param {string} sDate: Incoming date
        * * @param {string} sFormat: Incoming date pattern
        */
        formatDate1: function (sDate, sFormat) {
            if (sDate) {
                var date = new Date(sDate);
                var oDateFormat = DateFormat.getDateInstance({
                    // pattern: "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
                    pattern: sFormat
                });
                return oDateFormat.format(date);
            }
            return "";
        },
        typeFormatter: function (oMessage) {
            if (oMessage.some(o => o.type === "Error")) {
                return "Negative";
            } else {
                return "Success";
            }
        },
        checkAmount: function (sNetAmount, sNetAmountCheck, sCancelledAmount) {
            var isValid = (Number(sNetAmount) + Number(sCancelledAmount)) <= Number(sNetAmountCheck);
            this.getView().getModel("DebitMemo").setProperty("/bWizValidation", isValid);
            return isValid ? "None" : "Error";
        }
    };
});