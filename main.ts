import { App, Notice, Plugin, PluginSettingTab, addIcon, Modal, TFile, PluginManifest } from 'obsidian';

import { IFlowershowSettings, DEFAULT_SETTINGS } from 'src/settings';
import Publisher from 'src/Publisher';
import PublishStatusBar from 'src/PublishStatusBar';
import { PublishStatusModal } from 'src/components/PublishStatusModal';
import SettingView from 'src/SettingView';

import { flowershowIcon } from 'src/constants';
import { FlowershowError, createPRNotice } from 'src/utils';


export default class Flowershow extends Plugin {
  private startupAnalytics: string[] = [];
  private lastLogTimestamp: number;
  private loadTimestamp:number;
 private publishStatusModal: PublishStatusModal;
  private statusBarItem: HTMLElement;
  public statusBar: PublishStatusBar;

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

    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.addClass('mod-clickable');
    this.statusBarItem.createEl('span', { text: "💐" })
    this.statusBarItem.addEventListener('click', () => {
      this.openPublishStatusModal();
    });
    const statusContainer = this.statusBarItem.createSpan()
    this.statusBar = new PublishStatusBar(statusContainer);

  this.publisher = new Publisher(this.app, this.settings, this.statusBar);

		this.addSettingTab(new FlowershowSettingTab(this.app, this));
		await this.addCommands();

		addIcon('flowershow-icon', flowershowIcon);
		this.addRibbonIcon("flowershow-icon", "Publish with Flowershow", async () => {
			this.openPublishStatusModal();
		});
	}

  onunload() {
    if (this.statusBarItem) {
      this.statusBarItem.remove();
    }
  }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async addCommands() {

		this.addCommand({
			id: 'publish-single-note',
			name: 'Publish single note (with embeds)',
			checkCallback: (checking) => {
				if (checking) {
          const currentFile = this.app.workspace.getActiveFile();
					return !!currentFile && currentFile.extension === "md"
				}
				this.publishSingleNote();
			}
		});

		this.addCommand({
			id: 'publish-all-files',
			name: 'Publish all',
			checkCallback: (checking: boolean) => {
				if (checking) {
					return true
				}
				this.publishAllFiles();
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
      new Notice("⌛ Publishing note...");
      const result = await this.publisher.publishNote(currentFile);
      const frag = createPRNotice(
        "Published note.",
        result.prNumber,
        result.prUrl,
        result.merged
      );
      new Notice(frag, 8000);
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

  // Publish new or changed files, and unpublish deleted files
	async publishAllFiles() {
		try {
			const { changedFiles, deletedFiles, newFiles } = await this.publisher.getPublishStatus();
      // console.log({ changedFiles, deletedFiles, newFiles })

      const filesToDelete = deletedFiles;
      const filesToPublish = changedFiles.concat(newFiles);

      if (!filesToDelete.length && !filesToPublish.length) {
			  new Notice("❌ Nothing new to publish or delete.");
        return
      }

      const result = await this.publisher.publishBatch({
        filesToPublish,
        filesToDelete
      });

      const frag = createPRNotice(
        `Published ${filesToPublish.length + filesToDelete.length} notes.`,
        result.prNumber,
        result.prUrl,
        result.merged
      );
      new Notice(frag, 8000);

  } catch (e: any) {
   console.error(e);
      if (e instanceof FlowershowError) {
        new Notice(`❌ Can't publish notes: ${e.message}`);
      } else {
        new Notice("❌ Can't publish notes. Check console errors for more info.");
      }
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
        // rebuild publisher to pick up new settings
        this.plugin.publisher = new Publisher(this.app, this.plugin.settings, this.plugin.statusBar);
      });
		settingView.initialize();
	}
}
