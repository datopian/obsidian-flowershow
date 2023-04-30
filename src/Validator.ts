import { FrontMatterCache, Notice } from "obsidian";

import FlowershowSettings from "./FlowershowSettings";


export function validatePublishFrontmatter(frontMatter: FrontMatterCache): boolean {
    if (!frontMatter || !frontMatter["dgpublish"]) {
        new Notice("Note does not have the dgpublish: true set. Please add this and try again.")
        return false;
    }
    return true;
}

export function validateSettings(settings: FlowershowSettings): boolean {
    if (!settings.githubRepo) {
        new Notice("Config error: You need to define a GitHub repo in the plugin settings");
        return false;
    }
    if (!settings.githubUserName) {
        new Notice("Config error: You need to define a GitHub Username in the plugin settings");
        return false;
    }
    if (!settings.githubToken) {
        new Notice("Config error: You need to define a GitHub Token in the plugin settings");
        return false;
    }
    return true;
}
