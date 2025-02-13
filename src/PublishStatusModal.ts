import { App, ButtonComponent, Modal } from "obsidian";

import { FlowershowSettings } from "./FlowershowSettings";
import { IPublisher } from "./Publisher";
import { IPublishStatusManager, PublishStatus } from "./PublishStatusManager";


export interface IPublishStatusModal {
    open(): void;
}

export default class PublishStatusModal implements IPublishStatusModal {
    private modal: Modal;
    private settings: FlowershowSettings;
    private publishStatusManager: IPublishStatusManager;
    private app: App;
    private publisher: IPublisher;
    private publishStatus: PublishStatus;

    private publishedList: HTMLElement;
    private publishedCounter: HTMLElement;
    private changedList: HTMLElement;
    private changedCounter: HTMLElement;
    private deletedList: HTMLElement;
    private deletedCounter: HTMLElement;
    private unpublishedList: HTMLElement;
    private unpublishedCounter: HTMLElement;
    private progressContainer: HTMLElement;

    constructor(app: App, publishStatusManager: IPublishStatusManager, publisher: IPublisher, settings: FlowershowSettings) {
        this.modal = new Modal(app);
        this.app = app;
        this.settings = settings;
        this.publishStatusManager = publishStatusManager;
        this.publisher = publisher;

        this.initialize();
    }

    // DONE
    open() {
        this.modal.open();
    }

    // DONE
    private async initialize() {
        this.modal.contentEl.addClass("digital-garden-publish-status-view");
        
        // Add GitHub repository header with link
        const headerEl = this.modal.contentEl.createEl("div", { cls: "publish-header" });
        headerEl.style.display = "flex";
        headerEl.style.justifyContent = "space-between";
        headerEl.style.alignItems = "center";
        headerEl.style.marginBottom = "20px";
        headerEl.style.padding = "10px";
        headerEl.style.borderBottom = "1px solid var(--background-modifier-border)";
        
        const headerLeft = headerEl.createEl("div");
        const repoUrl = `https://github.com/${this.settings.githubUserName}/${this.settings.githubRepo}`;
        const headerText = headerLeft.createEl("p", { cls: "publish-header-text" });
        headerText.style.margin = "0";
        headerText.setText("Publishing to ");
        
        const link = headerText.createEl("a", {
            text: `${this.settings.githubUserName}/${this.settings.githubRepo}`,
            href: repoUrl
        });
        link.style.color = "var(--text-accent)";
        link.style.textDecoration = "none";

        // Add settings icon
        const settingsIcon = headerEl.createEl("div", { cls: "clickable-icon" });
        settingsIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        settingsIcon.style.cursor = "pointer";
        settingsIcon.addEventListener("click", () => {
            this.modal.close();
            this.app.setting.open();
            this.app.setting.openTabById("obsidian-flowershow")
        });
        
        this.progressContainer = this.modal.contentEl.createEl("div");
        this.progressContainer.addClass("progress-container");

        [this.publishedCounter, this.publishedList] = this.createSection("Published", null, null);
        [this.changedCounter, this.changedList] = this.createSection("Changed", "Update changed notes", async () => this.publishChangedNotes());
        [this.unpublishedCounter, this.unpublishedList] = this.createSection("Unpublished", "Publish unpublished notes", async () => this.publishUnpublishedNotes());
        [this.deletedCounter, this.deletedList] = this.createSection("Deleted", "Delete notes from site", async () => this.unpublishNotes());

        this.modal.onOpen = () => this.initView();
        this.modal.onClose = () => this.clearStatus(); // TODO: is this even needed?
    }

    // DONE
    private createSection(title: string, buttonText: string, buttonCallback: () => Promise<void>): Array<HTMLElement> {
        const headerContainer = this.modal.contentEl.createEl("div");
        headerContainer.addClass("header-container");
        const collapsableList = this.modal.contentEl.createEl("ul");
        const titleContainer = headerContainer.createEl("div");
        titleContainer.addClass("title-container");
        const toggleHeader = titleContainer.createEl("h3", { text: `➕️ ${title}`, attr: { class: "collapsable collapsed" } });
        const counter = titleContainer.createEl("span");
        counter.addClass("count");

        collapsableList.hide();

        if (buttonText && buttonCallback) {
            const button = new ButtonComponent(headerContainer)
                .setButtonText(buttonText)
                .onClick(async (event) => {
                    event.stopPropagation();
                    button.setDisabled(true);
                    await buttonCallback();
                    button.setDisabled(false);
                });
        }

        headerContainer.onClickEvent(() => {
            if (collapsableList.isShown()) {
                toggleHeader.textContent = `➕️ ${title}`;
                collapsableList.hide();
                toggleHeader.removeClass("open");
                toggleHeader.addClass("collapsed");
            } else {
                toggleHeader.textContent = `➖ ${title}`;
                collapsableList.show()
                toggleHeader.removeClass("collapsed");
                toggleHeader.addClass("open");
            }
        });

        return [counter, collapsableList];
    }

    // DONE
    private async populateStatus() {
        this.publishStatus = await this.publishStatusManager.getPublishStatus();
        const { publishedNotes, unpublishedNotes, changedNotes, deletedNotePaths } = this.publishStatus;

        this.publishedCounter.textContent = `(${publishedNotes.length} notes)`;

        this.publishedList.textContent = '';
        publishedNotes.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.path;
            this.publishedList.appendChild(li);
        });

        this.unpublishedCounter.textContent = `(${unpublishedNotes.length} notes)`;

        this.unpublishedList.textContent = '';
        unpublishedNotes.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.path;
            this.unpublishedList.appendChild(li);
        });

        this.changedCounter.textContent = `(${changedNotes.length} notes)`;

        this.changedList.textContent = '';
        changedNotes.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.path;
            this.changedList.appendChild(li);
        });

        this.deletedCounter.textContent = `(${deletedNotePaths.length} notes)`;

        this.deletedList.textContent = '';
        deletedNotePaths.forEach(path => {
            const li = document.createElement('li');
            li.textContent = path;
            this.deletedList.appendChild(li);
        });
    }

    private async initView() {
        this.progressContainer.innerText = `⌛ Loading publication status`;
        await this.populateStatus();
        this.progressContainer.innerText = ``;
    }

    // DONE
    private async refreshStatus() {
        await this.populateStatus();
    }

    // DONE
    private async clearStatus() {
        this.publishedCounter.textContent = ``;
        this.publishedList.textContent = ``;
        this.changedCounter.textContent = ``;
        this.changedList.textContent = ``;
        this.deletedCounter.textContent = ``;
        this.deletedList.textContent = ``;
        this.unpublishedCounter.textContent = ``;
        this.unpublishedList.textContent = ``;
    }

    // DONE
    private async publishUnpublishedNotes() {
        const { unpublishedNotes } = this.publishStatus;

        let counter = 0;

        try {
            for (const note of unpublishedNotes) {
                this.progressContainer.innerText = `⌛ Publishing unpublished notes: ${counter + 1}/${unpublishedNotes.length}`;
                await this.publisher.publishNote(note);
                counter++;
            }
            this.progressContainer.innerText = `✅ Published all unpublished notes: ${counter}/${unpublishedNotes.length}`;

        } catch (error) {
            this.progressContainer.innerText = `❌ Error while publishing note ${unpublishedNotes[counter]}: ${error.message}`;
        }

        setTimeout(() => {
            this.progressContainer.innerText = "";
        }, 5000)
        await this.refreshStatus();
    }

    // DONE
    private async publishChangedNotes() {
        const publishStatus = await this.publishStatusManager.getPublishStatus();
        const changed = publishStatus.changedNotes;
        let counter = 0;
        for (const note of changed) {
            this.progressContainer.innerText = `⌛ Publishing changed notes: ${++counter}/${changed.length}`;
            await this.publisher.publishNote(note);
        }

        const publishedText = `✅ Published all changed notes: ${counter}/${changed.length}`;
        this.progressContainer.innerText = publishedText;
        setTimeout(() => {
            if (this.progressContainer.innerText === publishedText) {
                this.progressContainer.innerText = "";
            }
        }, 5000)

        await this.refreshStatus();
    }

    // DONE
    private async unpublishNotes() {
        const { deletedNotePaths } = this.publishStatus;

        let counter = 0;

        try {
            for (const note of deletedNotePaths) {
                this.progressContainer.innerText = `⌛ Deleting Notes: ${counter + 1}/${deletedNotePaths.length}`;
                await this.publisher.unpublishNote(note);
                counter++;
            }
            this.progressContainer.innerText = `✅ Deleted all notes: ${counter}/${deletedNotePaths.length}`;
        } catch (error) {
            this.progressContainer.innerText = `❌ Error while deleting note ${deletedNotePaths[counter]}: ${error.message}`;
        }

        setTimeout(() => {
            this.progressContainer.innerText = "";
        }, 5000);

        await this.refreshStatus();
    }
}
