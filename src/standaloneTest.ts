import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Standalone version of ConnectionReader for testing without VS Code
class StandaloneConnectionReader {
    private static readonly DBTOOLS_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'DBTools');
    private static readonly CONNECTIONS_PATH = path.join(StandaloneConnectionReader.DBTOOLS_PATH, 'Connections');

    public static async getConnections() {
        const connections: any[] = [];

        try {
            // Check if DBTools folder exists
            if (!fs.existsSync(StandaloneConnectionReader.DBTOOLS_PATH)) {
                console.log('DBTools folder not found at:', StandaloneConnectionReader.DBTOOLS_PATH);
                return connections;
            }

            // Check if Connections folder exists
            if (!fs.existsSync(StandaloneConnectionReader.CONNECTIONS_PATH)) {
                console.log('Connections folder not found at:', StandaloneConnectionReader.CONNECTIONS_PATH);
                return connections;
            }

            // Read all directories in the Connections folder
            const connectionFolders = fs.readdirSync(StandaloneConnectionReader.CONNECTIONS_PATH, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            console.log(`Found ${connectionFolders.length} connection folders:`, connectionFolders);

            // Process each connection folder
            for (const folderName of connectionFolders) {
                const connectionPath = path.join(StandaloneConnectionReader.CONNECTIONS_PATH, folderName);
                const connection = await StandaloneConnectionReader.parseConnectionFolder(folderName, connectionPath);
                connections.push(connection);
            }

        } catch (error) {
            console.error('Error reading connections:', error);
        }

        return connections;
    }

    private static async parseConnectionFolder(folderName: string, folderPath: string) {
        const connection = {
            name: folderName,
            folder: folderPath,
            configPath: '',
            isValid: false,
            details: undefined as any
        };

        try {
            // Look for common configuration files
            const files = fs.readdirSync(folderPath);
            console.log(`Files in ${folderName}:`, files);

            // Look for JSON configuration files
            const configFiles = files.filter(file => 
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
                    console.warn(`Failed to parse config file ${configPath}:`, parseError);
                    connection.details = { error: 'Failed to parse configuration file' };
                }
            }

        } catch (error) {
            console.error(`Error processing connection folder ${folderName}:`, error);
        }

        return connection;
    }

    public static getDbToolsPath(): string {
        return StandaloneConnectionReader.DBTOOLS_PATH;
    }

    public static getConnectionsPath(): string {
        return StandaloneConnectionReader.CONNECTIONS_PATH;
    }
}

async function testConnectionReader() {
    console.log('Testing SQL Developer Connection Reader (Standalone)...\n');
    
    console.log('DBTools Path:', StandaloneConnectionReader.getDbToolsPath());
    console.log('Connections Path:', StandaloneConnectionReader.getConnectionsPath());
    console.log('');
    
    try {
        const connections = await StandaloneConnectionReader.getConnections();
        
        console.log(`Found ${connections.length} connections:\n`);
        
        connections.forEach((conn, index) => {
            console.log(`${index + 1}. ${conn.name}`);
            console.log(`   Folder: ${conn.folder}`);
            console.log(`   Config: ${conn.configPath || 'Not found'}`);
            console.log(`   Valid: ${conn.isValid ? 'Yes' : 'No'}`);
            
            if (conn.details) {
                console.log('   Details:');
                if (typeof conn.details === 'object') {
                    Object.entries(conn.details).forEach(([key, value]) => {
                        const displayValue = typeof value === 'string' 
                            ? (value.length > 100 ? value.substring(0, 100) + '...' : value)
                            : JSON.stringify(value);
                        console.log(`     ${key}: ${displayValue}`);
                    });
                }
            }
            console.log('');
        });
        
    } catch (error) {
        console.error('Error testing connection reader:', error);
    }
}

// Run the test
testConnectionReader();
