import { CancellationToken, Location, Position, TestController, TestItem, TestMessage, TestRun, TestRunRequest, Uri } from "vscode";
import { Result, Test, runOdinTest } from "./run_odin";
import { getTestID } from "./find_tests";
import { assert } from "console";

const messageRegex = /^(.+)\((\d+):(\d+)\):\s*(.+)/;

function hanldeSingleTest(run: TestRun, workspace: Uri, testItem: TestItem, test: Test) {
    switch (test.result) {

        case Result.Success:
            run.passed(testItem);
            break;

        case Result.Failure:
            let messages: TestMessage[] = [];

            if (test.output) {
                // try to parse error messages
                for (const line of test.output.split("\n")) {
                    const match = messageRegex.exec(line);
                    if (match) {
                        const uri = Uri.file(match[1]);
                        const position = new Position(parseInt(match[2]) - 1, parseInt(match[3]));
                        const location = new Location(uri, position);

                        messages.push(new TestMessage(match[4]));
                        run.appendOutput(match[4], location, testItem);
                    } else {
                        run.appendOutput(line, undefined, testItem);
                    }
                }
            }

            run.failed(testItem, messages);
            break;
    }
}

export function runTestHandler(
    controller: TestController,
    request: TestRunRequest, token: CancellationToken
) {
    console.log("running tests");

    const run = controller.createTestRun(request);

    // get all the tests to run
    let itemsList;
    if (request.include) {
        itemsList = request.include;
    } else {
        itemsList = controller.items;
    }
    let items: TestItem[] = [];
    itemsList.forEach(item => {
        if (item.parent === undefined) {
            item.children.forEach(item => items.push(item));
        }
        else {
            items.push(item);
        }
    });

    // split the included tests up into workspaces
    const workspaces = new Map<Uri, TestItem[]>();
    items.forEach(test => {
        assert(test.parent !== undefined);

        const workspace = test.uri!;
        if (!workspaces.has(workspace)) {
            workspaces.set(workspace, []);
        }

        workspaces.get(workspace)!.push(test);
    });

    console.debug(`running ${items.length} tests in ${workspaces.size} workspaces`);

    // run the tests
    for (const [workspace, tests] of workspaces) {
        if (token.isCancellationRequested) { return; }

        const packages = runOdinTest(workspace);
        if (!packages) { continue; }

        // map all the package's tests to test items
        // and mark their results
        for (const pkg of packages) {
            for (const test of pkg.tests) {

                const testItem = tests.find(testItem => {
                    return getTestID(workspace, pkg, test) === testItem.id;
                });
                if (!testItem) { continue; }

                hanldeSingleTest(run, workspace, testItem, test);
            }
        }
    }

    run.end();
}