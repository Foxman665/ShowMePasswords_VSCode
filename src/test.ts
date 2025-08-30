import { ConnectionReader } from './connectionReader';

async function testConnectionReader() {
    console.log('Testing SQL Developer Connection Reader...\n');
    
    console.log('DBTools Path:', ConnectionReader.getDbToolsPath());
    console.log('Connections Path:', ConnectionReader.getConnectionsPath());
    console.log('');
    
    try {
        const connections = await ConnectionReader.getConnections();
        
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

// Only run if this file is executed directly (not imported)
if (require.main === module) {
    testConnectionReader();
}
