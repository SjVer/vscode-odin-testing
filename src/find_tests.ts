import { TestController, Uri, workspace } from "vscode";
import { Package, Test, runOdinTest } from "./run_odin";

export function getPackageID(workspaceFolder: Uri, pkg: Package) {
    return workspaceFolder.toString() + ":" + pkg.name;
}

export function getTestID(workspaceFolder: Uri, pkg: Package, test: Test) {
    return getPackageID(workspaceFolder, pkg) + "." + test.name;
}

export async function discoverWorkspaceTests(controller: TestController) {
    if (!workspace.workspaceFolders) {
        return; // handle the case of no open folders
    }

    workspace.workspaceFolders.forEach(async workspaceFolder => {
        const tests = runOdinTest(workspaceFolder.uri);
        if (!tests) { return; }

        tests.forEach(pkg => {
            const uri = workspaceFolder.uri;

            const id = getPackageID(workspaceFolder.uri, pkg);
            const pkgItem = controller.createTestItem(id, pkg.name, uri);

            pkg.tests.forEach(test => {
                const id = getTestID(workspaceFolder.uri, pkg, test);
                const testItem = controller.createTestItem(id, test.name, uri);

                pkgItem.children.add(testItem);
            });

            controller.items.add(pkgItem);
        });
    });
}