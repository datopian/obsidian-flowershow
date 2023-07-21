import { FrontMatterCache, Notice } from "obsidian";

import { FlowershowSettings } from "./FlowershowSettings";


export function validatePublishFrontmatter(frontMatter: FrontMatterCache): boolean {
    if (frontMatter && frontMatter["isDraft"]) {
        new Notice("Note is marked as draft. Please remove `isDraft` from the frontmatter and again.")
        return false;
    }
    return true;
}

export function validateSettings(settings: FlowershowSettings): boolean {
    if (!settings.R2url) {
        // TODO
        new Notice("Config error: You need to define an R2 worker URL");
        return false;
    }
    return true;
}
