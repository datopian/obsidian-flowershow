import { FlowershowSettings } from "src/FlowershowSettings";
import { MetadataCache, TFile } from "obsidian";
import { extractBaseUrl, generateUrlPath, getGardenPathForNote, getRewriteRules } from "./utils";
import { Octokit } from "@octokit/core";
import { Base64 } from 'js-base64';


export type PathToHashDict = { [key: string]: string };

export interface ISiteManager {
    getNoteUrl(file: TFile): string;
    getNoteHashes(): Promise<{ [key: string]: string }>;
    getImageHashes(): Promise<{ [key: string]: string }>;
}

export default class SiteManager implements ISiteManager {
    settings: FlowershowSettings;
    metadataCache: MetadataCache;
    rewriteRules: Array<Array<string>>;
    constructor(metadataCache: MetadataCache, settings: FlowershowSettings) {
        this.settings = settings;
        this.metadataCache = metadataCache;
        this.rewriteRules = getRewriteRules(settings.pathRewriteRules);
    }

    async updateEnv() {
        const octokit = new Octokit({ auth: this.settings.githubToken });
        const theme = JSON.parse(this.settings.theme);
        const baseTheme = this.settings.baseTheme;
        const siteName = this.settings.siteName;
        let gardenBaseUrl = ''

        //check that gardenbaseurl is not an access token wrongly pasted.
        if (this.settings.gardenBaseUrl
            && !this.settings.gardenBaseUrl.startsWith("ghp_")
            && !this.settings.gardenBaseUrl.startsWith("github_pat")
            && this.settings.gardenBaseUrl.contains(".")) {
            gardenBaseUrl = this.settings.gardenBaseUrl;
        }

        let envSettings = '';
        if (theme.name !== 'default') {
            envSettings = `THEME=${theme.cssUrl}\nBASE_THEME=${baseTheme}`;
        }
        envSettings += `\nSITE_NAME_HEADER=${siteName}`;
        envSettings += `\nSITE_BASE_URL=${gardenBaseUrl}`;
        envSettings += `\nSHOW_CREATED_TIMESTAMP=${this.settings.showCreatedTimestamp}`;
        envSettings += `\nTIMESTAMP_FORMAT=${this.settings.timestampFormat}`;
        envSettings += `\nSHOW_UPDATED_TIMESTAMP=${this.settings.showUpdatedTimestamp}`;
        envSettings += `\nNOTE_ICON_DEFAULT=${this.settings.defaultNoteIcon}`;
        envSettings += `\nNOTE_ICON_TITLE=${this.settings.showNoteIconOnTitle}`;
        envSettings += `\nNOTE_ICON_FILETREE=${this.settings.showNoteIconInFileTree}`;
        envSettings += `\nNOTE_ICON_INTERNAL_LINKS=${this.settings.showNoteIconOnInternalLink}`;
        envSettings += `\nNOTE_ICON_BACK_LINKS=${this.settings.showNoteIconOnBackLink}`;
        envSettings += `\nSTYLE_SETTINGS_CSS=\"${this.settings.styleSettingsCss}\"`;

        const defaultNoteSettings = { ...this.settings.defaultNoteSettings };
        for (const key of Object.keys(defaultNoteSettings)) {
            //@ts-ignore
            envSettings += `\n${key}=${defaultNoteSettings[key]}`;
        }

        const base64Settings = Base64.encode(envSettings);

        let fileExists = true;
        let currentFile = null;
        try {
            currentFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner: this.settings.githubUserName,
                repo: this.settings.githubRepo,
                path: ".env",
            });
        } catch (error) {
            fileExists = false;
        }

        //commit
        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: this.settings.githubUserName,
            repo: this.settings.githubRepo,
            path: ".env",
            message: `Update settings`,
            content: base64Settings,
            sha: fileExists ? currentFile.data.sha : null
        });
    }

    getNoteUrl(file: TFile): string {
        const baseUrl = this.settings.gardenBaseUrl ?
            `https://${extractBaseUrl(this.settings.gardenBaseUrl)}`
            : `https://${this.settings.githubRepo}.netlify.app`;

        const noteUrlPath = generateUrlPath(getGardenPathForNote(file.path, this.rewriteRules), this.settings.slugifyEnabled);

        let urlPath = `/${noteUrlPath}`;

        return `${baseUrl}${urlPath}`;
    }


    // DONE
    async getNoteHashes(): Promise<PathToHashDict> {
        const octokit = new Octokit({ auth: this.settings.githubToken });
        //Force the cache to be updated
        const response = await octokit.request(`GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=${Math.ceil(Math.random() * 1000)}`, {
            owner: this.settings.githubUserName,
            repo: this.settings.githubRepo,
            tree_sha: 'HEAD'
        });

        const files = response.data.tree;
        const notes: Array<{ path: string, sha: string }> = files.filter(
            (file: { path: string; type: string; }) => file.path.startsWith("content/") && file.type === "blob" && file.path !== "content/config.mjs");

        const hashes: PathToHashDict = notes.reduce((dict: PathToHashDict, note) => {
            const vaultPath = note.path.replace("content/", "");
            dict[vaultPath] = note.sha;
            return dict
        }, {});

        return hashes;
    }

    // DONE
    // TODO can we remove this and have only one method that handles both notes and images? do we need to decode URI here?
    async getImageHashes(): Promise<PathToHashDict> {
        const octokit = new Octokit({ auth: this.settings.githubToken });
        //Force the cache to be updated
        const response = await octokit.request(`GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=${Math.ceil(Math.random() * 1000)}`, {
            owner: this.settings.githubUserName,
            repo: this.settings.githubRepo,
            tree_sha: 'HEAD'
        });

        const files = response.data.tree;
        const images: Array<{ path: string, sha: string }> = files.filter(
            (file: { path: string; type: string; }) => file.path.startsWith("public/") && file.type === "blob");

        const hashes: PathToHashDict = images.reduce((dict: PathToHashDict, img) => {
            const vaultPath = decodeURI(img.path.replace("public/", "")); // TODO why do we need to decodeURI for images?
            dict[vaultPath] = img.sha;
            return dict
        }, {});

        return hashes;
    }
}
