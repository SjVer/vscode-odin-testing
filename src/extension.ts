import { ExtensionContext, TestRunProfileKind, tests, workspace } from 'vscode';
import { loadOdinPath } from './odin_path';
import { discoverWorkspaceTests } from './find_tests';
import { runTestHandler } from './run_test';

export function activate(ctx: ExtensionContext) {
	console.log("extension activated");

	if (!loadOdinPath()) { return; }

	const ctrl = tests.createTestController('odinTests', 'Odin Tests');

	// handle finding tests
	ctrl.resolveHandler = async item => {
		if (!item) {
			discoverWorkspaceTests(ctrl);
		}
	};

	// handle changes
	workspace.onDidChangeTextDocument(_ => discoverWorkspaceTests(ctrl));

	// handle running tests
	const runProfile = ctrl.createRunProfile(
		'Run', TestRunProfileKind.Run,
		async (request, token) => runTestHandler(ctrl, request, token)
	);

	ctx.subscriptions.push(ctrl);
}

export function deactivate() { }
