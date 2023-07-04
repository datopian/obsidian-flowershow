import { Notice, Plugin, addIcon, TFile } from 'obsidian';

import { FlowershowSettings, DEFAULT_SETTINGS } from 'src/FlowershowSettings';
import Publisher, { IPublisher } from 'src/Publisher';
import PublishStatusBar from 'src/PublishStatusBar';
import PublishStatusManager from 'src/PublishStatusManager';
import PublishStatusModal from 'src/PublishStatusModal';
import StorageManager, { IStorageManager } from 'src/StorageManager';
import SettingTab from "src/SettingTab";

import { seedling } from 'src/constants';

export default class Flowershow extends Plugin {
	appVersion: string;
	settings: FlowershowSettings;

	publishStatusModal: PublishStatusModal;
	publisher: IPublisher;
	storageManager: IStorageManager;
	publishStatusManager: PublishStatusManager;

	async onload() {
		this.appVersion = this.manifest.version;
		console.log("Initializing Flowershow plugin v" + this.appVersion);

		await this.loadSettings();
		this.publisher = new Publisher(this.app.vault, this.app.metadataCache, this.settings);
		this.storageManager = new StorageManager(this.settings.R2url);
		this.publishStatusManager = new PublishStatusManager(this.app.vault, this.storageManager, this.publisher);

		this.addSettingTab(new SettingTab(this.app, this));
		await this.addCommands();

		addIcon('digital-garden-icon', seedling);
		this.addRibbonIcon("digital-garden-icon", "Digital Garden Publication Center", async () => {
			this.openPublishStatusModal();
		});
	}

	onunload() {
		console.log('unloading plugin')
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async addCommands() {

		this.addCommand({
			id: 'publish-note',
			name: 'Publish Single Note',
			checkCallback: (checking: boolean) => {
				if (checking) {
					return !!this.app.workspace.getActiveFile();
				}
				this.publishSingleNote();
			}
		});

		this.addCommand({
			id: 'publish-all-notes',
			name: 'Publish All Notes',
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

			console.log({ unpublishedNotes, changedNotes, deletedNotePaths });

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
			const siteManager = new StorageManager(this.settings.R2url);
			const publisher = new Publisher(this.app.vault, this.app.metadataCache, this.settings);
			const publishStatusManager = new PublishStatusManager(this.app.vault, siteManager, publisher);
			this.publishStatusModal = new PublishStatusModal(this.app, publishStatusManager, publisher, this.settings);
		}
		this.publishStatusModal.open();
	}

}
