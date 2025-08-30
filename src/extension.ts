import * as vscode from 'vscode';
import { ConnectionTreeDataProvider } from './connectionTreeProvider';
import { ConnectionReader } from './connectionReader';

// Create output channel for logging
const outputChannel = vscode.window.createOutputChannel('Show Me Passwords - Log');

export function activate(context: vscode.ExtensionContext) {
    outputChannel.appendLine('ShowMePasswords extension is now active!');

    // Set the output channel for ConnectionReader
    ConnectionReader.setOutputChannel(outputChannel);

    // Create and register the tree data provider
    const connectionProvider = new ConnectionTreeDataProvider();
    const treeView = vscode.window.createTreeView('sqlDeveloperConnections', {
        treeDataProvider: connectionProvider,
        showCollapseAll: true
    });

    // Set context to show the view
    vscode.commands.executeCommand('setContext', 'showmepasswords.hasConnections', true);

    // Register commands
    const listConnectionsCommand = vscode.commands.registerCommand('showmepasswords.listConnections', async () => {
        outputChannel.appendLine('Listing connections command executed');
        const connections = await ConnectionReader.getConnections();
        
        if (connections.length === 0) {
            outputChannel.appendLine('No connections found');
            vscode.window.showInformationMessage('No SQL Developer connections found in AppData folder.');
            return;
        }

        outputChannel.appendLine(`Found ${connections.length} connections`);

        const items = connections.map(conn => ({
            label: conn.name,
            description: conn.isValid ? 'Valid' : 'Invalid',
            detail: conn.folder,
            connection: conn
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a SQL Developer connection to view details'
        });

        if (selected) {
            const info = [
                `Name: ${selected.connection.name}`,
                `Folder: ${selected.connection.folder}`,
                `Config Path: ${selected.connection.configPath || 'Not found'}`,
                `Valid: ${selected.connection.isValid ? 'Yes' : 'No'}`
            ];

            if (selected.connection.details) {
                info.push('', 'Details:');
                if (typeof selected.connection.details === 'object') {
                    Object.entries(selected.connection.details).forEach(([key, value]) => {
                        const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
                        info.push(`  ${key}: ${displayValue}`);
                    });
                }
            }

            vscode.window.showInformationMessage(info.join('\n'));
        }
    });

    const refreshConnectionsCommand = vscode.commands.registerCommand('showmepasswords.refreshConnections', () => {
        outputChannel.appendLine('Refreshing connections');
        connectionProvider.refresh();
        vscode.window.showInformationMessage('SQL Developer connections refreshed.');
    });

    // Register a command to show paths for debugging
    const showPathsCommand = vscode.commands.registerCommand('showmepasswords.showPaths', () => {
        const dbToolsPath = ConnectionReader.getDbToolsPath();
        const connectionsPath = ConnectionReader.getConnectionsPath();
        
        outputChannel.appendLine(`DBTools Path: ${dbToolsPath}`);
        outputChannel.appendLine(`Connections Path: ${connectionsPath}`);
        
        vscode.window.showInformationMessage(
            `DBTools Path: ${dbToolsPath}\nConnections Path: ${connectionsPath}`,
            'Open DBTools Folder'
        ).then(selection => {
            if (selection === 'Open DBTools Folder') {
                vscode.env.openExternal(vscode.Uri.file(dbToolsPath));
            }
        });
    });

    // Add all commands to context subscriptions
    context.subscriptions.push(
        outputChannel,
        treeView,
        listConnectionsCommand,
        refreshConnectionsCommand,
        showPathsCommand
    );

    // Show initial status
    outputChannel.appendLine('Extension activation complete');
    vscode.window.showInformationMessage('ShowMePasswords extension activated! Use Ctrl+Shift+P and search for "Show Me Passwords" commands.');
}

export function deactivate() {
    outputChannel.appendLine('ShowMePasswords extension deactivated.');
    outputChannel.dispose();
}
