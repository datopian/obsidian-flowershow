import axios from "axios";
import { MetadataCache, TFile, Vault, getLinkpath } from "obsidian";

import { FlowershowSettings } from "./FlowershowSettings";
import { validatePublishFrontmatter, validateSettings } from "./Validator";
import { arrayBufferToBase64, generateBlobHash } from "./utils";

export interface NotesAndAssetsToPublish {
    notes: TFile[],
    assets: string[]
}

export interface IPublisher {
    publishNote(file: TFile): Promise<void>;
    unpublishNote(path: string): Promise<void>;
    getNotesAndAssetsToPublish(): Promise<NotesAndAssetsToPublish>;
}

export default class Publisher implements IPublisher {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private settings: FlowershowSettings;

    constructor(vault: Vault, metadataCache: MetadataCache, settings: FlowershowSettings) {
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.settings = settings;
    }

    async publishNote(file: TFile) {
        const frontmatter = this.metadataCache.getCache(file.path).frontmatter
        const markdown = await this.vault.read(file);

        if (!validatePublishFrontmatter(frontmatter)) {
            throw {}
        }
        const assets = await this.extractEmbeddedAssetsFromMarkdown(markdown, file.path);

        await this.uploadMarkdown(markdown, frontmatter, file.path);
        await this.uploadAssets(assets);
    }

    async unpublishNote(notePath: string) {
        await this.deleteMarkdown(notePath);
        // TODO
        // await this.deleteAssets(notePath);
    }

    async getNotesAndAssetsToPublish(): Promise<NotesAndAssetsToPublish> {
        const files = this.vault.getMarkdownFiles();
        const notesToPublish = [];
        const assetsToPublish: Set<string> = new Set();

        for (const file of files) {
            const frontMatter = this.metadataCache.getCache(file.path).frontmatter
            if (!frontMatter || !frontMatter["isDraft"]) {
                notesToPublish.push(file);
                const markdown = await this.vault.read(file);
                const images = await this.extractEmbeddedImageTFilesFromMarkdown(markdown, file.path);
                Object.keys(images).forEach((i) => assetsToPublish.add(i));
                // ... other assets?
            }
        }

        return {
            notes: notesToPublish,
            assets: Array.from(assetsToPublish)
        };
    }

    private async uploadMarkdown(content: string, frontMatter: object, filePath: string) {
        await this.uploadToR2(filePath, content, frontMatter);
    }


    private async deleteMarkdown(filePath: string) {
        await this.deleteFromR2(filePath)
    }

    private async uploadAssets(assets: any) {
        // TODO types
        // TODO can there be anything else in assets obj than assets.images?
        // TODO check if assets already published?
        for (let idx = 0; idx < assets.images.length; idx++) {
            const image = assets.images[idx];
            await this.uploadImage(image.path, image.content);
        }
    }

    private async deleteAssets(assets: any) {
        for (let idx = 0; idx < assets.images.length; idx++) {
            const image = assets.images[idx];
            await this.deleteImage(image.path);
        }
    }

    private async uploadImage(filePath: string, content: string) {
        await this.uploadImageToR2(filePath, content)
    }

    private async deleteImage(filePath: string) {
        return await this.deleteFromR2(filePath);
    }

    private async uploadToR2(path: string, markdown: string, metadata?: object) {
        if (!validateSettings(this.settings)) {
            throw {}
        }

        const hash = generateBlobHash(markdown);

        try {
            await axios.put(`${this.settings.R2url}${path}`, {
                markdown,
                metadata
            }, {
                headers: {
                    "X-Content-SHA256": hash,
                    "Content-Type": "application/json"
                }
            });
        } catch {
            throw {}
        }
    }

    private async deleteFromR2(path: string) {
        if (!validateSettings(this.settings)) {
            throw {}
        }

        try {
            await axios.delete(`${this.settings.R2url}${path}`);
        } catch {
            throw {}
        }
    }

    private async extractEmbeddedAssetsFromMarkdown(markdown: string, filePath: string) {
        const assets: { images: Array<{ path: string, content: string }> } = {
            images: [],
            // ... other assets
        };

        const imageTFiles: { [path: string]: TFile } = await this.extractEmbeddedImageTFilesFromMarkdown(markdown, filePath);

        for (const path in imageTFiles) {
            const image = imageTFiles[path];
            assets.images.push({
                path,
                content: await this.readImageTFileToBase64(image)
            });

        }
        return assets;
    }

    private async extractEmbeddedImageTFilesFromMarkdown(markdown: string, filePath: string): Promise<{ [path: string]: TFile }> {
        const embeddedImageFiles: { [path: string]: TFile } = {};

        //![[image.png]]
        const embeddedImageRegex = /!\[\[(.*?\.(png|webp|jpg|jpeg|gif|bmp|svg))(?:\|(.*?))?\]\]/g;
        const embeddedImageMatches = [...markdown.matchAll(embeddedImageRegex)];

        if (embeddedImageMatches) {
            for (let i = 0; i < embeddedImageMatches.length; i++) {
                try {
                    // `path` below can be a full path or Obsidian-style shortened path, i.e. just a file name with extension
                    // const [, path, extension, size = null] = embeddedImageMatches[i];
                    const [, path] = embeddedImageMatches[i];
                    const imagePath = getLinkpath(path);
                    const linkedFile = this.metadataCache.getFirstLinkpathDest(imagePath, filePath);

                    if (!embeddedImageFiles[linkedFile.path]) {
                        embeddedImageFiles[linkedFile.path] = linkedFile;
                    }
                } catch {
                    continue;
                }
            }
        }

        //![](image.png) TODO check this regex
        const imageRegex = /!\[.*?\]\((.*?\.(png|webp|jpg|jpeg|gif|bmp|svg))\)/g;
        const imageMatches = [...markdown.matchAll(imageRegex)];

        if (imageMatches) {
            for (let i = 0; i < imageMatches.length; i++) {
                try {
                    // const [, path, extension] = imageMatches[i];
                    const [, path] = imageMatches[i];

                    if (path.startsWith("http")) {
                        continue;
                    }

                    // const decodedImagePath = decodeURI(imagePath);
                    const imagePath = getLinkpath(path);
                    const linkedFile = this.metadataCache.getFirstLinkpathDest(imagePath, filePath);
                    if (!embeddedImageFiles[linkedFile.path]) {
                        embeddedImageFiles[linkedFile.path] = linkedFile;
                    }
                } catch {
                    continue;
                }
            }
        }

        return embeddedImageFiles;
    }

    private async readImageTFileToBase64(file: TFile): Promise<string> {
        const image = await this.vault.readBinary(file);
        const imageBase64 = arrayBufferToBase64(image)
        return imageBase64;
    }
}
