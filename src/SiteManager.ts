import { FlowershowSettings } from "src/FlowershowSettings";
import { MetadataCache } from "obsidian";
import { Octokit } from "@octokit/core";


export type PathToHashDict = { [key: string]: string };

export interface ISiteManager {
    // getNoteUrl(file: TFile): string;
    getNoteHashes(): Promise<{ [key: string]: string }>;
    getImageHashes(): Promise<{ [key: string]: string }>;
    updateEnv(): Promise<void>;
}

export default class SiteManager implements ISiteManager {
    settings: FlowershowSettings;
    metadataCache: MetadataCache;
    rewriteRules: Array<Array<string>>;
    constructor(metadataCache: MetadataCache, settings: FlowershowSettings) {
        this.settings = settings;
        this.metadataCache = metadataCache;
    }

    async updateEnv() {
        // not implemented
        // write Flowershow settings to config.js and push to github
    }

    // getNoteUrl(file: TFile): string {
    // not implemented
    // }


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
            (file: { path: string; type: string; }) => file.type === "blob" && file.path.endsWith(".md"));

        const hashes: PathToHashDict = notes.reduce((dict: PathToHashDict, note) => {
            dict[note.path] = note.sha;
            return dict
        }, {});

        return hashes;
    }

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
            (file: { path: string; type: string; }) =>
                file.type === "blob" &&
                /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i.test(file.path));

        const hashes: PathToHashDict = images.reduce((dict: PathToHashDict, img) => {
            dict[decodeURI(img.path)] = img.sha;
            return dict
        }, {});

        return hashes;
    }
}
