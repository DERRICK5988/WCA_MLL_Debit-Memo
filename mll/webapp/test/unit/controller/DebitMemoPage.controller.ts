/*global QUnit*/
import Controller from "mll/controller/DebitMemo.controller";

QUnit.module("DebitMemo Controller");

QUnit.test("I should test the DebitMemo controller", function (assert: Assert) {
	const oAppController = new Controller("DebitMemo");
	oAppController.onInit();
	assert.ok(oAppController);
});