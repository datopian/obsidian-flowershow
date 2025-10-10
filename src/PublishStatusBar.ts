// DONE
export default class PublishStatusBar {
    statusBarItem: HTMLElement;
    status: HTMLElement;

    publishCounter: number;
    publishTotal: number;
    deleteCounter: number;
    deleteTotal: number;

    constructor(statusBarItem: HTMLElement) {
      this.statusBarItem = statusBarItem;
      this.publishCounter = 0;
      this.deleteCounter = 0;
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

    start({
      publishTotal = 0,
      deleteTotal = 0
    }: {
      publishTotal?: number,
      deleteTotal?: number
    }) { 
      if (!publishTotal && !deleteTotal) return;
      this.publishTotal = publishTotal;
      this.deleteTotal = deleteTotal;
      this.status = this.statusBarItem.createEl("span", { text: "💐: " });
      this.updateStatus();
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
            this.status.remove();
        }, displayDurationMillisec);
    }

    error() {
        this.status.remove();
    }
}
