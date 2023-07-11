import { App, Notice, Plugin, PluginSettingTab, addIcon, Modal, TFile } from 'obsidian';

import { FlowershowSettings, DEFAULT_SETTINGS } from 'src/FlowershowSettings';
import Publisher, { IPublisher } from 'src/Publisher';
import PublishStatusBar from 'src/PublishStatusBar';
import PublishStatusManager from 'src/PublishStatusManager';
import PublishStatusModal from 'src/PublishStatusModal';
import SettingView from 'src/SettingView';
import SiteManager, { ISiteManager } from 'src/SiteManager';

import { seedling } from 'src/constants';


export default class Flowershow extends Plugin {
	appVersion: string;
	settings: FlowershowSettings;

	publishStatusModal: PublishStatusModal;
	publisher: IPublisher;
	siteManager: ISiteManager;
	publishStatusManager: PublishStatusManager;

	async onload() {
		this.appVersion = this.manifest.version;
		console.log("Initializing Flowershow plugin v" + this.appVersion);

		await this.loadSettings();
		this.publisher = new Publisher(this.app.vault, this.app.metadataCache, this.settings);
		this.siteManager = new SiteManager(this.app.metadataCache, this.settings);
		this.publishStatusManager = new PublishStatusManager(this.siteManager, this.publisher);

		this.addSettingTab(new FlowershowSettingTab(this.app, this));
		await this.addCommands();

		addIcon('flowershow-icon', seedling);
		this.addRibbonIcon("flowershow-icon", "Publish with Flowershow", async () => {
			this.openPublishStatusModal();
		});
	}

	// onunload() {
	// }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async addCommands() {

		this.addCommand({
			id: 'publish-note',
			name: 'Publish single note',
			checkCallback: (checking: boolean) => {
				if (checking) {
					return !!this.app.workspace.getActiveFile();
				}
				this.publishSingleNote();
			}
		});

		this.addCommand({
			id: 'publish-all-notes',
			name: 'Publish all notes',
			checkCallback: (checking: boolean) => {
				if (checking) {
					return true
				}
				this.publishAllNotes();
			},
		});
	}

	async publishSingleNote() {
		try {
			const currentFile = this.app.workspace.getActiveFile();
			// if (!currentFile) {
			// 	new Notice("No file is open/active. Please open a file and try again.")
			// 	return;
			// }

			if (currentFile.extension !== 'md') {
				new Notice("The current file is not a markdown file. Please open a markdown file and try again.")
				return;
			}

			new Notice("Publishing note...");

			await this.publisher.publishNote(currentFile);
			new Notice(`✅ Successfully published note to your Flowershow site.`);

		} catch (e) {
			console.error(e)
			new Notice("❌ Unable to publish note, something went wrong.")
		}
	}

	async publishAllNotes() {
		const statusBarItem = this.addStatusBarItem();
		try {

			new Notice('Processing files to publish...');

			const { unpublishedNotes, changedNotes, deletedNotePaths } = await this.publishStatusManager.getPublishStatus();
			const notesToPublish: TFile[] = changedNotes.concat(unpublishedNotes);
			const notesToDelete: string[] = deletedNotePaths;
			// TODO what about images to publish?
			const filesRequiringActionCount = notesToPublish.length + notesToDelete.length;

			const statusBar = new PublishStatusBar(statusBarItem, filesRequiringActionCount);

			new Notice(`Publishing ${notesToPublish.length} notes and deleting ${notesToDelete.length} notes.`, 8000);

			for (const file of notesToPublish) {
				try {
					statusBar.increment();
					await this.publisher.publishNote(file);
				} catch {
					new Notice(`Unable to publish note ${file.path}, skipping it.`)
				}
			}
			for (const path of notesToDelete) {
				try {
					// statusBar.increment();
					await this.publisher.unpublishNote(path);
				} catch {
					new Notice(`Unable to delete note ${path}, skipping it.`)
				}
			}

			statusBar.finish(8000);

		} catch (e) {
			statusBarItem.remove();
			console.error(e)
			new Notice("Unable to publish multiple notes, something went wrong.")
		}
	}

	// async copyNoteUrlToClipboard() {
	// 	try {
	// 		const currentFile = this.app.workspace.getActiveFile();
	// 		if (!currentFile) {
	// 			new Notice("No file is open/active. Please open a file and try again.")
	// 			return;
	// 		}

	// 		const fullUrl = this.siteManager.getNoteUrl(currentFile);

	// 		await navigator.clipboard.writeText(fullUrl);
	// 		new Notice(`Note URL copied to clipboard`);
	// 	} catch (e) {
	// 		console.log(e)
	// 		new Notice("Unable to copy note URL to clipboard, something went wrong.")
	// 	}
	// }

	// async addPublishFlag() {
	// 	const engine = new ObsidianFrontMatterEngine(this.app.vault, this.app.metadataCache, this.app.workspace.getActiveFile());
	// 	engine.set("dgpublish", true).apply();
	// }

	openPublishStatusModal() {
		if (!this.publishStatusModal) {
			const siteManager = new SiteManager(this.app.metadataCache, this.settings);
			const publisher = new Publisher(this.app.vault, this.app.metadataCache, this.settings);
			const publishStatusManager = new PublishStatusManager(siteManager, publisher);
			this.publishStatusModal = new PublishStatusModal(this.app, publishStatusManager, publisher, this.settings);
		}
		this.publishStatusModal.open();
	}

}

class FlowershowSettingTab extends PluginSettingTab {
	plugin: Flowershow;

	constructor(app: App, plugin: Flowershow) {
		super(app, plugin);
		this.plugin = plugin;

		// if (!this.plugin.settings.noteSettingsIsInitialized) {
		// 	const siteManager = new SiteManager(this.app.metadataCache, this.plugin.settings);
		// 	siteManager.updateEnv();
		// 	this.plugin.settings.noteSettingsIsInitialized = true;
		// 	this.plugin.saveData(this.plugin.settings);
		// }
	}


	async display(): Promise<void> {
		const { containerEl } = this;
		const settingView = new SettingView(this.app, containerEl, this.plugin.settings, async () => await this.plugin.saveData(this.plugin.settings));
		const prModal = new Modal(this.app)
		await settingView.initialize(prModal);
	}
}



