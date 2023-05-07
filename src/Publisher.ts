import { MetadataCache, TFile, Vault, getLinkpath } from "obsidian";
import FlowershowSettings from "./FlowershowSettings";
import { Base64 } from "js-base64";
import { Octokit } from "@octokit/core";
// import { arrayBufferToBase64, getGardenPathForNote, getRewriteRules } from "./utils";
import { arrayBufferToBase64 } from "./utils";
import { validatePublishFrontmatter, validateSettings } from "./Validator";
// import { excaliDrawBundle, excalidraw } from "./constants";
// import LZString from "lz-string";


export interface MarkedForPublishing {
    notes: TFile[],
    images: string[]
}

export interface IPublisher {
    publishNote(file: TFile): Promise<void>;
    unpublishNote(path: string): Promise<void>;
    prepareMarkdown(file: TFile): Promise<string>;
    getFilesMarkedForPublishing(): Promise<MarkedForPublishing>;
}

export default class Publisher implements IPublisher {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private settings: FlowershowSettings;
    // private rewriteRules: Array<Array<string>>;

    private notesRepoPath = "content";
    private assetsRepoPath = "public";

    constructor(vault: Vault, metadataCache: MetadataCache, settings: FlowershowSettings) {
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.settings = settings;
        // this.rewriteRules = getRewriteRules(settings.pathRewriteRules);
    }

    /* PUBLIC METHODS */

    // DONE
    async publishNote(file: TFile) {
        if (!validatePublishFrontmatter(this.metadataCache.getCache(file.path).frontmatter)) {
            throw {}
        }
        const text = await this.prepareMarkdown(file);
        const images = await this.extractEmbeddedImagePaths(text, file.path);

        await this.uploadText(text, file.path);
        await this.uploadAssets({ images }); // TODO any other assets?
    }

    // DONE
    async unpublishNote(vaultFilePath: string) {
        const path = `${this.notesRepoPath}/${vaultFilePath}`;
        await this.deleteFromGithub(path);
        // TODO: what about associated images?
    }

    // DONE
    async prepareMarkdown(file: TFile): Promise<string> {
        // if (file.name.endsWith(".excalidraw.md")) {
        //     return await this.generateExcalidrawMarkdown(file, true);
        // }

        return await this.vault.cachedRead(file);
    }

    async getFilesMarkedForPublishing(): Promise<MarkedForPublishing> {
        const files = this.vault.getMarkdownFiles();
        const notesToPublish = [];
        const imagesToPublish: Set<string> = new Set();
        for (const file of files) {
            const frontMatter = this.metadataCache.getCache(file.path).frontmatter
            if (frontMatter && frontMatter["dgpublish"] === true) {
                notesToPublish.push(file);
                const images = await this.extractImageLinks(await this.vault.cachedRead(file), file.path);
                images.forEach((i) => imagesToPublish.add(i));
            }
        }

        return {
            notes: notesToPublish,
            images: Array.from(imagesToPublish)
        };
    }

    // DONE
    private async uploadText(content: string, filePath: string) {
        content = Base64.encode(content);
        const path = `${this.notesRepoPath}/${filePath}`
        await this.uploadToGithub(path, content)
    }

    private async uploadAssets(assets: any) {
        // TODO types
        // TODO can there be anything else in assets obj than assets.images?
        for (let idx = 0; idx < assets.images.length; idx++) {
            const image = assets.images[idx];
            await this.uploadImage(image.path, image.content);
        }
    }

    private async uploadImage(filePath: string, content: string) {
        const path = `${this.assetsRepoPath}/${filePath}`
        await this.uploadToGithub(path, content)
    }

    private async deleteImage(vaultFilePath: string) {
        const path = `src/site/img/user/${encodeURI(vaultFilePath)}`;
        return await this.deleteFromGithub(path);
    }

    // DONE
    private async uploadToGithub(path: string, content: string) {
        if (!validateSettings(this.settings)) {
            throw {}
        }

        const octokit = new Octokit({ auth: this.settings.githubToken });
        const payload = {
            owner: this.settings.githubUserName,
            repo: this.settings.githubRepo,
            path,
            message: `Add content ${path}`,
            content,
            sha: ''
        };

        try {
            const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner: this.settings.githubUserName,
                repo: this.settings.githubRepo,
                path
            });
            if (response.status === 200 && response.data.type === "file") {
                payload.message = `Update content ${path}`;
                payload.sha = response.data.sha;
            }

        } finally {
            await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', payload);
        }
    }

    // DONE
    private async deleteFromGithub(path: string) {
        if (!validateSettings(this.settings)) {
            throw {}
        }

        const octokit = new Octokit({ auth: this.settings.githubToken });
        const payload = {
            owner: this.settings.githubUserName,
            repo: this.settings.githubRepo,
            path,
            message: `Delete content ${path}`,
            sha: ''
        };

        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: this.settings.githubUserName,
            repo: this.settings.githubRepo,
            path
        });

        if (response.status === 200 && response.data.type === "file") {
            payload.sha = response.data.sha;
        }

        await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', payload);
    }

    private async readTFileToBase64(file: TFile): Promise<string> {
        const image = await this.vault.readBinary(file);
        const imageBase64 = arrayBufferToBase64(image)
        return imageBase64;
    }

    private async extractEmbeddedFiles(text: string, filePath: string): Promise<Array<string>> {
        const embeddedFilesPaths = [];

        //![[image.png]] TODO check this regex
        const embeddedImageRegex = /!\[\[(.*?)\.(png|webp|jpg|jpeg|gif|bmp|svg)(?:\|(.*?))?\]\]/g;
        const embeddedImageMatches = text.match(embeddedImageRegex);

        if (embeddedImageMatches) {
            for (let i = 0; i < embeddedFilesPaths.length; i++) {
                try {
                    const embed = embeddedImageMatches[i];
                    const embedText = embed.substring(embed.indexOf('[') + 2, embed.indexOf(']'));
                    const [imageName, size] = embedText.split("|").filter((p) => p);
                    const imagePath = getLinkpath(imageName);
                    const linkedFile = this.metadataCache.getFirstLinkpathDest(imagePath, filePath);
                    const image = await this.vault.readBinary(linkedFile);
                    const imageBase64 = arrayBufferToBase64(image)

                    assets.push({ path: linkedFile.path, content: imageBase64 })
                } catch (e) {
                    continue;
                }
            }
        }

        //![](image.png) TODO check this regex
        const imageRegex = /!\[(.*?)\]\((.*?)\.(png|webp|jpg|jpeg|gif|bmp|svg)\)/g;
        const imageMatches = text.match(imageRegex);
        if (imageMatches) {
            for (let i = 0; i < imageMatches.length; i++) {
                try {
                    const imageMatch = imageMatches[i];
                    // TODO replace this with regex group matching
                    const nameStart = imageMatch.indexOf('[') + 1;
                    const nameEnd = imageMatch.indexOf(']');
                    const imageName = imageMatch.substring(nameStart, nameEnd);

                    const pathStart = imageMatch.lastIndexOf("(") + 1;
                    const pathEnd = imageMatch.lastIndexOf(")");
                    const imagePath = imageMatch.substring(pathStart, pathEnd);
                    // end

                    if (imagePath.startsWith("http")) {
                        continue;
                    }

                    const decodedImagePath = decodeURI(imagePath);
                    const linkedFile = this.metadataCache.getFirstLinkpathDest(decodedImagePath, filePath);
                    const image = await this.vault.readBinary(linkedFile);
                    const imageBase64 = arrayBufferToBase64(image);
                    assets.push({ path: linkedFile.path, content: imageBase64 })
                } catch {
                    continue;
                }
            }
        }

        return assets;
    }

    // private async generateExcalidrawMarkdown(file: TFile, includeExcaliDrawJs: boolean, idAppendage = "", includeFrontMatter = true): Promise<string> {
    //     if (!file.name.endsWith(".excalidraw.md")) return "";

    //     const fileText = await this.vault.cachedRead(file);
    //     const frontMatter = await this.getProcessedFrontMatter(file);

    //     const isCompressed = fileText.includes("```compressed-json")
    //     const start = fileText.indexOf(isCompressed ? "```compressed-json" : "```json") + (isCompressed ? "```compressed-json" : "```json").length;
    //     const end = fileText.lastIndexOf('```')
    //     const excaliDrawJson = JSON.parse(
    //         isCompressed ? LZString.decompressFromBase64(fileText.slice(start, end).replace(/[\n\r]/g, "")) : fileText.slice(start, end)
    //     );

    //     const drawingId = file.name.split(" ").join("_").replace(".", "") + idAppendage;
    //     let excaliDrawCode = "";
    //     if (includeExcaliDrawJs) {
    //         excaliDrawCode += excaliDrawBundle;
    //     }

    //     excaliDrawCode += excalidraw(JSON.stringify(excaliDrawJson), drawingId);

    //     return `${includeFrontMatter ? frontMatter : ''}${excaliDrawCode}`;
    // }
}
