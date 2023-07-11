import { FlowershowSettings } from './FlowershowSettings';
import { Modal, Notice, Setting, App, debounce, MetadataCache, getIcon } from 'obsidian';
import SiteManager from './SiteManager';

export default class SettingView {
    private app: App;
    private settings: FlowershowSettings;
    private saveSettings: () => Promise<void>;
    private settingsRootElement: HTMLElement;
    debouncedSaveAndUpdate = debounce(this.saveSiteSettingsAndUpdateEnv, 500, true);

    constructor(app: App, settingsRootElement: HTMLElement, settings: FlowershowSettings, saveSettings: () => Promise<void>) {
        this.app = app;
        this.settingsRootElement = settingsRootElement;
        this.settingsRootElement.classList.add("dg-settings");
        this.settings = settings;
        this.saveSettings = saveSettings;
    }

    async initialize(prModal: Modal) {
        this.settingsRootElement.empty();
        this.settingsRootElement.createEl('h1', { text: 'Flowershow Settings' });
        const linkDiv = this.settingsRootElement.createEl('div');
        linkDiv.addClass("pr-link");
        linkDiv.createEl('span', { text: 'Remember to read the setup guide if you haven\'t already. It can be found ' });
        linkDiv.createEl('a', { text: 'here.', href: "https://github.com/datopian/obsidian-flowershow" });

        this.settingsRootElement.createEl('h3', { text: 'GitHub Authentication (required)' }).prepend(getIcon("github"));
        this.initializeGitHubRepoSetting();
        this.initializeGitHubUserNameSetting();
        this.initializeGitHubTokenSetting();
    }

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

    private initializeGitHubRepoSetting() {
        new Setting(this.settingsRootElement)
            .setName('GitHub repo name')
            .setDesc('The name of the GitHub repository')
            .addText(text => text
                .setPlaceholder('mygithubrepo')
                .setValue(this.settings.githubRepo)
                .onChange(async (value) => {
                    this.settings.githubRepo = value;
                    await this.saveSettings();
                }));

    }

    private initializeGitHubUserNameSetting() {
        new Setting(this.settingsRootElement)
            .setName('GitHub Username')
            .setDesc('Your GitHub Username')
            .addText(text => text
                .setPlaceholder('myusername')
                .setValue(this.settings.githubUserName)
                .onChange(async (value) => {
                    this.settings.githubUserName = value;
                    await this.saveSettings();
                }));

    }

    private initializeGitHubTokenSetting() {
        const desc = document.createDocumentFragment();
        desc.createEl("span", null, (span) => {
            span.innerText =
                "A GitHub token with repo permissions. You can generate it ";
            span.createEl("a", null, (link) => {
                link.href = "https://github.com/settings/tokens/new?scopes=repo";
                link.innerText = "here!";
            });
        });

        new Setting(this.settingsRootElement)
            .setName('GitHub token')
            .setDesc(desc)
            .addText(text => text
                .setPlaceholder('Secret Token')
                .setValue(this.settings.githubToken)
                .onChange(async (value) => {
                    this.settings.githubToken = value;
                    await this.saveSettings();
                }));

    }
}
