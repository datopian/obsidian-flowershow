import { App, TFile } from "obsidian";
import { IFlowershowSettings } from "./settings";
import { Octokit } from "@octokit/rest";
import { validatePublishFrontmatter, validateSettings } from "./Validator";
import { FlowershowError } from "./utils";

export interface IPublisher {
    publishNote(file: TFile): Promise<void>;
    unpublishNote(notePath: string): Promise<void>;
    testConnection(): Promise<{ success: boolean; message: string }>;
}

export default class Publisher implements IPublisher {
    private app: App;
    private settings: IFlowershowSettings;
    private octokit: Octokit;

    constructor(app: App, settings: IFlowershowSettings) {
        this.app = app;
        this.settings = settings;
        this.octokit = new Octokit({
          auth: this.settings.githubToken,
          request: {
            // Force fresh network fetches
            fetch: (url: any, options: any) =>
              fetch(url, { ...options, cache: "no-store" }),
            // and disable ETag conditional requests
            // (Octokit won’t add If-None-Match if you pass an empty one)
            // You can also set this per-call instead of globally.
            // headers: { 'If-None-Match': '' } // optional global default
          }
         });
    }

  /** ---------- Public API ---------- */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!validateSettings(this.settings)) {
      return {
        success: false,
        message: "Please fill in all GitHub settings (username, repository, token, branch).",
      };
    }

    const owner = this.settings.githubUserName;
    const repo = this.settings.githubRepo;
    const branch = this.settings.branch?.trim() || "main";

    try {
      // Repo exists & we can read it
      const { data: repoData } = await this.octokit.repos.get({ owner, repo });

      // Check push permission
      const canPush =
        repoData.permissions?.push ||
        repoData.permissions?.admin ||
        repoData.permissions?.maintain;
      if (!canPush) {
        return {
          success: false,
          message: "Connected, but you don't have write access to this repository.",
        };
      }

      // Branch exists
      await this.octokit.repos.getBranch({ owner, repo, branch });

      return {
        success: true,
        message: `Connected. Repo "${owner}/${repo}" and branch "${branch}" are accessible with write permission.`,
      };
    } catch (error: any) {
      const status = error?.status;
      if (status === 404)
        return { success: false, message: "Repository or branch not found." };
      if (status === 401)
        return { success: false, message: "Authentication failed. Check your token." };
      if (status === 403)
        return {
          success: false,
          message:
            "Access denied (403). Check repository permissions or token scopes (need 'repo').",
        };
      return { success: false, message: `Connection failed: ${error?.message ?? error}` };
    }
  }

    async publishNote(file: TFile) {
      const cachedFile = this.app.metadataCache.getCache(file.path)
      if (!cachedFile) {
        throw new FlowershowError(`Note file ${file.path} not found!`)
      }

      const frontmatter = cachedFile.frontmatter

      if (frontmatter && !validatePublishFrontmatter(frontmatter)) {
          throw new FlowershowError("Can't publish note with `publish: false`")
      }

      // Publish file and its embeds
      const markdown = await this.app.vault.read(file);
      await this.uploadToGithub(file.path, Buffer.from(markdown).toString('base64'))

      // Track unique embeds for this publish run
      const uniqueEmbeds = new Map<string, TFile>();
      
      // First collect unique embeds
      cachedFile.embeds?.forEach(embed => {
        const embedTFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, markdown);
        if (embedTFile && !uniqueEmbeds.has(embedTFile.path)) {
          uniqueEmbeds.set(embedTFile.path, embedTFile);
        }
      });

      console.log({uniqueEmbeds})

      // Then upload unique embeds
      const embedPromises = Array.from(uniqueEmbeds.values()).map(async (embedTFile) => {
        let embedBase64: string;
        if (embedTFile.extension !== "md") {
          const embedBinary = await this.app.vault.readBinary(embedTFile);
          embedBase64 = Buffer.from(embedBinary).toString('base64');
        } else {
          // Note transclusions are not supported yet, but let's at least publish them
          // Flowershow then displays them as regular links
          const embedMarkdown = await this.app.vault.read(embedTFile);
          embedBase64 = Buffer.from(embedMarkdown).toString('base64');
        }
        await this.uploadToGithub(embedTFile.path, embedBase64);
      });

      if (embedPromises.length > 0) {
        await Promise.all(embedPromises);
      }
    }

    async unpublishNote(notePath: string) {
        await this.deleteFromGithub(notePath);
        // TODO what about embeds that are not used elsewhere?
    }

    private normalizePath(p: string): string {
      // Avoid leading slashes which GitHub treats oddly for content paths
      return p.replace(/^\/+/, "");
    }

    private async getFileSha(owner: string, repo: string, path: string): Promise<string | null> {
      const octo = this.octokit;
      try {
        const res = await octo.rest.repos.getContent({
          owner,
          repo,
          path: this.normalizePath(path),
          ref: this.settings.branch,
          headers: {
            'If-None-Match': ''
          }
         })
        // If it's a file, return its sha; if directory/array, treat as missing for single-file ops
        return Array.isArray(res.data) ? null : (res.data.type === "file" ? res.data.sha ?? null : null);
      } catch (e: any) {
        console.log(e)
        if (e?.status === 404) return null;
        throw e;
      }
    }

    // content is base64 string
    private async uploadToGithub(path: string, content: string) {
      console.log(`Uploading ${path}`)
      if (!validateSettings(this.settings)) throw new FlowershowError("Invalid Flowershow GitHub settings");

      const owner = this.settings.githubUserName;
      const repo = this.settings.githubRepo;
      const branch = this.settings.branch?.trim() || 'main';
      const filePath = this.normalizePath(path);
      const octo = this.octokit;
      const committer = {
          name: this.settings.githubUserName,
          email: `${this.settings.githubUserName}@users.noreply.github.com`
      };

      const createOrUpdate = async () => {
        const sha = await this.getFileSha(owner, repo, filePath);
        const message = `${sha ? "Update" : "Add"} content ${filePath}`;

        await octo.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message,
          content,
          sha: sha ?? undefined,
          branch,
          committer,
          author: committer,
          headers: {
            'If-None-Match': ''
          }
        })
      }

      try {
        await createOrUpdate()
      } catch (e) {
        await new Promise(r => setTimeout(createOrUpdate, 1000));
      }
    }

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

        // Handle both single file and directory responses
        const fileData = Array.isArray(response.data) ? null : response.data;
        
        if (response.status === 200 && fileData?.type === "file") {
            payload.sha = fileData.sha;
        }

        await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', payload);
    }
}
