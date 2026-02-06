const { ipcRenderer } = require('electron');

export default class database {

    // Crée une donnée dans une "table" (table = tableau d'objets)
    async createData(tableName, data) {
        let tableData = await ipcRenderer.invoke('store:get', tableName);
        if (!Array.isArray(tableData)) tableData = [];

        // Déterminer le nouvel ID
        const maxId = tableData.length > 0 ? Math.max(...tableData.map(item => item.ID || 0)) : 0;
        data.ID = maxId + 1;

        tableData.push(data);
        await ipcRenderer.invoke('store:set', tableName, tableData);

        console.log(`[DB] CREATE ${tableName} ID:${data.ID}`, data);
        return data;
    }

    // Lire une donnée par ID, ou le premier élément si key = 1
    async readData(tableName, key = 1) {
        let tableData = await ipcRenderer.invoke('store:get', tableName);
        if (!Array.isArray(tableData)) {
            console.log(`[DB] READ ${tableName} -> aucune donnée trouvée`);
            return undefined;
        }
        const result = tableData.find(item => item.ID === key);
        console.log(`[DB] READ ${tableName} ID:${key}`, result);
        return result;
    }

    // Lire toutes les données
    async readAllData(tableName) {
        let tableData = await ipcRenderer.invoke('store:get', tableName);
        if (!Array.isArray(tableData)) tableData = [];
        console.log(`[DB] READ ALL ${tableName}`, tableData);
        return tableData;
    }

    // Met à jour une donnée par ID
    async updateData(tableName, data, key = 1) {
        let tableData = await ipcRenderer.invoke('store:get', tableName);
        if (!Array.isArray(tableData)) tableData = [];

        const index = tableData.findIndex(item => item.ID === key);
        data.ID = key;

        if (index !== -1) {
            tableData[index] = data;
            console.log(`[DB] UPDATE ${tableName} ID:${key}`, data);
        } else {
            tableData.push(data);
            console.log(`[DB] UPDATE ${tableName} ID:${key} -> ajouté car inexistant`, data);
        }

        await ipcRenderer.invoke('store:set', tableName, tableData);
    }

    // Supprime une donnée par ID
    async deleteData(tableName, key = 1) {
        let tableData = await ipcRenderer.invoke('store:get', tableName);
        if (!Array.isArray(tableData)) tableData = [];

        const newData = tableData.filter(item => item.ID !== key);
        await ipcRenderer.invoke('store:set', tableName, newData);

        console.log(`[DB] DELETE ${tableName} ID:${key}`);
    }
}
