import { MetadataCache, TFile, Vault, getLinkpath } from "obsidian";
import { FlowershowSettings } from "./FlowershowSettings";
import axios from "axios";
import { arrayBufferToBase64, generateBlobHash } from "./utils";
import { validatePublishFrontmatter, validateSettings } from "./Validator";


export interface MarkedForPublishing {
    notes: TFile[],
    assets: string[]
}

export interface IPublisher {
    publishNote(file: TFile): Promise<void>;
    prepareMarkdown(file: TFile): Promise<string>;
    unpublishNote(path: string): Promise<void>;
    getFilesMarkedForPublishing(): Promise<MarkedForPublishing>;
}

export default class Publisher implements IPublisher {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private settings: FlowershowSettings;
    // private rewriteRules: Array<Array<string>>;

    constructor(vault: Vault, metadataCache: MetadataCache, settings: FlowershowSettings) {
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.settings = settings;
        // this.rewriteRules = getRewriteRules(settings.pathRewriteRules);
    }

    async publishNote(file: TFile) {
        if (!validatePublishFrontmatter(this.metadataCache.getCache(file.path).frontmatter)) {
            throw {}
        }
        const markdown = await this.prepareMarkdown(file);
        const assets = await this.prepareAssociatedAssets(markdown, file.path);

        await this.uploadMarkdown(markdown, file.path);
        await this.uploadAssets(assets);
    }

    // DONE
    async unpublishNote(notePath: string) {
        await this.deleteMarkdown(notePath);
        // TODO
        // await this.deleteAssets(notePath);
    }

    // DONE
    async getFilesMarkedForPublishing(): Promise<MarkedForPublishing> {
        const files = this.vault.getMarkdownFiles();
        const notesToPublish = [];
        const assetsToPublish: Set<string> = new Set();

        for (const file of files) {
            const frontMatter = this.metadataCache.getCache(file.path).frontmatter
            if (!frontMatter || !frontMatter["isDraft"]) {
                notesToPublish.push(file);
                const text = await this.prepareMarkdown(file);
                const images = await this.extractEmbeddedImageFiles(text, file.path);
                Object.keys(images).forEach((i) => assetsToPublish.add(i));
                // ... other assets?
            }
        }

        return {
            notes: notesToPublish,
            assets: Array.from(assetsToPublish)
        };
    }

    // DONE
    private async uploadMarkdown(content: string, filePath: string) {
        await this.uploadToR2(filePath, content)
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
        await this.uploadToR2(filePath, content)
    }

    private async deleteImage(filePath: string) {
        return await this.deleteFromR2(filePath);
    }

    private async uploadToR2(path: string, content: string) {
        if (!validateSettings(this.settings)) {
            throw {}
        }

        const hash = generateBlobHash(content);
        console.log({ hash })

        try {
            await axios.put(`${this.settings.publishUrl}${path}`, content, {
                headers: {
                    "X-Content-SHA256": hash
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
            await axios.delete(`${this.settings.publishUrl}${path}`);
        } catch {
            throw {}
        }
    }

    async prepareMarkdown(file: TFile): Promise<string> {
        return await this.vault.read(file);
    }

    private async prepareAssociatedAssets(text: string, filePath: string) {
        const assets: { images: Array<{ path: string, content: string }> } = {
            images: [],
            // ... other assets
        };

        const imagePathsToTFilesMap = await this.extractEmbeddedImageFiles(text, filePath);

        for (const path in imagePathsToTFilesMap) {
            const image = imagePathsToTFilesMap[path];
            assets.images.push({
                path,
                content: await this.readImageToBase64(image)
            });

        }
        return assets;
    }

    // DONE
    private async readImageToBase64(file: TFile): Promise<string> {
        const image = await this.vault.readBinary(file);
        const imageBase64 = arrayBufferToBase64(image)
        return imageBase64;
    }

    // DONE
    private async extractEmbeddedImageFiles(text: string, filePath: string): Promise<{ [path: string]: TFile }> {
        const embeddedImageFiles: { [path: string]: TFile } = {};

        //![[image.png]]
        const embeddedImageRegex = /!\[\[(.*?\.(png|webp|jpg|jpeg|gif|bmp|svg))(?:\|(.*?))?\]\]/g;
        const embeddedImageMatches = [...text.matchAll(embeddedImageRegex)];

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
        const imageMatches = [...text.matchAll(imageRegex)];

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
}
