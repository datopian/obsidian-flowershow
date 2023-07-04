import { TFile } from "obsidian";

import { IStorageManager } from "./StorageManager";
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
    private storageManager: IStorageManager;
    private publisher: IPublisher;

    constructor(storageManager: IStorageManager, publisher: IPublisher) {
        this.storageManager = storageManager;
        this.publisher = publisher;
    }

    async getPublishStatus(): Promise<PublishStatus> {
        const unpublishedNotes: Array<TFile> = [];
        const publishedNotes: Array<TFile> = [];
        const changedNotes: Array<TFile> = [];

        const remoteNoteHashes = await this.storageManager.getObjectsHashes();
        // const remoteImageHashes = await this.siteManager.getImageHashes();

        const { notes, assets } = await this.publisher.getFilesMarkedForPublishing();

        for (const file of notes) {
            const remoteHash = remoteNoteHashes[file.path];
            if (!remoteHash) {
                unpublishedNotes.push(file);
            } else {
                publishedNotes.push(file);
                const [markdown,] = await this.publisher.prepareMarkdown(file);
                const localHash = generateBlobHash(markdown);
                if (remoteHash !== localHash) {
                    changedNotes.push(file);
                }
            }
        }

        const deletedNotePaths = this.getDeletedPaths(Object.keys(remoteNoteHashes), notes.map((f) => f.path));
        // const deletedImagePaths = this.getDeletedPaths(Object.keys(remoteImageHashes), assets);

        unpublishedNotes.sort();
        publishedNotes.sort();
        changedNotes.sort();
        deletedNotePaths.sort();

        // return { unpublishedNotes, publishedNotes, changedNotes, deletedNotePaths, deletedImagePaths };
        return { unpublishedNotes, publishedNotes, changedNotes, deletedNotePaths, deletedImagePaths: [] };
    }

    private getDeletedPaths(remotePaths: Array<string>, localPaths: Array<string>): Array<string> {
        return remotePaths.filter((p) => !localPaths.includes(p))
    }
}
