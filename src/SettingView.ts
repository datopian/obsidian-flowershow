import { FlowershowSettings } from './FlowershowSettings';
// import { Notice, Setting, App, debounce, MetadataCache, getIcon } from 'obsidian';
import { Notice, Setting, App, debounce, MetadataCache } from 'obsidian';
import SiteManager from './SiteManager';

export default class SettingView {
    private settingsRootElement: HTMLElement;
    private settings: FlowershowSettings;
    private saveSettings: () => Promise<void>;
    debouncedSaveAndUpdate = debounce(this.saveSiteSettingsAndUpdateEnv, 500, true);

    constructor(_app: App, settingsRootElement: HTMLElement, settings: FlowershowSettings, saveSettings: () => Promise<void>) {
        this.settingsRootElement = settingsRootElement;
        this.settings = settings;
        this.saveSettings = saveSettings;
    }

    async initialize() {
        this.settingsRootElement.empty();
        this.settingsRootElement.classList.add("dg-settings");
        this.settingsRootElement.createEl('h1', { text: 'Flowershow Settings' });

        // TODO
        // const linkDiv = this.settingsRootElement.createEl('div');
        // linkDiv.addClass("pr-link");
        // linkDiv.createEl('span', { text: 'Remember to read the setup guide if you haven\'t already. It can be found ' });
        // linkDiv.createEl('a', { text: 'here.', href: "https://github.com/datopian/flowershow" });

        // this.settingsRootElement.createEl('h3', { text: 'Flowershow Authentication (required)' }).prepend(getIcon("flowershow"));
        this.initializePublishUrlSetting()
    }

    // TODO do we need this?
    private async saveSiteSettingsAndUpdateEnv(metadataCache: MetadataCache, settings: FlowershowSettings, saveSettings: () => Promise<void>) {
        // const octokit = new Octokit({ auth: settings.githubToken });
        let updateFailed = false;
        try {
            const gardenManager = new SiteManager(metadataCache, settings)
            await gardenManager.updateEnv();
        } catch {
            new Notice("Failed to update settings. Make sure you have an internet connection.")
            updateFailed = true;
        }

        if (!updateFailed) {
            await saveSettings();
        }
    }

    // TODO temporary solution
    private initializePublishUrlSetting() {
        new Setting(this.settingsRootElement)
            .setName('Publish URL')
            // .setDesc('TBD')
            .addText(text => text
                // .setPlaceholder('')
                .setValue(this.settings.publishUrl)
                .onChange(async (value) => {
                    this.settings.publishUrl = value;
                    await this.saveSettings();
                }));

    }
}
