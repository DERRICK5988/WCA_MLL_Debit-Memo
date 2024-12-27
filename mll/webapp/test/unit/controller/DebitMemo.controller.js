/*global QUnit*/

sap.ui.define([
	"mll/controller/DebitMemo.controller"
], function (Controller) {
	"use strict";

	QUnit.module("DebitMemo Controller");

	QUnit.test("I should test the DebitMemo controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
