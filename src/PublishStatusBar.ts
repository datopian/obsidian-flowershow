// DONE
export default class PublishStatusBar {
    publishCounter: number;
    publishTotal: number;

    statusBarItem: HTMLElement;
    status: HTMLElement;

    constructor(statusBarItem: HTMLElement, notesToPublishCount: number) {
        this.statusBarItem = statusBarItem;
        this.publishCounter = 0;
        this.publishTotal = notesToPublishCount;

        this.statusBarItem.createEl("span", { text: "Flowershow: " });
        this.status = this.statusBarItem.createEl("span");
    }

    increment() {
        ++this.publishCounter;
        this.status.innerText = `⌛ Publishing notes: ${this.publishCounter}/${this.publishTotal}`;
    }

    finish(displayDurationMillisec: number) {
        this.status.innerText = `✅ Published notes: ${this.publishCounter}/${this.publishTotal}`;
        setTimeout(() => {
            this.statusBarItem.remove();
        }, displayDurationMillisec);
    }

    error() {
        this.statusBarItem.remove();
    }
}
