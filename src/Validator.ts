
import { FrontMatterCache, Notice } from "obsidian";

export function vallidatePublishFrontmatter(frontMatter: FrontMatterCache): boolean {
    if (!frontMatter || !frontMatter["dgpublish"]) {
        new Notice("Note does not have the dgpublish: true set. Please add this and try again.")
        return false;
    }
    return true;
}