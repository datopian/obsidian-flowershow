# 🌷 Obsidian Flowershow Plugin

> ⚠️ **IMPORTANT**: This plugin is no longer compatible with self-hosted Flowershow sites. It is now exclusively used as a tool for Flowershow Cloud. [Sign up for Flowershow Cloud here](https://cloud.flowershow.app)

Obsidian Flowershow plugin for publishing with [Flowershow](https://github.com/datopian/flowershow) direct from your Obsidian vault.

## Getting Started

### Initial Setup

1. First, you will need a GitHub account. If you don't have one yet, create one [here](https://github.com/signup).

2. Go to our [GitHub template](https://github.com/datopian/flowershow) and click on the green "Use this template" button. Then, select "Create a new repository" option from the dropdown.

3. Give your repository a name and choose whether you want to keep it private or public.

4. Once the repository is created, click on the "Create New Site" button in your dashboard and choose the newly created GitHub repository to use as a base for your site.

5. Wait for your repository to finish syncing with the content. Once done, you can click on the "Visit" button to see your created site.

6. Now you need to create a personal access token on GitHub, so that the plugin can sync your notes with the repository. Go to [this page](https://github.com/settings/tokens/new?scopes=repo) while logged in to GitHub. The correct settings should already be applied. If you don't want to generate this every few months, choose the "No expiration" option. Click the "Generate token" button, and copy the token you are presented with on the next page.

### Publishing Your Notes

1. Install and enable the Obsidian Flowershow plugin in your vault.

2. Open the plugin settings and provide:
   - Your GitHub username
   - The name of the GitHub repository you created earlier
   - The personal access token you generated

3. Close the settings and click on the Flowershow icon in the ribbon.

4. Click on "Sync all" to fully synchronize your site's content with your vault.

Done! Your notes are ready to be shared with the world! 💐

You can now start adding links as you usually would in Obsidian, with double square brackets like this: [[Some Other Note]]. You can also link to a specific header by using the syntax [[Some Other Note#A Header]].

### Publication Status Panel

The Flowershow icon in your ribbon opens the Publication Status panel, which shows:

* **Published**: the total number of notes that has been published to your Flowershow site
* **Changed**: the total number of __published__ notes that has been edited locally (+ button to publish them)
* **Unpublished**: the total number of new notes in your Obsidian vault, that has not yet been published to your site (+ button to publish them)
* **Deleted**: the total number of notes that has been deleted from your Obsidian vault, but are still published on your site (+ button to unpublish them)

### Available Commands

* `Flowershow: Publish Single Note` - Publishes the current note to your Flowershow site
* `Flowershow: Publish All Notes` - Publishes all notes in your vault to your Flowershow site

### Frontmatter settings

* `publish` - Set to `false` to keep the note unpublished from your Flowershow site (or unpublish it if it was published before).

## Development

### Local testing

1. Clone the repository.
2. Run `npm i` to install dependencies.
3. Run `npm run build`.
4. Create symlinks to the `main.js`, `manifest.json`, and `styles.css` files in your Obsidian plugins folder:

``` sh
ln -s /path/to/obsidian-flowershow/main.js /path/to/obsidian-vault/.obsidian/plugins/flowershow/main.js
ln -s /path/to/obsidian-flowershow/manifest.json /path/to/obsidian-vault/.obsidian/plugins/flowershow/manifest.json
ln -s /path/to/obsidian-flowershow/styles.css /path/to/obsidian-vault/.obsidian/plugins/flowershow/styles.css
```

5. Reload Obsidian, go to Settings > Community Plugins, and enable the plugin.

### Rebuild on change 

If you want to automatically rebuild the plugin after you make any changes to the source code, run `npm run dev` instead of `npm run build`. This will start a server that will watch for changes to the source files and rebuild the plugin automatically. However, you will still need to reload Obsidian manually each time to see the changes.

### Hot reloading

If you want true hot reloading, i.e. without needing to disable/enable the plugin:

1. Install [Hot-Reload](https://github.com/pjeby/hot-reload) plugin:
  - download the .zip file from the latest release
  - extract the .zip file into your Obsidian vault's `.obsidian/plugins` folder
  - go to Settings > Community Plugins and enable the plugin
2. Instead of creating symlinks like in step 4 above, copy the plugin files directly into your Obsidian vault's `.obsidian/plugins` folder:

``` sh
mv /path/to/obsidian-flowershow /path/to/obsidian-vault/.obsidian/plugins/
```

3. Run `npm run dev` to start the server.

Now, whenever you make any changes to the source code, two things will happen:
1. The plugin will be rebuilt automatically.
2. The Hot-Reload plugin will detect that the plugin has been rebuilt and will reload it in Obsidian.

## Shoutout

Big thanks to [Ole Eskild Steensen](https://github.com/oleeskild) for [his obsidian-digital-garden plugin](https://github.com/oleeskild/obsidian-digital-garden/tree/main) which inspired us and we got to build on.
