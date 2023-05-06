import { DateTime } from 'luxon';
import { MetadataCache, TFile, Vault, Notice, getLinkpath, Component } from "obsidian";
import FlowershowSettings from "./FlowershowSettings";
import { Base64 } from "js-base64";
import { Octokit } from "@octokit/core";
import { arrayBufferToBase64, escapeRegExp, generateUrlPath, getGardenPathForNote, getRewriteRules, kebabize } from "./utils";
import { validatePublishFrontmatter, validateSettings } from "./Validator";
import { excaliDrawBundle, excalidraw } from "./constants";
import { getAPI } from "obsidian-dataview";
import slugify from "@sindresorhus/slugify";
import LZString from "lz-string";


export interface MarkedForPublishing {
    notes: TFile[],
    images: string[]
}
export interface IPublisher {
    [x: string]: any;
    publish(file: TFile): Promise<boolean>;
    deleteFromGtihub(vaultFilePath: string): Promise<boolean>;
    getFilesMarkedForPublishing(): Promise<MarkedForPublishing>;
    generateMarkdown(file: TFile): Promise<[string, any]>;
}
export default class Publisher {
    vault: Vault;
    metadataCache: MetadataCache;
    settings: FlowershowSettings;
    rewriteRules: Array<Array<string>>;
    frontmatterRegex = /^\s*?---\n([\s\S]*?)\n---/g;

    codeFenceRegex = /`(.*?)`/g;
    codeBlockRegex = /```.*?\n[\s\S]+?```/g;
    excaliDrawRegex = /:\[\[(\d*?,\d*?)\],.*?\]\]/g;

    /* flowershow new */
    notesRepoPath = "content";
    assetsRepoPath = "public";

    constructor(vault: Vault, metadataCache: MetadataCache, settings: FlowershowSettings) {
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.settings = settings;
        this.rewriteRules = getRewriteRules(settings.pathRewriteRules);
    }

    /* PUBLISH AND UNPLUBLISH NOTES AND ASSETS */

    async publish(file: TFile): Promise<boolean> {
        if (!validatePublishFrontmatter(this.metadataCache.getCache(file.path).frontmatter)) {
            return false;
        }
        try {
            const [text, assets] = await this.generateMarkdown(file);
            await this.uploadText(file.path, text);
            await this.uploadAssets(assets);
            return true;
        } catch {
            return false;
        }
    }

    async uploadText(filePath: string, content: string) {
        content = Base64.encode(content);
        const path = `content/${filePath}`
        await this.uploadToGithub(path, content)
    }

    // TODO types
    async uploadAssets(assets: any) {
        // TODO can there be anything else in assets obj than assets.images?
        for (let idx = 0; idx < assets.images.length; idx++) {
            const image = assets.images[idx];
            await this.uploadImage(image.path, image.content);
        }
    }

    async uploadImage(filePath: string, content: string) {
        const path = `${this.assetsRepoPath}/${filePath}`
        await this.uploadToGithub(path, content)
    }

    // DONE
    async deleteNote(vaultFilePath: string) {
        const path = `content/${vaultFilePath}`;
        await this.deleteFromGtihub(path);
    }

    async deleteImage(vaultFilePath: string) {
        const path = `src/site/img/user/${encodeURI(vaultFilePath)}`;
        return await this.deleteFromGtihub(path);
    }

    async uploadToGithub(path: string, content: string) {
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
                payload.sha = response.data.sha;
            }
        } catch (e) {
            console.log(e)
        }

        payload.message = `Update content ${path}`;

        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', payload);

    }

    // DONE
    async deleteFromGtihub(path: string) {
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

    /* ALL OTHER STUFF */

    async generateMarkdown(file: TFile): Promise<[string, any]> {
        const assets: any = { images: [] };
        if (file.name.endsWith(".excalidraw.md")) {
            return [await this.generateExcalidrawMarkdown(file, true), assets];
        }

        const text = await this.vault.cachedRead(file);
        // text = await this.createBlockIDs(text);
        // text = await this.createTranscludedText(text, file.path, 0);
        // text = await this.convertDataViews(text, file.path);
        // text = await this.createSvgEmbeds(text, file.path);
        const images = await this.extractEmbeddedImagesPaths(text, file.path);
        assets.images = images;
        return [text, assets];
    }

    /* MARKDOWN CONVERTERS */

    async createBlockIDs(text: string) {
        const block_pattern = / \^([\w\d-]+)/g;
        const complex_block_pattern = /\n\^([\w\d-]+)\n/g;
        text = text.replace(complex_block_pattern, (match: string, $1: string) => {
            return `{ #${$1}}\n\n`;
        });
        text = text.replace(block_pattern, (match: string, $1: string) => {
            return `\n{ #${$1}}\n`;
        });
        return text;
    }

    async createTranscludedText(text: string, filePath: string, currentDepth: number): Promise<string> {
        if (currentDepth >= 4) {
            return text;
        }
        const { notes: publishedFiles } = await this.getFilesMarkedForPublishing();
        let transcludedText = text;
        const transcludedRegex = /!\[\[(.+?)\]\]/g;
        const transclusionMatches = text.match(transcludedRegex);
        let numberOfExcaliDraws = 0;
        if (transclusionMatches) {
            for (let i = 0; i < transclusionMatches.length; i++) {
                try {
                    const transclusionMatch = transclusionMatches[i];
                    const [tranclusionFileName, headerName] = transclusionMatch.substring(transclusionMatch.indexOf('[') + 2, transclusionMatch.indexOf(']')).split("|");
                    const tranclusionFilePath = getLinkpath(tranclusionFileName);
                    const linkedFile = this.metadataCache.getFirstLinkpathDest(tranclusionFilePath, filePath);
                    let sectionID = "";
                    if (linkedFile.name.endsWith(".excalidraw.md")) {
                        const firstDrawing = ++numberOfExcaliDraws === 1;
                        const excaliDrawCode = await this.generateExcalidrawMarkdown(linkedFile, firstDrawing, `${numberOfExcaliDraws}`, false);

                        transcludedText = transcludedText.replace(transclusionMatch, excaliDrawCode);

                    } else if (linkedFile.extension === "md") {

                        let fileText = await this.vault.cachedRead(linkedFile);
                        if (tranclusionFileName.includes('#^')) {
                            // Transclude Block
                            const metadata = this.metadataCache.getFileCache(linkedFile);
                            const refBlock = tranclusionFileName.split('#^')[1];
                            sectionID = `#${slugify(refBlock)}`;
                            const blockInFile = metadata.blocks[refBlock];
                            if (blockInFile) {

                                fileText = fileText
                                    .split('\n')
                                    .slice(blockInFile.position.start.line, blockInFile.position.end.line + 1)
                                    .join('\n').replace(`^${refBlock}`, '');
                            }
                        } else if (tranclusionFileName.includes('#')) { // transcluding header only
                            const metadata = this.metadataCache.getFileCache(linkedFile);
                            const refHeader = tranclusionFileName.split('#')[1];
                            const headerInFile = metadata.headings?.find(header => header.heading === refHeader);
                            sectionID = `#${slugify(refHeader)}`;
                            if (headerInFile) {
                                const headerPosition = metadata.headings.indexOf(headerInFile);
                                // Embed should copy the content proparly under the given block
                                const cutTo = metadata.headings.slice(headerPosition + 1).find(header => header.level <= headerInFile.level);
                                if (cutTo) {
                                    const cutToLine = cutTo?.position?.start?.line;
                                    fileText = fileText
                                        .split('\n')
                                        .slice(headerInFile.position.start.line, cutToLine)
                                        .join('\n');
                                } else {
                                    fileText = fileText
                                        .split('\n')
                                        .slice(headerInFile.position.start.line)
                                        .join('\n');
                                }

                            }
                        }
                        //Remove frontmatter from transclusion
                        fileText = fileText.replace(this.frontmatterRegex, "");

                        const header = this.generateTransclusionHeader(headerName, linkedFile);

                        const headerSection = header ? `$<div class="markdown-embed-title">\n\n${header}\n\n</div>\n` : '';
                        let embedded_link = "";
                        if (publishedFiles.find((f) => f.path == linkedFile.path)) {
                            embedded_link = `<a class="markdown-embed-link" href="/${generateUrlPath(getGardenPathForNote(linkedFile.path, this.rewriteRules))}${sectionID}" aria-label="Open link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></a>`;
                        }
                        fileText = `\n<div class="transclusion internal-embed is-loaded">${embedded_link}<div class="markdown-embed">\n\n${headerSection}\n\n`
                            + fileText + '\n\n</div></div>\n'

                        if (fileText.match(transcludedRegex)) {
                            fileText = await this.createTranscludedText(fileText, linkedFile.path, currentDepth + 1);
                        }
                        //This should be recursive up to a certain depth
                        transcludedText = transcludedText.replace(transclusionMatch, fileText);
                    }
                } catch {
                    continue;
                }
            }
        }

        return transcludedText;

    }

    async convertDataViews(text: string, path: string): Promise<string> {
        let replacedText = text;
        const dataViewRegex = /```dataview\s(.+?)```/gsm;
        const dvApi = getAPI();
        if (!dvApi) return replacedText;
        const matches = text.matchAll(dataViewRegex);

        const dataviewJsPrefix = dvApi.settings.dataviewJsKeyword;
        const dataViewJsRegex = new RegExp("```" + escapeRegExp(dataviewJsPrefix) + "\\s(.+?)```", "gsm");
        const dataviewJsMatches = text.matchAll(dataViewJsRegex);

        const inlineQueryPrefix = dvApi.settings.inlineQueryPrefix;
        const inlineDataViewRegex = new RegExp("`" + escapeRegExp(inlineQueryPrefix) + "(.+?)`", "gsm");
        const inlineMatches = text.matchAll(inlineDataViewRegex);

        const inlineJsQueryPrefix = dvApi.settings.inlineJsQueryPrefix;
        const inlineJsDataViewRegex = new RegExp("`" + escapeRegExp(inlineJsQueryPrefix) + "(.+?)`", "gsm");
        const inlineJsMatches = text.matchAll(inlineJsDataViewRegex);

        if (!matches && !inlineMatches && !dataviewJsMatches && !inlineJsMatches) return;

        //Code block queries
        for (const queryBlock of matches) {
            try {
                const block = queryBlock[0];
                const query = queryBlock[1];
                const markdown = await dvApi.tryQueryMarkdown(query, path);
                replacedText = replacedText.replace(block, `${markdown}\n{ .block-language-dataview}`);
            } catch (e) {
                console.log(e)
                new Notice("Unable to render dataview query. Please update the dataview plugin to the latest version.")
                return queryBlock[0];
            }
        }

        for (const queryBlock of dataviewJsMatches) {
            try {
                const block = queryBlock[0];
                const query = queryBlock[1];

                const div = createEl('div');
                const component = new Component();
                await dvApi.executeJs(query, div, component, path)
                component.load();

                replacedText = replacedText.replace(block, div.innerHTML);
            } catch (e) {
                console.log(e)
                new Notice("Unable to render dataviewjs query. Please update the dataview plugin to the latest version.")
                return queryBlock[0];
            }
        }

        //Inline queries
        for (const inlineQuery of inlineMatches) {
            try {
                const code = inlineQuery[0];
                const query = inlineQuery[1];
                const dataviewResult = dvApi.tryEvaluate(query, { this: dvApi.page(path) });
                if (dataviewResult) {
                    replacedText = replacedText.replace(code, dataviewResult.toString());
                }
            } catch (e) {
                console.log(e)
                new Notice("Unable to render inline dataview query. Please update the dataview plugin to the latest version.")
                return inlineQuery[0];
            }
        }

        for (const inlineJsQuery of inlineJsMatches) {
            try {
                const code = inlineJsQuery[0];
                const query = inlineJsQuery[1];

                const div = createEl('div');
                const component = new Component();
                await dvApi.executeJs(query, div, component, path)
                component.load();

                replacedText = replacedText.replace(code, div.innerHTML)

            } catch (e) {
                console.log(e)
                new Notice("Unable to render inline dataviewjs query. Please update the dataview plugin to the latest version.")
                return inlineJsQuery[0];
            }
        }


        return replacedText;

    }

    async createSvgEmbeds(text: string, filePath: string): Promise<string> {

        function setWidth(svgText: string, size: string): string {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
            const svgElement = svgDoc.getElementsByTagName("svg")[0];
            svgElement.setAttribute("width", size);
            const svgSerializer = new XMLSerializer();
            return svgSerializer.serializeToString(svgDoc);
        }
        //![[image.svg]]
        const transcludedSvgRegex = /!\[\[(.*?)(\.(svg))\|(.*?)\]\]|!\[\[(.*?)(\.(svg))\]\]/g;
        const transcludedSvgs = text.match(transcludedSvgRegex);
        if (transcludedSvgs) {
            for (const svg of transcludedSvgs) {
                try {

                    const [imageName, size] = svg.substring(svg.indexOf('[') + 2, svg.indexOf(']')).split("|");
                    const imagePath = getLinkpath(imageName);
                    const linkedFile = this.metadataCache.getFirstLinkpathDest(imagePath, filePath);
                    let svgText = await this.vault.read(linkedFile);
                    if (svgText && size) {
                        svgText = setWidth(svgText, size);
                    }
                    text = text.replace(svg, svgText);
                } catch {
                    continue;
                }
            }
        }

        //!()[image.svg]
        const linkedSvgRegex = /!\[(.*?)\]\((.*?)(\.(svg))\)/g;
        const linkedSvgMatches = text.match(linkedSvgRegex);
        if (linkedSvgMatches) {
            for (const svg of linkedSvgMatches) {
                try {
                    const [imageName, size] = svg.substring(svg.indexOf('[') + 2, svg.indexOf(']')).split("|");
                    const pathStart = svg.lastIndexOf("(") + 1;
                    const pathEnd = svg.lastIndexOf(")");
                    const imagePath = svg.substring(pathStart, pathEnd);
                    if (imagePath.startsWith("http")) {
                        continue;
                    }

                    const linkedFile = this.metadataCache.getFirstLinkpathDest(imagePath, filePath);
                    let svgText = await this.vault.read(linkedFile);
                    if (svgText && size) {
                        svgText = setWidth(svgText, size);
                    }
                    text = text.replace(svg, svgText);
                } catch {
                    continue;
                }
            }
        }

        return text;
    }

    /* MISCELLANEOUS */

    // Get all notes marked with 'dgpublish'
    async getFilesMarkedForPublishing(): Promise<MarkedForPublishing> {
        const files = this.vault.getMarkdownFiles();
        const notesToPublish = [];
        const imagesToPublish: Set<string> = new Set();
        for (const file of files) {
            try {
                const frontMatter = this.metadataCache.getCache(file.path).frontmatter
                if (frontMatter && frontMatter["dgpublish"] === true) {
                    notesToPublish.push(file);
                    const images = await this.extractImageLinks(await this.vault.cachedRead(file), file.path);
                    images.forEach((i) => imagesToPublish.add(i));
                }
            } catch {
                //ignore
            }
        }

        return {
            notes: notesToPublish,
            images: Array.from(imagesToPublish)
        };
    }

    stripAwayCodeFencesAndFrontmatter(text: string): string {
        let textToBeProcessed = text;
        textToBeProcessed = textToBeProcessed.replace(this.excaliDrawRegex, '');
        textToBeProcessed = textToBeProcessed.replace(this.codeBlockRegex, '');
        textToBeProcessed = textToBeProcessed.replace(this.codeFenceRegex, '');
        textToBeProcessed = textToBeProcessed.replace(this.frontmatterRegex, '');

        return textToBeProcessed;
    }

    async extractImageLinks(text: string, filePath: string): Promise<string[]> {
        const assets = [];

        const imageText = text;
        //![[image.png]]
        const transcludedImageRegex = /!\[\[(.*?)(\.(png|jpg|jpeg|gif))\|(.*?)\]\]|!\[\[(.*?)(\.(png|jpg|jpeg|gif))\]\]/g;
        const transcludedImageMatches = text.match(transcludedImageRegex);
        if (transcludedImageMatches) {
            for (let i = 0; i < transcludedImageMatches.length; i++) {
                try {
                    const imageMatch = transcludedImageMatches[i];

                    const [imageName, _] = imageMatch.substring(imageMatch.indexOf('[') + 2, imageMatch.indexOf(']')).split("|");
                    const imagePath = getLinkpath(imageName);
                    const linkedFile = this.metadataCache.getFirstLinkpathDest(imagePath, filePath);
                    assets.push(linkedFile.path)
                } catch (e) {
                    continue;
                }
            }
        }

        //![](image.png)
        const imageRegex = /!\[(.*?)\]\((.*?)(\.(png|jpg|jpeg|gif))\)/g;
        const imageMatches = text.match(imageRegex);
        if (imageMatches) {
            for (let i = 0; i < imageMatches.length; i++) {
                try {
                    const imageMatch = imageMatches[i];

                    const nameStart = imageMatch.indexOf('[') + 1;
                    const nameEnd = imageMatch.indexOf(']');

                    const pathStart = imageMatch.lastIndexOf("(") + 1;
                    const pathEnd = imageMatch.lastIndexOf(")");
                    const imagePath = imageMatch.substring(pathStart, pathEnd);
                    if (imagePath.startsWith("http")) {
                        continue;
                    }

                    const decodedImagePath = decodeURI(imagePath);
                    const linkedFile = this.metadataCache.getFirstLinkpathDest(decodedImagePath, filePath);
                    assets.push(linkedFile.path)
                } catch {
                    continue;
                }
            }
        }
        return assets;
    }

    // DONE
    async extractEmbeddedImagesPaths(text: string, filePath: string): Promise<Array<{ path: string, content: string }>> {
        const assets = [];

        //![[image.png]]
        const transcludedImageRegex = /!\[\[(.*?)(\.(png|jpg|jpeg|gif))\|(.*?)\]\]|!\[\[(.*?)(\.(png|jpg|jpeg|gif))\]\]/g;
        const transcludedImageMatches = text.match(transcludedImageRegex);

        if (transcludedImageMatches) {
            for (let i = 0; i < transcludedImageMatches.length; i++) {
                const embed = transcludedImageMatches[i];
                try {
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

        //![](image.png)
        const imageRegex = /!\[(.*?)\]\((.*?)(\.(png|jpg|jpeg|gif))\)/g;
        const imageMatches = text.match(imageRegex);
        if (imageMatches) {
            for (let i = 0; i < imageMatches.length; i++) {
                const imageMatch = imageMatches[i];
                try {
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

    generateTransclusionHeader(headerName: string, transcludedFile: TFile) {
        if (!headerName) {
            return headerName;
        }

        const titleVariable = "{{title}}";
        if (headerName && headerName.indexOf(titleVariable) > -1) {
            headerName = headerName.replace(titleVariable, transcludedFile.basename);
        }

        //Defaults to h1
        if (headerName && !headerName.startsWith("#")) {
            headerName = "# " + headerName;
        } else if (headerName) {
            //Add a space to the start of the header if not already there
            const headerParts = headerName.split("#");
            if (!headerParts.last().startsWith(" ")) {
                headerName = headerName.replace(headerParts.last(), " " + headerParts.last());
            }

        }
        return headerName;
    }

    async generateExcalidrawMarkdown(file: TFile, includeExcaliDrawJs: boolean, idAppendage = "", includeFrontMatter = true): Promise<string> {
        if (!file.name.endsWith(".excalidraw.md")) return "";

        const fileText = await this.vault.cachedRead(file);
        const frontMatter = await this.getProcessedFrontMatter(file);

        const isCompressed = fileText.includes("```compressed-json")
        const start = fileText.indexOf(isCompressed ? "```compressed-json" : "```json") + (isCompressed ? "```compressed-json" : "```json").length;
        const end = fileText.lastIndexOf('```')
        const excaliDrawJson = JSON.parse(
            isCompressed ? LZString.decompressFromBase64(fileText.slice(start, end).replace(/[\n\r]/g, "")) : fileText.slice(start, end)
        );

        const drawingId = file.name.split(" ").join("_").replace(".", "") + idAppendage;
        let excaliDrawCode = "";
        if (includeExcaliDrawJs) {
            excaliDrawCode += excaliDrawBundle;
        }

        excaliDrawCode += excalidraw(JSON.stringify(excaliDrawJson), drawingId);

        return `${includeFrontMatter ? frontMatter : ''}${excaliDrawCode}`;
    }
}



