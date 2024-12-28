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
        addMonth: function (vDate, increment, bLastDayMth) {
            if (!vDate) {
                return null;
            }
            var dDate = vDate;
            if (bLastDayMth) {
                var nextMonth = new Date(dDate.getFullYear(), dDate.getMonth() + 1, 1);
                dDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
            } else {
                dDate = new Date(dDate.setMonth(dDate.getMonth() + increment));
            }
            return dDate;
        },
        validateType: function (Value, type) {
            if (type === "Edm.DateTime") {
                Value = (Value) ? new Date(new Date(Value).setHours(8, 0, 0, 0)) : null;
            } else if (type === "Edm.Decimal") {
                Value = (Value > 0) ? Value : "";
            } else if (type === "Edm.String") {
                Value = Value || "";
            } else {
                Value = Value;
            }
            return Value;
        }
    };
});