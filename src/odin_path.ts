import { execSync } from "child_process";
import { statSync } from "fs";
import { window, workspace } from "vscode";

const odinExecName = "odin";

export function findOdinPath(): string | undefined {
    // check if we're in windows or linux
    var cmd: string;
    if (process.platform === "win32") {
        cmd = "where " + odinExecName;
    }
    else if (process.platform === "linux") {
        cmd = "which " + odinExecName;
    }
    else {
        return undefined;
    }

    try {
        const path = execSync(cmd).toString().trim();
        console.debug(`found potentional odin path: ${path}`);

        return checkOdinPath(path) ? path : undefined;
    } catch (error) {
        console.warn(`could not find odin path: ${error}`);
        return undefined;
    }
}

function checkOdinPath(path: string): boolean {
    try {
        const stat = statSync(path);
        if (!stat.isFile()) {
            console.warn(`path is not an executable: ${path}`);
            return false;
        }

        return true;
    }
    catch (error) {
        console.warn(`could not check ${path}: ${error}`);
        return false;
    }
}

export var odinPath: string | undefined = undefined;

export function loadOdinPath(): boolean {
    // check if a path is configured
    var path = workspace.getConfiguration("odinTesting").get<string>("odinPath");
    if (path && path !== "") {
        if (checkOdinPath(path)) {
            console.log(`found odin path in settings: ${path}`);
            odinPath = path;
            return true;
        } else {
            window.showErrorMessage("Invalid Odin path in settings", "Open Settings");
            return false;
        }
    }

    // try to find the path
    path = findOdinPath();
    if (path !== undefined) {
        console.log(`found odin path: ${path}`);
        odinPath = path;
        return true;
    } else {
        console.warn("odin path not found");

        // show a warning message
        window.showErrorMessage("Odin path not found", "Open Settings");

        return false;
    }
}