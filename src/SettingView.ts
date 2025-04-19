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
        linkDiv.createEl('a', { text: 'Sign up for Flowershow →', href: "https://cloud.flowershow.app/login?utm_source=obsidian&utm_medium=referral" });

        this.settingsRootElement.createEl('h3', { text: 'GitHub Authentication' }).prepend(getIcon("github"));
        this.initializeGitHubUserNameSetting();
        this.initializeGitHubRepoSetting();
        this.initializeGitHubTokenSetting();
		  	this.settingsRootElement.createEl('h3', { text: 'GitHub path' });
				this.initializeGitHubNotesPath();
				this.initializeGitHubAssetsPath();

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
            .setName('Repository name')
            .setDesc('Name of the GitHub repository linked to your Flowershow site')
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
            .setName('Username')
            .setDesc('Your GitHub username')
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
                "GitHub personal access token with repository permissions. You can generate one ";
            span.createEl("a", null, (link) => {
                link.href = "https://github.com/settings/tokens/new?scopes=repo";
                link.innerText = "here!";
            });
        });

        new Setting(this.settingsRootElement)
            .setName('Personal Access Token')
            .setDesc(desc)
            .addText(text => text
                .setPlaceholder('Secret Token')
                .setValue(this.settings.githubToken)
                .onChange(async (value) => {
                    this.settings.githubToken = value;
                    await this.saveSettings();
                }));

    }

		private initializeGitHubNotesPath() {
			new Setting(this.settingsRootElement)
				.setName('Git Notes Path')
				.setDesc('Your path to notes')
				.addText(text => text
					.setPlaceholder('content/')
					.setValue(this.settings.notesRepoPath)
					.onChange(async (value) => {
						this.settings.notesRepoPath = value;
						await this.saveSettings();
					}));

		}

	private initializeGitHubAssetsPath() {
		new Setting(this.settingsRootElement)
			.setName('Git Assets Path')
			.setDesc('Your path to assets')
			.addText(text => text
				.setPlaceholder('public/')
				.setValue(this.settings.assetsRepoPath)
				.onChange(async (value) => {
					this.settings.assetsRepoPath = value;
					await this.saveSettings();
				}));

	}

}
