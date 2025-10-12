# 💐 Obsidian Flowershow Plugin

Publish your Obsidian vault online easily, quickly and for free directly from your Obsidian vault using [Flowershow](https://flowershow.app).

## Getting Started

Here is how you can publish your Obsidian vault with Flowershow:

**STEP 1: Install the Flowershow Plugin**

1. Open Obsidian.
2. Go to Settings > Community Plugins.
3. Search for "Flowershow" and click Install.
4. Enable the plugin once installed.

**STEP 2: Sign Up for FlowerShow (Cloud)**

1. Sign up for a free account at https://flowershow.app/.
2. Log in using your GitHub account to your Flowershow dashboard.
3. If you don’t have a GitHub account, create one – it takes just a few seconds.

**STEP 3: Connect Flowershow to Your GitHub Repository**

1. Create a new Github repository (choose "with README.md"). This will act as a backup and sync point between Obsidian and Flowershow.
2. Go back to the Flowershow dashboard.
3. Select "Publish your markdown from GitHub" (https://cloud.flowershow.app/new) and select the repository you've just created.
4. Click "Create Site" — your Flowershow will set up your site in seconds!

**STEP 5: Sync Your Obsidian Vault & Publish**

1. Go back to Obsidian and go to the Flowershow plugin settings.
2. Enter the details of your GitHub repository and your Personal Access Token.
3. Use "Flowershow: Publish All" command or click on the Flowershow icon in the ribbon and select the notes to publish — and that’s it!

- **That's it! Your notes are now ready to be shared with the world! 💐**

Full docs at https://flowershow.app/docs/

### Publication Status Panel

The Flowershow icon in your ribbon opens the Publication Status panel, which shows:

* **Changed**: published files that has been edited locally
* **New**: new files in your Obsidian vault, that has not yet been published
* **Deleted**: files that has been deleted from your Obsidian vault, but are still published
* **Unchanged (select to unpublish)**: all the unchanged and published files 

### Plugin Settings

#### GitHub Authentication
- **Username**: Your GitHub username
- **Repository Name**: Name of the GitHub repository linked to your Flowershow site
- **Personal Access Token**: GitHub token with repository permissions (can be generated [here](https://github.com/settings/tokens/new?scopes=repo))
- **Branch**: The branch to publish to (defaults to main)
- **Test Connection**: Button to verify your GitHub repository access, permissions, and branch existence

#### Publishing Settings
- **Auto-merge Pull Requests**: Toggle to automatically merge pull requests after creation
- **Merge Commit Message**: Set a default message for merge commits
- **Exclude Patterns**: Regex patterns to exclude files and folders from being pushed to GitHub
  - Example: `^private/` excludes the private directory
  - Note: Files excluded here won't be pushed to GitHub. To exclude files from Flowershow publishing while keeping them in GitHub, use `config.json` instead

### Available Commands

* `Flowershow: Publish single note (with embeds)` - Publishes the current note with its embeds
* `Flowershow: Publish all` - Publishes all files in your vault

---

## Development

### Local testing

1. Clone the repository.
2. Run `npm i` to install dependencies.
3. Run `npm run build`.
4. Create the plugins directory in your Obsidian vault if it doesn't exist:
```sh
mkdir -p /path/to/obsidian-vault/.obsidian/plugins/flowershow
```
5. Create symlinks to the `main.js`, `manifest.json`, and `styles.css` files in your Obsidian plugins folder:

```sh
ln -s /path/to/obsidian-flowershow/main.js /path/to/obsidian-vault/.obsidian/plugins/flowershow/main.js
ln -s /path/to/obsidian-flowershow/manifest.json /path/to/obsidian-vault/.obsidian/plugins/flowershow/manifest.json
ln -s /path/to/obsidian-flowershow/styles.css /path/to/obsidian-vault/.obsidian/plugins/flowershow/styles.css
```

6. Reload Obsidian, go to Settings > Community Plugins, and enable the plugin.

### Rebuild on change 

If you want to automatically rebuild the plugin after you make any changes to the source code, run `npm run dev` instead of `npm run build`. This will start a server that will watch for changes to the source files and rebuild the plugin automatically. However, you will still need to reload Obsidian manually each time to see the changes.

### Hot reloading

If you want true hot reloading, i.e. without needing to disable/enable the plugin:

1. Install [Hot-Reload](https://github.com/pjeby/hot-reload) plugin:
  - download the .zip file from the latest release
  - extract the .zip file into your Obsidian vault's `.obsidian/plugins` folder
  - go to Settings > Community Plugins and enable the plugin
2. Instead of creating symlinks like in step 4 above, copy/clone the plugin project directly into your Obsidian vault's `.obsidian/plugins` folder:

``` sh
mv /path/to/obsidian-flowershow /path/to/obsidian-vault/.obsidian/plugins/
```

3. Run `npm i && npm run dev` in the plugin folder to start the development server.

Now, whenever you make any changes to the source code, two things will happen:
1. The plugin will be rebuilt automatically.
2. The Hot-Reload plugin will detect that the plugin has been rebuilt and will reload it in Obsidian.

## Shoutout

Big thanks to [Ole Eskild Steensen](https://github.com/oleeskild) for [his obsidian-digital-garden plugin](https://github.com/oleeskild/obsidian-digital-garden/tree/main) which inspired us and we got to build on.
