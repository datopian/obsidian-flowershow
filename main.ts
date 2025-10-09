import { App, Notice, Plugin, PluginSettingTab, addIcon, Modal, TFile, PluginManifest } from 'obsidian';

import { IFlowershowSettings, DEFAULT_SETTINGS } from 'src/settings';
import Publisher, { IPublisher } from 'src/Publisher';
import PublishStatusBar from 'src/PublishStatusBar';
import PublishStatusManager from 'src/PublishStatusManager';
import PublishStatusModal from 'src/PublishStatusModal';
import SettingView from 'src/SettingView';
import SiteManager, { ISiteManager } from 'src/SiteManager';

import { flowershowIcon } from 'src/constants';
import { FlowershowError } from 'src/utils';


export default class Flowershow extends Plugin {
  private startupAnalytics: string[] = [];
  private lastLogTimestamp: number;
  private loadTimestamp:number;
	private publishStatusModal: PublishStatusModal;

	public settings: IFlowershowSettings;
	public publisher: IPublisher;
	public siteManager: ISiteManager;
	public publishStatusManager: PublishStatusManager;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.loadTimestamp = Date.now();
    this.lastLogTimestamp = this.loadTimestamp;
    this.startupAnalytics = [];
  }

	async onload() {
    this.logStartupEvent("Plugin Constructor ready, starting onload()");

		await this.loadSettings();
		this.publisher = new Publisher(this.app, this.settings);
		this.siteManager = new SiteManager(this.app.metadataCache, this.settings);
		this.publishStatusManager = new PublishStatusManager(this.siteManager, this.publisher);

		this.addSettingTab(new FlowershowSettingTab(this.app, this));
		await this.addCommands();

		addIcon('flowershow-icon', flowershowIcon);
		this.addRibbonIcon("flowershow-icon", "Publish with Flowershow", async () => {
			this.openPublishStatusModal();
		});
	}

  onunload() {
    // TODO
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
			name: 'Publish single note',
			checkCallback: (checking) => {
				if (checking) {
          const currentFile = this.app.workspace.getActiveFile();
					return !!currentFile && currentFile.extension === "md"
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
      if (!currentFile) {
        new Notice("No file is open. Open a note and try again.");
        return;
      }
      if (currentFile.extension !== "md") {
        new Notice("This isn’t a Markdown file. Open a .md note and try again.");
        return;
      }
      new Notice("Publishing note...");
      await this.publisher.publishNote(currentFile);
      new Notice("✅ Note published!");
    } catch (e: any) {
      console.error(e);
      if (e instanceof FlowershowError) {
        new Notice(`❌ Can't publish note: ${e.message}`);
      } else {
        new Notice(`❌ Can't publish note`);
      }
    }
  }

	async publishAllNotes() {
		const statusEl = this.addStatusBarItem();
		try {

			new Notice('Processing files to publish...');

			const { unpublishedNotes, changedNotes, deletedNotePaths } = await this.publishStatusManager.getPublishStatus();
			const notesToPublish: TFile[] = changedNotes.concat(unpublishedNotes);
			const notesToDelete: string[] = deletedNotePaths;
			// TODO what about images to publish?
			const filesRequiringActionCount = notesToPublish.length + notesToDelete.length;

			const statusBar = new PublishStatusBar(statusEl, filesRequiringActionCount);

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

    statusBar.finish(8000); // if this DOESN’T remove, then:
    // statusEl.remove();
		} catch (e) {
			statusEl.remove();
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
      this.publishStatusModal = new PublishStatusModal(
        this.app,
        this.publishStatusManager,
        this.publisher,
        this.settings
      );
    }
    this.publishStatusModal.open();
  }

  public logStartupEvent(message:string) {
    const timestamp = Date.now();
    this.startupAnalytics.push(`${message}\nTotal: ${timestamp - this.loadTimestamp}ms Delta: ${timestamp - this.lastLogTimestamp}ms\n`);
    this.lastLogTimestamp = timestamp;
  }
}

class FlowershowSettingTab extends PluginSettingTab {
	plugin: Flowershow;

	constructor(app: App, plugin: Flowershow) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
    containerEl.empty()

		const settingView = new SettingView(
      containerEl,
      this.plugin.publisher,
      this.plugin.settings,
      async () => {
        await this.plugin.saveData(this.plugin.settings)
        // rebuild dependents to pick up new settings
        this.plugin.publisher = new Publisher(this.app, this.plugin.settings);
        this.plugin.siteManager = new SiteManager(this.app.metadataCache, this.plugin.settings);
        this.plugin.publishStatusManager = new PublishStatusManager(this.plugin.siteManager, this.plugin.publisher);
      });
		settingView.initialize();
	}
}



