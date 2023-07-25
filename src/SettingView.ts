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
        this.settingsRootElement.createEl('h3', { text: 'R2 worker URL (❗️TEMPORARY)' })
        this.initializeR2UrlSetting()

        this.settingsRootElement.createEl('h3', { text: 'Flowershow site settings' }).prepend('🌷 ');
        this.initializeFlowershowSettings();
    }

    // TODO temporary solution
    private initializeR2UrlSetting() {
        new Setting(this.settingsRootElement)
            .setName('R2 Worker URL')
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
            .addText(text => text
                .setValue(this.settings.title)
                .onChange(async (value) => {
                    this.settings.title = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        new Setting(this.settingsRootElement)
            .setName('Site description')
            .addText(text => text
                .setValue(this.settings.description)
                .onChange(async (value) => {
                    this.settings.description = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        new Setting(this.settingsRootElement)
            .setName('Author')
            .addText(text => text
                .setValue(this.settings.author)
                .onChange(async (value) => {
                    this.settings.author = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        new Setting(this.settingsRootElement)
            .setName('Logo')
            .setDesc('Relative path to logo image.')
            .addText(text => text
                .setValue(this.settings.logo)
                .onChange(async (value) => {
                    this.settings.logo = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        // new Setting(this.settingsRootElement)
        //     .setName('Domain')
        //     .addText(text => text
        //         .setValue(this.settings.domain)
        //         .onChange(async (value) => {
        //             this.settings.logo = value;
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        // this.settingsRootElement.createEl('h4', { text: 'Navbar title config' })

        new Setting(this.settingsRootElement)
            .setName('Navbar logo')
            .addText(text => text
                .setValue(this.settings.navbarTitle.logo)
                .onChange(async (value) => {
                    this.settings.navbarTitle.logo = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));


        new Setting(this.settingsRootElement)
            .setName('Navbar text')
            .addText(text => text
                .setValue(this.settings.navbarTitle.text)
                .onChange(async (value) => {
                    this.settings.navbarTitle.text = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        new Setting(this.settingsRootElement)
            .setName('Navbar version')
            .addText(text => text
                .setValue(this.settings.navbarTitle.version)
                .onChange(async (value) => {
                    this.settings.navbarTitle.version = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        // this.settingsRootElement.createEl('hr')

        // new Setting(this.settingsRootElement)
        //     .setName('Show edit link')
        //     .addToggle(toggle => toggle
        //         .setValue(this.settings.showEditLink)
        //         .onChange(async (value) => {
        //             this.settings.showEditLink = value;
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        // new Setting(this.settingsRootElement)
        //     .setName('Edit link root')
        //     .addText(text => text
        //         .setValue(this.settings.editLinkRoot)
        //         .onChange(async (value) => {
        //             this.settings.editLinkRoot = value;
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        new Setting(this.settingsRootElement)
            .setName('Show table of contents')
            .addToggle(toggle => toggle
                .setValue(this.settings.showToc)
                .onChange(async (value) => {
                    this.settings.showToc = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        new Setting(this.settingsRootElement)
            .setName('Show sidebar')
            .addToggle(toggle => toggle
                .setValue(this.settings.showSidebar)
                .onChange(async (value) => {
                    this.settings.showSidebar = value;
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        // this.settingsRootElement.createEl('h4', { text: 'Comments config' })

        // new Setting(this.settingsRootElement)
        //     .setName('Show comments')
        //     .addToggle(toggle => toggle
        //         .setValue(this.settings.showComments)
        //         .onChange(async (value) => {
        //             this.settings.showComments = value;
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        // new Setting(this.settingsRootElement)
        //     .setName('Comments provider')
        //     .addDropdown(dropdown => dropdown
        //         .addOption('disqus', 'Disqus')
        //         .addOption('utterances', 'Utterances')
        //         .addOption('giscus', 'Giscus')
        //         .setValue(this.settings.comments.provider)
        //         .onChange(async (value: 'disqus' | 'utterances' | 'giscus') => {
        //             this.settings.comments.provider = value;
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        // new Setting(this.settingsRootElement)
        //     .setName('Comments pages')
        //     .setDesc('Comma separated list of directories where comments are enabled.')
        //     .addText(text => text
        //         .setValue(this.settings.comments.pages.join(','))
        //         .onChange(async (value) => {
        //             this.settings.comments.pages = value.split(',');
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        // new Setting(this.settingsRootElement)
        //     .setName('Comments config')
        //     .setDesc('Config for the comments provider. See the docs for more info.')
        //     .addTextArea(text => text
        //         .setValue(JSON.stringify(this.settings.comments.config, null, 2))
        //         .onChange(async (value) => {
        //             this.settings.comments.config = JSON.parse(value);
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        // this.settingsRootElement.createEl('hr')

        // new Setting(this.settingsRootElement)
        //     .setName('Google analytics tracking ID')
        //     .addText(text => text
        //         .setValue(this.settings.analytics)
        //         .onChange(async (value) => {
        //             this.settings.analytics = value;
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        new Setting(this.settingsRootElement)
            .setName('Navbar & footer links')
            .setDesc('An array of links to show in the navbar and footer.')
            .addTextArea(text => text
                .setValue(JSON.stringify(this.settings.navLinks, null, 2))
                .onChange(async (value) => {
                    this.settings.comments.config = JSON.parse(value);
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        new Setting(this.settingsRootElement)
            .setName('Social links')
            .setDesc('An array of social links to show in the navbar.')
            .addTextArea(text => text
                .setValue(JSON.stringify(this.settings.social, null, 2))
                .onChange(async (value) => {
                    this.settings.social = JSON.parse(value);
                    this.debouncedSaveSiteSettingsAndUpdateConfig();
                }));

        // new Setting(this.settingsRootElement)
        //     .setName('Search provider')
        //     .setDesc('Search provider to use for the search box in the navbar.')
        //     .addDropdown(dropdown => dropdown
        //         .addOption('algolia', 'Algolia')
        //         .addOption('kbar', 'Kbar')
        //         .setValue(this.settings.search.provider)
        //         .onChange(async (value: 'algolia' | 'kbar') => {
        //             this.settings.search.provider = value;
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        // new Setting(this.settingsRootElement)
        //     .setName('Search config')
        //     .setDesc('Config for the search provider. See the docs for more info.')
        //     .addTextArea(text => text
        //         .setValue(JSON.stringify(this.settings.search.config, null, 2))
        //         .onChange(async (value) => {
        //             this.settings.search.config = JSON.parse(value);
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

        // new Setting(this.settingsRootElement)
        //     .setName('NextSEO config')
        //     .setDesc('Config for the NextSEO component. See the docs for more info.')
        //     .addTextArea(text => text
        //         .setValue(JSON.stringify(this.settings.nextSeo, null, 2))
        //         .onChange(async (value) => {
        //             this.settings.nextSeo = JSON.parse(value);
        //             this.debouncedSaveSiteSettingsAndUpdateConfig();
        //         }));

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
