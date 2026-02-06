/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

import { changePanel, accountSelect, database, Slider, config, setStatus, popup, appdata, setBackground } from '../utils.js'
const { ipcRenderer } = require('electron');
const os = require('os');

class Settings {
    static id = "settings";

    async init(config) {
        this.config = config;
        this.db = new database();

        await this.accounts();
        await this.ram();
        await this.javaPath();
        await this.resolution();
        await this.launcher();
        this.navBTN();
    }

    navBTN() {
        document.querySelector('.nav-box').addEventListener('click', e => {
            if (!e.target.classList.contains('nav-settings-btn')) return;

            let id = e.target.id;
            let activeSettingsBTN = document.querySelector('.active-settings-BTN');
            let activeContainerSettings = document.querySelector('.active-container-settings');

            activeSettingsBTN?.classList.remove('active-settings-BTN');
            e.target.classList.add('active-settings-BTN');

            activeContainerSettings?.classList.remove('active-container-settings');
            document.querySelector(`#${id}-tab`).classList.add('active-container-settings');

            if (id === 'save') changePanel('home');
        });
    }

    async accounts() {
        document.querySelector('.accounts-list').addEventListener('click', async e => {
            const popupAccount = new popup();
            let id = e.target.id;

            try {
                if (e.target.classList.contains('account')) {
                    popupAccount.openPopup({ title: 'Connexion', content: 'Veuillez patienter...', color: 'var(--color)' });

                    if (id === 'add') {
                        document.querySelector('.cancel-home').style.display = 'inline';
                        return changePanel('login');
                    }

                    const account = await this.db.readData('accounts', id);
                    const configClient = await this.setInstance(account);
                    await accountSelect(account);

                    configClient.account_selected = account.ID;
                    await this.db.updateData('configClient', configClient);
                    return;
                }

                if (e.target.classList.contains("delete-profile")) {
                    popupAccount.openPopup({ title: 'Connexion', content: 'Veuillez patienter...', color: 'var(--color)' });

                    await this.db.deleteData('accounts', id);
                    document.getElementById(id)?.remove();

                    const configClient = await this.db.readData('configClient');
                    const allAccounts = await this.db.readAllData('accounts');

                    if (!allAccounts.length) return changePanel('login');

                    if (configClient.account_selected == id) {
                        configClient.account_selected = allAccounts[0].ID;
                        await this.db.updateData('configClient', configClient);
                        await accountSelect(allAccounts[0]);
                        await this.setInstance(allAccounts[0]);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                popupAccount.closePopup();
            }
        });
    }

    async setInstance(auth) {
        const configClient = await this.db.readData('configClient');
        const instancesList = await config.getInstanceList();
        let instanceChanged = false;

        for (let instance of instancesList) {
            if (instance.whitelistActive && !instance.whitelist.includes(auth.name)) {
                if (instance.name === configClient.instance_select) {
                    const newInstance = instancesList.find(i => !i.whitelistActive);
                    if (newInstance) {
                        configClient.instance_select = newInstance.name;
                        await setStatus(newInstance.status);
                        instanceChanged = true;
                    }
                }
            }
        }

        if (instanceChanged) await this.db.updateData('configClient', configClient);
        return configClient;
    }

    async ram() {
        const configClient = await this.db.readData('configClient');
        const totalMem = Math.trunc(os.totalmem() / 1073741824 * 10) / 10;
        const freeMem = Math.trunc(os.freemem() / 1073741824 * 10) / 10;

        document.getElementById("total-ram").textContent = `${totalMem} Go`;
        document.getElementById("free-ram").textContent = `${freeMem} Go`;

        const sliderDiv = document.querySelector(".memory-slider");
        sliderDiv.setAttribute("max", Math.trunc((80 * totalMem) / 100));

        let ram = configClient?.java_config?.java_memory ?? { min: 1, max: 2 };
        if (totalMem < ram.min) ram = { min: 1, max: 2 };

        const slider = new Slider(".memory-slider", ram.min, ram.max);
        const minSpan = document.querySelector(".slider-touch-left span");
        const maxSpan = document.querySelector(".slider-touch-right span");

        minSpan.setAttribute("value", `${ram.min} Go`);
        maxSpan.setAttribute("value", `${ram.max} Go`);

        slider.on("change", async (min, max) => {
            const configClient = await this.db.readData('configClient');
            configClient.java_config.java_memory = { min, max };
            await this.db.updateData('configClient', configClient);
            minSpan.setAttribute("value", `${min} Go`);
            maxSpan.setAttribute("value", `${max} Go`);
        });
    }

    async javaPath() {
        const javaPathText = document.querySelector(".java-path-txt");
        const configClient = await this.db.readData('configClient');
        const javaPath = configClient?.java_config?.java_path ?? 'Utiliser la version de java livre avec le launcher';

        javaPathText.textContent = `${await appdata()}/${process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}/runtime`;

        const javaPathInputTxt = document.querySelector(".java-path-input-text");
        const javaPathInputFile = document.querySelector(".java-path-input-file");
        javaPathInputTxt.value = javaPath;

        document.querySelector(".java-path-set").addEventListener("click", async () => {
            javaPathInputFile.value = '';
            javaPathInputFile.click();

            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (javaPathInputFile.value !== '') { clearInterval(interval); resolve(true); }
                }, 100);
            });

            if (javaPathInputFile.value.endsWith("java") || javaPathInputFile.value.endsWith("javaw")) {
                const configClient = await this.db.readData('configClient');
                const file = javaPathInputFile.files[0].path;
                javaPathInputTxt.value = file;
                configClient.java_config.java_path = file;
                await this.db.updateData('configClient', configClient);
            } else alert("Le nom du fichier doit être java ou javaw");
        });

        document.querySelector(".java-path-reset").addEventListener("click", async () => {
            const configClient = await this.db.readData('configClient');
            javaPathInputTxt.value = 'Utiliser la version de java livre avec le launcher';
            configClient.java_config.java_path = null;
            await this.db.updateData('configClient', configClient);
        });
    }

    async resolution() {
        const configClient = await this.db.readData('configClient');
        const resolution = configClient?.game_config?.screen_size ?? { width: 854, height: 480 };

        const width = document.querySelector(".width-size");
        const height = document.querySelector(".height-size");
        const reset = document.querySelector(".size-reset");

        width.value = resolution.width;
        height.value = resolution.height;

        width.addEventListener("change", async () => {
            const configClient = await this.db.readData('configClient');
            configClient.game_config.screen_size.width = width.value;
            await this.db.updateData('configClient', configClient);
        });

        height.addEventListener("change", async () => {
            const configClient = await this.db.readData('configClient');
            configClient.game_config.screen_size.height = height.value;
            await this.db.updateData('configClient', configClient);
        });

        reset.addEventListener("click", async () => {
            const configClient = await this.db.readData('configClient');
            configClient.game_config.screen_size = { width: 854, height: 480 };
            width.value = 854;
            height.value = 480;
            await this.db.updateData('configClient', configClient);
        });
    }

    async launcher() {
        const configClient = await this.db.readData('configClient');

        // MAX DOWNLOAD
        const maxDownloadFilesInput = document.querySelector(".max-files");
        const maxDownloadFilesReset = document.querySelector(".max-files-reset");
        maxDownloadFilesInput.value = configClient.launcher_config.download_multi ?? 5;

        maxDownloadFilesInput.addEventListener("change", async () => {
            const configClient = await this.db.readData('configClient');
            configClient.launcher_config.download_multi = maxDownloadFilesInput.value;
            await this.db.updateData('configClient', configClient);
        });

        maxDownloadFilesReset.addEventListener("click", async () => {
            const configClient = await this.db.readData('configClient');
            configClient.launcher_config.download_multi = 5;
            maxDownloadFilesInput.value = 5;
            await this.db.updateData('configClient', configClient);
        });

        // THEME
        const themeBox = document.querySelector(".theme-box");
        let theme = configClient.launcher_config.theme ?? "auto";

        document.querySelector(`.theme-btn-${theme === 'auto' ? 'auto' : theme === 'dark' ? 'sombre' : 'clair'}`)
            .classList.add('active-theme');

        themeBox.addEventListener("click", async e => {
            if (!e.target.classList.contains('theme-btn')) return;

            document.querySelector('.active-theme')?.classList.remove('active-theme');

            if (e.target.classList.contains('theme-btn-auto')) { theme = "auto"; setBackground(); }
            else if (e.target.classList.contains('theme-btn-sombre')) { theme = "dark"; setBackground(true); }
            else if (e.target.classList.contains('theme-btn-clair')) { theme = "light"; setBackground(false); }

            e.target.classList.add('active-theme');

            const configClient = await this.db.readData('configClient');
            configClient.launcher_config.theme = theme;
            await this.db.updateData('configClient', configClient);
        });

        // CLOSE LAUNCHER
        const closeBox = document.querySelector(".close-box");
        const closeType = configClient.launcher_config.closeLauncher ?? "close-launcher";
        document.querySelector(`.${closeType}`).classList.add('active-close');

        closeBox.addEventListener("click", async e => {
            if (!e.target.classList.contains('close-btn')) return;
            document.querySelector('.active-close')?.classList.remove('active-close');
            e.target.classList.add('active-close');

            const configClient = await this.db.readData('configClient');
            if (e.target.classList.contains('close-launcher')) configClient.launcher_config.closeLauncher = "close-launcher";
            if (e.target.classList.contains('close-all')) configClient.launcher_config.closeLauncher = "close-all";
            if (e.target.classList.contains('close-none')) configClient.launcher_config.closeLauncher = "close-none";
            await this.db.updateData('configClient', configClient);
        });
    }
}

export default Settings;
