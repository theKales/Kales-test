import Login from './panels/login.js';
import Home from './panels/home.js';
import Settings from './panels/settings.js';

import { logger, config, changePanel, database, popup, setBackground, accountSelect, addAccount, pkg } from './utils.js';
const { AZauth, Microsoft, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');
const fs = require('fs');
const os = require('os');

class Launcher {
    async init() {
        this.initLog();
        console.log('Initializing Launcher...');
        this.shortcut();
        await setBackground();
        this.initFrame();
        this.config = await config.GetConfig().catch(err => err);
        if (this.config.error) return this.errorConnect();
        this.db = new database();
        await this.initConfigClient();
        this.createPanels(Login, Home, Settings);
        this.startLauncher();
    }

    initLog() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 123)) {
                ipcRenderer.send('main-window-dev-tools-close');
                ipcRenderer.send('main-window-dev-tools');
            }
        });
        new logger(pkg.name, '#7289da');
    }

    shortcut() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.keyCode == 87) {
                ipcRenderer.send('main-window-close');
            }
        });
    }

    errorConnect() {
        new popup().openPopup({
            title: this.config.error.code,
            content: this.config.error.message,
            color: 'red',
            exit: true,
            options: true
        });
    }

    initFrame() {
        const platform = os.platform() === 'darwin' ? "darwin" : "other";
        document.querySelector(`.${platform} .frame`).classList.toggle('hide');

        document.querySelector(`.${platform} .frame #minimize`).addEventListener('click', () => ipcRenderer.send('main-window-minimize'));

        let maximized = false;
        let maximize = document.querySelector(`.${platform} .frame #maximize`);
        maximize.addEventListener('click', () => {
            ipcRenderer.send('main-window-maximize');
            maximized = !maximized;
            maximize.classList.toggle('icon-maximize');
            maximize.classList.toggle('icon-restore-down');
        });

        document.querySelector(`.${platform} .frame #close`).addEventListener('click', () => ipcRenderer.send('main-window-close'));
    }

    async initConfigClient() {
        console.log('Initializing Config Client...');
        let configClient = await this.db.readFirst('configClient');

        if (!configClient) {
            configClient = await this.db.createData('configClient', {
                account_selected: null,
                instance_select: null,
                java_config: {
                    java_path: null,
                    java_memory: { min: 2, max: 4 }
                },
                game_config: { screen_size: { width: 854, height: 480 } },
                launcher_config: { download_multi: 5, theme: 'auto', closeLauncher: 'close-launcher', intelEnabledMac: true }
            });
        }

        this.configClient = configClient; // stocker pour usage futur
    }

    createPanels(...panels) {
        let panelsElem = document.querySelector('.panels');
        for (let panel of panels) {
            console.log(`Initializing ${panel.name} Panel...`);
            let div = document.createElement('div');
            div.classList.add('panel', panel.id);
            div.innerHTML = fs.readFileSync(`${__dirname}/panels/${panel.id}.html`, 'utf8');
            panelsElem.appendChild(div);
            new panel().init(this.config);
        }
    }

    async startLauncher() {
        let accounts = await this.db.readAllData('accounts');
        let configClient = await this.db.readFirst('configClient');
        let account_selected = configClient?.account_selected;
        let popupRefresh = new popup();

        if (accounts?.length) {
            for (let account of accounts) {
                const account_ID = account.ID;

                if (account.error) {
                    await this.db.deleteData('accounts', account_ID);
                    continue;
                }

                let refresh_accounts;
                if (account.meta.type === 'Xbox') refresh_accounts = await new Microsoft(this.config.client_id).refresh(account);
                else if (account.meta.type === 'AZauth') refresh_accounts = await new AZauth(this.config.online).verify(account);
                else if (account.meta.type === 'Mojang') {
                    if (!account.meta.online) refresh_accounts = await Mojang.login(account.name);
                    else refresh_accounts = await Mojang.refresh(account);
                }

                if (refresh_accounts?.error) {
                    await this.db.deleteData('accounts', account_ID);
                    if (account_ID === account_selected) {
                        configClient.account_selected = null;
                        await this.db.updateData('configClient', configClient, configClient.ID);
                    }
                    console.error(`[Account] ${account.name}: ${refresh_accounts.errorMessage || refresh_accounts.message}`);
                    continue;
                }

                refresh_accounts.ID = account_ID;
                await this.db.updateData('accounts', refresh_accounts, account_ID);
                await addAccount(refresh_accounts);
                if (account_ID === account_selected) accountSelect(refresh_accounts);
            }

            // Rafraîchir les données
            accounts = await this.db.readAllData('accounts');
            configClient = await this.db.readFirst('configClient');
            account_selected = configClient?.account_selected;

            if (!account_selected && accounts.length) {
                const uuid = accounts[0].ID;
                configClient.account_selected = uuid;
                await this.db.updateData('configClient', configClient, configClient.ID);
                accountSelect(accounts[0]);
            }

            if (!accounts.length) {
                configClient.account_selected = null;
                await this.db.updateData('configClient', configClient, configClient.ID);
                popupRefresh.closePopup();
                return changePanel('login');
            }

            popupRefresh.closePopup();
            changePanel('home');
        } else {
            popupRefresh.closePopup();
            changePanel('login');
        }
    }
}

new Launcher().init();
