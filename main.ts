import { App, Notice, Plugin, PluginSettingTab, addIcon, Modal, TFile, PluginManifest } from 'obsidian';

import { IFlowershowSettings, DEFAULT_SETTINGS } from 'src/settings';
import Publisher from 'src/Publisher';
import PublishStatusBar from 'src/PublishStatusBar';
import { PublishStatusModal } from 'src/components/PublishStatusModal';
import SettingView from 'src/SettingView';

import { flowershowIcon } from 'src/constants';
import { FlowershowError } from 'src/utils';


export default class Flowershow extends Plugin {
  private startupAnalytics: string[] = [];
  private lastLogTimestamp: number;
  private loadTimestamp:number;
	private publishStatusModal: PublishStatusModal;

	public settings: IFlowershowSettings;
	public publisher: Publisher;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.loadTimestamp = Date.now();
    this.lastLogTimestamp = this.loadTimestamp;
    this.startupAnalytics = [];
  }

	async onload() {
    this.logStartupEvent("Plugin Constructor ready, starting onload()");

		await this.loadSettings();

    const statusBarItem = this.addStatusBarItem();
    const statusBar = new PublishStatusBar(statusBarItem);

		this.publisher = new Publisher(this.app, this.settings, statusBar);

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

  /** Publish single note and its embeds */
  // TODO make sure that embeds in frontmatter are published too!
  async publishSingleNote() {
    try {
      const currentFile = this.app.workspace.getActiveFile();
      if (!currentFile) {
        new Notice("No file is open. Open a note and try again.");
        return;
      }
      if (currentFile.extension !== "md") {
        new Notice("This isn't a Markdown file. Open a .md note and try again.");
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
        new Notice(`❌ Can't publish note.`);
      }
      throw e
    }
  }

	async publishAllNotes() {
		try {
			const { changedFiles, deletedFiles, newFiles } = await this.publisher.getPublishStatus();
      console.log({ changedFiles, deletedFiles, newFiles })

      const filesToDelete = deletedFiles;
      const filesToPublish = changedFiles.concat(newFiles);

      if (!filesToDelete.length && !filesToPublish.length) {
			  new Notice("❌ Nothing to publish or delete.");
        return
      }

      await this.publisher.publishBatch({
        filesToPublish,
        filesToDelete
      });

      new Notice("💐 Published!")

		} catch (e: any) {
			console.error(e);
			new Notice("❌ Can't publish notes. Check console errors for more info.");
		}
	}

  openPublishStatusModal() {
    if (!this.publishStatusModal) {
      this.publishStatusModal = new PublishStatusModal(
        {
        app: this.app,
        publisher: this.publisher,
        settings: this.settings
        }
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
        const statusBarItem = this.plugin.addStatusBarItem();
        const statusBar = new PublishStatusBar(statusBarItem);
        this.plugin.publisher = new Publisher(this.app, this.plugin.settings, statusBar);
      });
		settingView.initialize();
	}
}
