import * as vscode from 'vscode';
import { ConnectionReader, SqlDeveloperConnection } from './connectionReader';

export class ConnectionTreeDataProvider implements vscode.TreeDataProvider<ConnectionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionItem | undefined | null | void> = new vscode.EventEmitter<ConnectionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private connections: SqlDeveloperConnection[] = [];

    constructor() {
        this.refresh();
    }

    refresh(): void {
        this.loadConnections();
        this._onDidChangeTreeData.fire();
    }

    private async loadConnections(): Promise<void> {
        this.connections = await ConnectionReader.getConnections();
    }

    getTreeItem(element: ConnectionItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ConnectionItem): Thenable<ConnectionItem[]> {
        if (!element) {
            // Root level - show all connections
            return Promise.resolve(this.connections.map(conn => 
                new ConnectionItem(
                    conn.name,
                    conn.isValid ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                    conn
                )
            ));
        } else if (element.connection) {
            // Show connection details
            const items: ConnectionItem[] = [];
            
            items.push(new ConnectionItem(
                `Folder: ${element.connection.folder}`,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'folder'
            ));

            if (element.connection.configPath) {
                items.push(new ConnectionItem(
                    `Config: ${element.connection.configPath}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'file'
                ));
            }

            items.push(new ConnectionItem(
                `Valid: ${element.connection.isValid ? 'Yes' : 'No'}`,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                element.connection.isValid ? 'check' : 'error'
            ));

            if (element.connection.details) {
                if (typeof element.connection.details === 'object' && !element.connection.details.error) {
                    Object.keys(element.connection.details).forEach(key => {
                        const value = element.connection?.details[key];
                        const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
                        items.push(new ConnectionItem(
                            `${key}: ${displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue}`,
                            vscode.TreeItemCollapsibleState.None,
                            undefined,
                            'key'
                        ));
                    });
                } else if (element.connection.details.error) {
                    items.push(new ConnectionItem(
                        `Error: ${element.connection.details.error}`,
                        vscode.TreeItemCollapsibleState.None,
                        undefined,
                        'error'
                    ));
                }
            }

            return Promise.resolve(items);
        }

        return Promise.resolve([]);
    }
}

class ConnectionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly connection?: SqlDeveloperConnection,
        iconName?: string
    ) {
        super(label, collapsibleState);

        if (connection) {
            this.tooltip = `${connection.name} - ${connection.folder}`;
            this.contextValue = 'connection';
            this.iconPath = new vscode.ThemeIcon(connection.isValid ? 'database' : 'warning');
        } else if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
            this.contextValue = 'detail';
        }

        if (connection?.configPath) {
            this.command = {
                command: 'vscode.open',
                title: 'Open Config File',
                arguments: [vscode.Uri.file(connection.configPath)]
            };
        }
    }
}
