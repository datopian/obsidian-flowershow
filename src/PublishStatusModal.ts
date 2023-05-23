import { App, ButtonComponent, Modal } from "obsidian";

import { FlowershowSettings } from "./FlowershowSettings";
import { IPublisher } from "./Publisher";
import { IPublishStatusManager, PublishStatus } from "./PublishStatusManager";


export interface IPublishStatusModal {
    open(): void;
}

export default class PublishStatusModal implements IPublishStatusModal {
    private modal: Modal;
    // private settings: FlowershowSettings;
    private publishStatusManager: IPublishStatusManager;
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
        // this.settings = settings;
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
        this.modal.titleEl.innerText = "🌷 Flowershow";
        this.modal.contentEl.addClass("digital-garden-publish-status-view");
        this.modal.contentEl.createEl("h2", { text: "Publication Status" });
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
        this.publishedList.innerHTML = publishedNotes.map(file => `<li>${file.path}</li>`).join("");
        this.unpublishedCounter.textContent = `(${unpublishedNotes.length} notes)`;
        this.unpublishedList.innerHTML = unpublishedNotes.map(file => `<li>${file.path}</li>`).join("");
        this.changedCounter.textContent = `(${changedNotes.length} notes)`;
        this.changedList.innerHTML = changedNotes.map(file => `<li>${file.path}</li>`).join("");
        this.deletedCounter.textContent = `(${deletedNotePaths.length} notes)`;
        this.deletedList.innerHTML = deletedNotePaths.map(file => `<li>${file}</li>`).join("");
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
        this.publishedList.innerHTML = ``;
        this.changedCounter.textContent = ``;
        this.changedList.innerHTML = ``;
        this.deletedCounter.textContent = ``;
        this.deletedList.innerHTML = ``;
        this.unpublishedCounter.textContent = ``;
        this.unpublishedList.innerHTML = ``;
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
