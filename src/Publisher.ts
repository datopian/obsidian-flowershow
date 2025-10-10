import { App, TFile } from "obsidian";
import { IFlowershowSettings } from "./settings";
import { Octokit } from "@octokit/rest";
import { validatePublishFrontmatter, validateSettings } from "./Validator";
import { FlowershowError } from "./utils";

export interface IPublisher {
    publishFile(file: TFile): Promise<void>;
    publishNote(file: TFile, withEmbeds: boolean): Promise<void>;
    unpublishFile(notePath: string): Promise<void>;
    testConnection(): Promise<{ success: boolean; message: string }>;
    getPublishStatus(): Promise<PublishStatus>
}

export interface PublishStatus {
    unchangedFiles: Array<TFile>;
    changedFiles: Array<TFile>;
    newFiles: Array<TFile>;
    deletedFiles: Array<string>;
}

export type PathToHashDict = { [key: string]: string };

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

  
  /** Publish any file */
  async publishFile(file: TFile) {
    const cachedFile = this.app.metadataCache.getCache(file.path)
    if (!cachedFile) {
      throw new FlowershowError(`Note file ${file.path} not found!`)
    }

    if (file.extension === "md" || file.extension === "mdx") {
      const frontmatter = cachedFile.frontmatter

      if (frontmatter && !validatePublishFrontmatter(frontmatter)) {
          throw new FlowershowError("Can't publish note with `publish: false`")
      }

      const markdown = await this.app.vault.cachedRead(file);
      await this.uploadToGithub(file.path, Buffer.from(markdown).toString('base64'))
    } else if (file.extension === "json" || file.extension === "css" || file.extension === "yaml" || file.extension === "yml") {
      const content = await this.app.vault.cachedRead(file);
      await this.uploadToGithub(file.path, Buffer.from(content).toString('base64'))
    } else {
      const content = await this.app.vault.readBinary(file);
      await this.uploadToGithub(file.path, Buffer.from(content).toString('base64'))
    }
  }


    /** Publish note and optionally its embeds */
    async publishNote(file: TFile, withEmbeds = true) {
      const cachedFile = this.app.metadataCache.getCache(file.path)
      if (!cachedFile) {
        throw new FlowershowError(`Note file ${file.path} not found!`)
      }

      const frontmatter = cachedFile.frontmatter

      if (frontmatter && !validatePublishFrontmatter(frontmatter)) {
          throw new FlowershowError("Can't publish note with `publish: false`")
      }

      // Publish file
      const markdown = await this.app.vault.read(file);
      await this.uploadToGithub(file.path, Buffer.from(markdown).toString('base64'))

      if (withEmbeds) {
        // Track unique embeds for this publish run
        const uniqueEmbeds = new Map<string, TFile>();
        
        // First collect unique embeds
        cachedFile.embeds?.forEach(embed => {
          const embedTFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, markdown);
          if (embedTFile && !uniqueEmbeds.has(embedTFile.path)) {
            uniqueEmbeds.set(embedTFile.path, embedTFile);
          }
        });

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
    }

    async unpublishFile(notePath: string) {
        await this.deleteFromGithub(notePath);
        // TODO what about embeds that are not used elsewhere?
    }

    async getPublishStatus(): Promise<PublishStatus> {
        const unchangedFiles: Array<TFile> = []; // published and unchanged files in vault
        const changedFiles: Array<TFile> = []; // published and changed files in vault
        const deletedFiles: Array<string> = []; // published but deleted files from vault
        const newFiles: Array<TFile> = []; // new, not yet published files

        const remoteFileHashes = await this.getRemoteFileHashes();
        console.log({remoteFileHashes})
        
        const localFiles = this.app.vault.getFiles();
        console.log({localFiles})
        
        const seenRemoteFiles = new Set<string>();
        
        // Find new and changed files
        for (const file of localFiles) {
            const normalizedPath = this.normalizePath(file.path);
            const remoteHash = remoteFileHashes[normalizedPath];
            
            if (!remoteHash) {
                // File exists locally but not remotely
                newFiles.push(file);
                continue;
            }
            
            // Mark this remote file as seen
            seenRemoteFiles.add(normalizedPath);
            
            let content: string;
            let encoding: "utf-8" | "base64";
            // Get local file content and calculate its hash
            if (isPlainTextExtension(file.extension)) {
              content = await this.app.vault.cachedRead(file); // string
              encoding = "utf-8";
            } else {
              const bytes = await this.app.vault.readBinary(file);
              content = Buffer.from(bytes).toString("base64");
              encoding = "base64";
            }

            const localHash = await this.octokit.rest.git.createBlob({
                owner: this.settings.githubUserName,
                repo: this.settings.githubRepo,
                content,
                encoding
            }).then(response => response.data.sha);

            console.log({path: file.path, remoteHash, localHash})
            
            // Compare hashes to determine if file has changed
            if (localHash === remoteHash) {
                unchangedFiles.push(file);
            } else {
                changedFiles.push(file);
            }
        }
        
        // Find deleted files (exist remotely but not locally)
        for (const [remotePath, _] of Object.entries(remoteFileHashes)) {
            if (!seenRemoteFiles.has(remotePath)) {
                deletedFiles.push(remotePath);
            }
        }

        return {unchangedFiles, changedFiles, deletedFiles, newFiles };
    }

    private normalizePath(p: string): string {
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
        if (e?.status === 404) return null;
        console.log({e})
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
        console.log({sha})
        const message = `${sha ? "Update" : "Add"} content ${filePath}`;
        console.log({message})

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

    /** Get dictionary of path->hash of all the files in the repo */
    async getRemoteFileHashes(): Promise<PathToHashDict> {
      // Get the full tree at HEAD (recursive) and bypass caches
      const { data } = await this.octokit.rest.git.getTree({
        owner: this.settings.githubUserName,
        repo: this.settings.githubRepo,
        tree_sha: "HEAD",
        recursive: "1",
        headers: {
          // Forces GitHub to skip ETag-based caching and return fresh data
          "If-None-Match": ""
        }
      });

      const files = data.tree ?? [];

      const notes: Array<{ path: string; sha: string }> = files
        .filter((file)  => !!file && file.type === "blob" && typeof file.path === "string"
        )
        .map(({ path, sha }) => ({ path, sha }));

      const hashes: PathToHashDict = notes.reduce<PathToHashDict>((dict, note) => {
        dict[note.path] = note.sha;
        return dict;
      }, {});

      return hashes;
    }
}

function isPlainTextExtension(ext: string) {
  return ["md", "json", "mdx", "yaml", "yml"].includes(ext)

}