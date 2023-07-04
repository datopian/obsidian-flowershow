import { debounce, Notice, Setting } from 'obsidian';

import { FlowershowSettings } from './FlowershowSettings';
import StorageManager from './StorageManager';

export default class SettingView {
    private settingsRootElement: HTMLElement;
    private settings: FlowershowSettings;
    private saveSettings: () => Promise<void>;
    debouncedSaveSiteSettingsAndUpdateConfig = debounce(this.saveSiteSettingsAndUpdateConfigFile, 1000, true);

    constructor(settingsRootElement: HTMLElement, settings: FlowershowSettings, saveSettings: () => Promise<void>) {
        this.settingsRootElement = settingsRootElement;
        this.settings = settings;
        this.saveSettings = saveSettings;
    }

    async initialize() {
        this.settingsRootElement.empty();
        this.settingsRootElement.classList.add("dg-settings");
        this.settingsRootElement.createEl('h1', { text: 'Flowershow Settings' });

        // const linkDiv = this.settingsRootElement.createEl('div');
        // linkDiv.addClass("pr-link");
        // linkDiv.createEl('span', { text: 'Remember to read the setup guide if you haven\'t already. It can be found ' });
        // linkDiv.createEl('a', { text: 'here.', href: "https://github.com/datopian/flowershow" });

        // TODO some authentication stuff

        // this.settingsRootElement.createEl('h3', { text: 'R2 worker URL (required)' }).prepend(getIcon("flowershow"));
        this.settingsRootElement.createEl('h3', { text: 'R2 worker URL (required)' })
        this.initializeR2UrlSetting()

        this.settingsRootElement.createEl('h3', { text: 'Flowershow site settings' }).prepend('🌷 ');
        this.initializeFlowershowSettings();
    }

    // TODO temporary solution
    private initializeR2UrlSetting() {
        new Setting(this.settingsRootElement)
            .setName('R2 Worker URL')
            .setDesc('❗️TEMPORARY')
            .addText(text => text
                .setValue(this.settings.R2url)
                .onChange(async (value) => {
                    this.settings.R2url = value;
                    await this.saveSettings();
                }));
    }

    private initializeFlowershowSettings() {
        new Setting(this.settingsRootElement)
            .setName('Site title')
            .setDesc('TBD')
            .addText(text => text
                .setValue(this.settings.title)
                .onChange(async (value) => {
                    this.settings.title = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        new Setting(this.settingsRootElement)
            .setName('Site description')
            .setDesc('TBD')
            .addText(text => text
                .setValue(this.settings.description)
                .onChange(async (value) => {
                    this.settings.description = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));
    }

    // TODO add the rest of the settings

    private async saveSiteSettingsAndUpdateConfigFile() {
        let updateFailed = false;
        try {
            const gardenManager = new StorageManager(this.settings.R2url)
            await gardenManager.updateConfigFile(this.settings);
        } catch {
            new Notice("Failed to update settings. Make sure you have an internet connection.")
            updateFailed = true;
        }

        if (!updateFailed) {
            await this.saveSettings();
        }
    }
}
