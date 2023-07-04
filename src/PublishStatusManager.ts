import { TFile, Vault } from "obsidian";

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
    private vault: Vault;
    private storageManager: IStorageManager;
    private publisher: IPublisher;

    constructor(vault: Vault, storageManager: IStorageManager, publisher: IPublisher) {
        this.vault = vault;
        this.storageManager = storageManager;
        this.publisher = publisher;
    }

    async getPublishStatus(): Promise<PublishStatus> {
        const unpublishedNotes: Array<TFile> = [];
        const publishedNotes: Array<TFile> = [];
        const changedNotes: Array<TFile> = [];

        const remoteFilesHashes = await this.storageManager.getObjectsHashes();
        const { notes, assets } = await this.publisher.getNotesAndAssetsToPublish();

        for (const note of notes) {
            const remoteHash = remoteFilesHashes[note.path];
            if (!remoteHash) {
                unpublishedNotes.push(note);
            } else {
                publishedNotes.push(note);
                const markdown = await this.vault.read(note);
                const localHash = generateBlobHash(markdown);
                if (remoteHash !== localHash) {
                    changedNotes.push(note);
                }
            }
        }

        const deletedNotePaths = this.getDeletedPaths(Object.keys(remoteFilesHashes), notes.map((f) => f.path));
        const deletedImagePaths = this.getDeletedPaths(Object.keys(remoteFilesHashes), assets);

        unpublishedNotes.sort();
        publishedNotes.sort();
        changedNotes.sort();
        deletedNotePaths.sort();
        deletedImagePaths.sort();

        return { unpublishedNotes, publishedNotes, changedNotes, deletedNotePaths, deletedImagePaths };
    }

    private getDeletedPaths(remotePaths: Array<string>, localPaths: Array<string>): Array<string> {
        return remotePaths.filter((p) => !localPaths.includes(p))
    }
}
