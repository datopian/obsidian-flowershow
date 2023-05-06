import { TFile } from "obsidian";

import { ISiteManager } from "./SiteManager";
import { IPublisher } from "./Publisher";
import { generateBlobHash } from "./utils";


export interface PublishStatus {
    unpublishedNotes: Array<TFile>;
    publishedNotes: Array<TFile>;
    changedNotes: Array<TFile>;
    deletedNotePaths: Array<string>;
    deletedImagePaths: Array<string>;
}

export interface IPublishStatusManager {
    getPublishStatus(): Promise<PublishStatus>;
}

export default class PublishStatusManager implements IPublishStatusManager {
    private siteManager: ISiteManager;
    private publisher: IPublisher;

    constructor(siteManager: ISiteManager, publisher: IPublisher) {
        this.siteManager = siteManager;
        this.publisher = publisher;
    }

    // DONE
    async getPublishStatus(): Promise<PublishStatus> {
        const unpublishedNotes: Array<TFile> = [];
        const publishedNotes: Array<TFile> = [];
        const changedNotes: Array<TFile> = [];

        const remoteNoteHashes = await this.siteManager.getNoteHashes();
        const remoteImageHashes = await this.siteManager.getImageHashes();

        const { notes, images } = await this.publisher.getFilesMarkedForPublishing();

        for (const file of notes) {
            const remoteHash = remoteNoteHashes[file.path];
            if (!remoteHash) {
                unpublishedNotes.push(file);
            } else {
                publishedNotes.push(file);
                const content = await this.publisher.prepareMarkdown(file);
                const localHash = generateBlobHash(content);
                if (remoteHash !== localHash) {
                    changedNotes.push(file);
                }
            }
        }

        const deletedNotePaths = this.getDeletedPaths(Object.keys(remoteNoteHashes), notes.map((f) => f.path));
        const deletedImagePaths = this.getDeletedPaths(Object.keys(remoteImageHashes), images);

        unpublishedNotes.sort();
        publishedNotes.sort();
        changedNotes.sort();
        deletedNotePaths.sort();

        return { unpublishedNotes, publishedNotes, changedNotes, deletedNotePaths, deletedImagePaths };
    }

    // DONE
    private getDeletedPaths(remotePaths: Array<string>, localPaths: Array<string>): Array<string> {
        return remotePaths.filter((p) => !localPaths.includes(p))
    }
}
