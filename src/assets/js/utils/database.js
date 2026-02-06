const { ipcRenderer } = require('electron');

export default class database {

    // Crée une nouvelle entrée dans une table
    async createData(tableName, data) {
        let tableData = await ipcRenderer.invoke('store:get', tableName) || [];
        if (!Array.isArray(tableData)) tableData = [];

        const maxId = tableData.length > 0
            ? Math.max(...tableData.map(item => item.ID || 0))
            : 0;

        data.ID = maxId + 1;
        tableData.push(data);

        await ipcRenderer.invoke('store:set', tableName, tableData);
        return data;
    }

    // Lit une entrée par ID (par défaut ID=1)
    async readData(tableName, key = 1) {
        let tableData = await ipcRenderer.invoke('store:get', tableName) || [];
        if (!Array.isArray(tableData)) tableData = [];

        return tableData.find(item => item.ID === key) || null;
    }

    // Lit toutes les entrées d'une table
    async readAllData(tableName) {
        let tableData = await ipcRenderer.invoke('store:get', tableName) || [];
        if (!Array.isArray(tableData)) tableData = [];
        return tableData;
    }

    // Met à jour une entrée par ID
    async updateData(tableName, data, key = 1) {
        let tableData = await ipcRenderer.invoke('store:get', tableName) || [];
        if (!Array.isArray(tableData)) tableData = [];

        const index = tableData.findIndex(item => item.ID === key);
        data.ID = key;

        if (index !== -1) {
            tableData[index] = data;
        } else {
            tableData.push(data);
        }

        await ipcRenderer.invoke('store:set', tableName, tableData);
    }

    // Supprime une entrée par ID
    async deleteData(tableName, key = 1) {
        let tableData = await ipcRenderer.invoke('store:get', tableName) || [];
        if (!Array.isArray(tableData)) tableData = [];

        tableData = tableData.filter(item => item.ID !== key);

        await ipcRenderer.invoke('store:set', tableName, tableData);
    }

    // Méthode pratique pour récupérer le **premier élément** si on sait qu'il y en a qu'un
    async readFirst(tableName) {
        let tableData = await ipcRenderer.invoke('store:get', tableName) || [];
        if (!Array.isArray(tableData)) tableData = [];
        return tableData[0] || null;
    }
}
