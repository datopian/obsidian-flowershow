// DONE
export default class PublishStatusBar {
    publishCounter: number;
    publishTotal: number;
    deleteCounter: number;
    deleteTotal: number;

    statusBarItem: HTMLElement;
    status: HTMLElement;

    constructor({
      statusBarItem,
      filesToPublishCount,
      filesToDeleteCount
    }:{
      statusBarItem: HTMLElement,
      filesToPublishCount: number,
      filesToDeleteCount: number,
    }) {
      this.statusBarItem = statusBarItem;
      this.publishCounter = 0;
      this.publishTotal = filesToPublishCount;
      this.deleteCounter = 0;
      this.deleteTotal = filesToDeleteCount;

      this.statusBarItem.createEl("span", { text: "💐: " });
      this.status = this.statusBarItem.createEl("span");
      this.updateStatus();
    }

    incrementPublish() {
        ++this.publishCounter;
        this.updateStatus();
    }

    incrementDelete() {
        ++this.deleteCounter;
        this.updateStatus();
    }

    private updateStatus() {
        const publishStatus = this.publishTotal > 0
            ? `Publishing: ${this.publishCounter}/${this.publishTotal}`
            : '';
        const deleteStatus = this.deleteTotal > 0
            ? `Deleting: ${this.deleteCounter}/${this.deleteTotal}`
            : '';
        
        if (publishStatus && deleteStatus) {
            this.status.innerText = `⌛ ${publishStatus}, ${deleteStatus}`;
        } else if (publishStatus) {
            this.status.innerText = `⌛ ${publishStatus}`;
        } else if (deleteStatus) {
            this.status.innerText = `⌛ ${deleteStatus}`;
        }
    }

    finish(displayDurationMillisec: number) {
        const publishStatus = this.publishTotal > 0
            ? `Published: ${this.publishCounter}/${this.publishTotal}`
            : '';
        const deleteStatus = this.deleteTotal > 0
            ? `Deleted: ${this.deleteCounter}/${this.deleteTotal}`
            : '';
        
        if (publishStatus && deleteStatus) {
            this.status.innerText = `${publishStatus}, ${deleteStatus}`;
        } else if (publishStatus) {
            this.status.innerText = `${publishStatus}`;
        } else if (deleteStatus) {
            this.status.innerText = `${deleteStatus}`;
        }

        setTimeout(() => {
            this.statusBarItem.remove();
        }, displayDurationMillisec);
    }

    error() {
        this.statusBarItem.remove();
    }
}
