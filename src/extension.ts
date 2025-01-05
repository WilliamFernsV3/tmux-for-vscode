import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    let openTmuxCommand = vscode.commands.registerCommand(
        "tmux.openTmux",
        openTMUX
    );
    let closeEditorsCommand = vscode.commands.registerCommand(
        "tmux.closeNonTerminalEditors",
        closeNonTerminalEditors
    );

    context.subscriptions.push(closeEditorsCommand);
    context.subscriptions.push(openTmuxCommand);
}

async function openTMUX() {
    if (!(await focusActiveTMUXInstance())) {
        await newTMUXInstance();
    }
}

/**
 * Tries to find an instance and focus on the tab.
 * @returns If an instance was found and focused
 */
async function focusActiveTMUXInstance(): Promise<boolean> {
    for (let openTerminal of vscode.window.terminals) {
        if (openTerminal.name === "tmux") {
            openTerminal.show();
            return true;
        }
    }
    return false;
}

async function newTMUXInstance() {
    // Always create a new terminal
    await vscode.commands.executeCommand(
        "workbench.action.terminal.newInActiveWorkspace"
    );

    let terminal = vscode.window.activeTerminal!;

    // Read the command from the configuration
    const command = vscode.workspace
        .getConfiguration()
        .get<string>("tmux.command", "tmux && exit");
    terminal.sendText(command);
    terminal.show();

    // Move the terminal to the editor area
    await vscode.commands.executeCommand(
        "workbench.action.terminal.moveToEditor"
    );

    // Move focus back to the editor view
    await vscode.commands.executeCommand(
        "workbench.action.focusActiveEditorGroup"
    );

    if (vscode.window.terminals.length > 1) {
        // Close the terminal if it's not the only one
        await vscode.commands.executeCommand("workbench.action.togglePanel");
    }
}

async function closeNonTerminalEditors() {
    const activeTabGroup = vscode.window.tabGroups.activeTabGroup;

    if (!activeTabGroup) {
        console.log("No active tab group found.");
        return;
    }

    // Fetch the list of terminal-like editors from settings and predefined values
    const terminalEditors: string[] = [
        ...vscode.workspace
            .getConfiguration()
            .get<string[]>("tmux.additionalTerminalEditors", []),
        "tmux"
    ].map((label) => label.toLowerCase()); // Normalize for case-insensitive comparison

    // Filter tabs in the active tab group to identify editors to close
    const editorsToClose = activeTabGroup.tabs.filter(
        (tab) =>
            !tab.isActive && // Skip the active editor
            tab.label &&      // Ensure tab has a label (in case of untitled files)
            !terminalEditors.includes(tab.label.toLowerCase()) // Skip terminal editors
    );

    // Log the labels of editors to close (for debugging)
    console.log(
        `Editors labels to close: ${JSON.stringify(
            editorsToClose.map((editor) => editor.label),
            null,
            2
        )}`
    );

    // Close the filtered editors
    for (const tab of editorsToClose) {
        await vscode.window.tabGroups.close(tab);
    }

    console.log("Closed non-terminal editors in the current tab group.");
}


export function deactivate() { }
