
import { spawnSync } from "child_process";
import { Uri } from "vscode";
import { odinPath } from "./odin_path";

export enum Result { Success, Failure }
export type Test = { name: string, output: string | undefined, result: Result };
export type Package = { name: string, tests: Test[] };

const odinArgs: string[] = [
    // "-error-pos-style:unix"
];

function execOdinTest(workspaceFolder: Uri): string | undefined {
    if (!odinPath) {
        console.warn("no odin path set");
        return;
    }

    try {
        const process = spawnSync(
            odinPath,
            ["test", workspaceFolder.fsPath].concat(odinArgs),
            { timeout: 3000, cwd: workspaceFolder.fsPath }
        );
        if (process.error) { throw process.error.message; }

        console.debug(`stdout: ${process.stdout}`);
        return process.stdout.toString();
    }
    catch (error) {
        console.error(`error executing \`${odinPath}\`: ${error}`);
    }
}

const packageRegex = /^\[Package\s*:\s*(\w+)\]$/;
const testRegex = /^\[Test\s*:\s*(\w+)\]$/;
const resultRegex = /^\[(\w+)\s*:\s*(\w+)\]$/;

function parseOdinTestOutput(output: string): Package[] | undefined {
    const lines = output.split("\n");
    let currentLine = 0;

    function parseResult(test: string): Result | undefined {
        const resultMatch = lines[currentLine].match(resultRegex);
        if (!resultMatch || resultMatch[1] !== test) { return undefined; }
        currentLine++;

        switch (resultMatch[2]) {
            case "SUCCESS": return Result.Success;
            case "FAILURE": return Result.Failure;
        }
    }
    function parseTest(): Test | undefined {
        const testMatch = lines[currentLine].match(testRegex);
        if (!testMatch) { return undefined; }
        currentLine++;

        let output: string | undefined = undefined;
        while (currentLine < lines.length) {
            const result = parseResult(testMatch[1]);
            if (result !== undefined) {
                return { name: testMatch[1], output, result };
            } else {
                if (output === undefined) { output = ""; }
                output += lines[currentLine] + "\n";
                currentLine++;
            }
        }
    }
    function parsePackage(): Package | undefined {
        const packageMatch = lines[currentLine].match(packageRegex);
        if (!packageMatch) { return undefined; }
        currentLine++;

        let tests: Test[] = [];
        while (true) {
            const test = parseTest();
            if (test) {
                tests.push(test);
            } else {
                return { name: packageMatch[1], tests };
            }
        }
    }

    let packages: Package[] = [];
    while (currentLine < lines.length) {
        const pkg = parsePackage();
        if (!pkg) { break; }
        packages.push(pkg);
    }
    return packages;
}

export function runOdinTest(workspaceFolder: Uri): Package[] | undefined {
    const output = execOdinTest(workspaceFolder);
    if (output) {
        return parseOdinTestOutput(output);
    }
    else {
        return undefined;
    }
}