import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SqlDeveloperConnection {
    name: string;
    folder: string;
    configPath: string;
    isValid: boolean;
    details?: any;
}

export class ConnectionReader {
    private static readonly DBTOOLS_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'DBTools');
    private static readonly CONNECTIONS_PATH = path.join(ConnectionReader.DBTOOLS_PATH, 'Connections');
    private static outputChannel: vscode.OutputChannel | undefined;

    public static setOutputChannel(channel: vscode.OutputChannel) {
        ConnectionReader.outputChannel = channel;
    }

    private static log(message: string) {
        if (ConnectionReader.outputChannel) {
            ConnectionReader.outputChannel.appendLine(message);
        }
    }

    public static async getConnections(): Promise<SqlDeveloperConnection[]> {
        const connections: SqlDeveloperConnection[] = [];

        try {
            // Check if DBTools folder exists
            if (!fs.existsSync(ConnectionReader.DBTOOLS_PATH)) {
                ConnectionReader.log('DBTools folder not found at: ' + ConnectionReader.DBTOOLS_PATH);
                return connections;
            }

            // Check if Connections folder exists
            if (!fs.existsSync(ConnectionReader.CONNECTIONS_PATH)) {
                ConnectionReader.log('Connections folder not found at: ' + ConnectionReader.CONNECTIONS_PATH);
                return connections;
            }

            // Read all directories in the Connections folder
            const connectionFolders = fs.readdirSync(ConnectionReader.CONNECTIONS_PATH, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            ConnectionReader.log(`Found ${connectionFolders.length} connection folders: ${connectionFolders.join(', ')}`);

            // Process each connection folder
            for (const folderName of connectionFolders) {
                const connectionPath = path.join(ConnectionReader.CONNECTIONS_PATH, folderName);
                const connection = await ConnectionReader.parseConnectionFolder(folderName, connectionPath);
                connections.push(connection);
            }

        } catch (error) {
            ConnectionReader.log('Error reading connections: ' + error);
            vscode.window.showErrorMessage(`Failed to read SQL Developer connections: ${error}`);
        }

        return connections;
    }

    private static async parseConnectionFolder(folderName: string, folderPath: string): Promise<SqlDeveloperConnection> {
        const connection: SqlDeveloperConnection = {
            name: folderName,
            folder: folderPath,
            configPath: '',
            isValid: false
        };

        try {
            // Look for common configuration files
            const files = fs.readdirSync(folderPath);
            ConnectionReader.log(`Files in ${folderName}: ${files.join(', ')}`);

            // Look for JSON configuration files
            const configFiles = files.filter((file: any) => 
                file.endsWith('.json') || 
                file.endsWith('.xml') || 
                file.endsWith('.properties') ||
                file.endsWith('.config')
            );

            if (configFiles.length > 0) {
                const configFile = configFiles[0]; // Take the first config file found
                const configPath = path.join(folderPath, configFile);
                connection.configPath = configPath;
                connection.isValid = true;

                // Try to read and parse the configuration
                try {
                    const configContent = fs.readFileSync(configPath, 'utf8');
                    
                    if (configFile.endsWith('.json')) {
                        connection.details = JSON.parse(configContent);
                    } else {
                        // For non-JSON files, store raw content for now
                        connection.details = { 
                            type: path.extname(configFile),
                            content: configContent.substring(0, 500) // Limit content size
                        };
                    }
                } catch (parseError) {
                    ConnectionReader.log(`Failed to parse config file ${configPath}: ${parseError}`);
                    connection.details = { error: 'Failed to parse configuration file' };
                }
            }

        } catch (error) {
            ConnectionReader.log(`Error processing connection folder ${folderName}: ${error}`);
        }

        return connection;
    }

    public static getDbToolsPath(): string {
        return ConnectionReader.DBTOOLS_PATH;
    }

    public static getConnectionsPath(): string {
        return ConnectionReader.CONNECTIONS_PATH;
    }
}
