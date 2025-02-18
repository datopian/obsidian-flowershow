# 🌷 Obsidian Flowershow Plugin

> ⚠️ **IMPORTANT**: This plugin is no longer compatible with self-hosted Flowershow sites. It is now exclusively used as a tool for Flowershow Cloud. [Sign up for Flowershow Cloud here](https://cloud.flowershow.app)

Obsidian Flowershow plugin for publishing with [Flowershow](https://flowershow.app) direct from your Obsidian vault.

## Getting Started

### Create your site

1. Go to our [GitHub template repository](https://github.com/flowershow/flowershow-cloud-template/tree/main) and click "Use this template" button to create a new repository (can be private if you want). It will be used to synchronize between obsidian and Flowershow (plus it provides a handy backup!).

2. Click [here](https://datahub.io/new) and create a new site from that repository.

3. When the site finishes syncing, click the "Visit" button to open it.

### Publish Obsidian vault

4. If you haven't already, install and enable the Flowershow plugin in your Obsidian vault.

5. In the plugin settings, enter your GitHub username, name of the repository you've created earlier and a GitHub Personal Access Token.

6. Click the Flowershow icon in Obsidian ribbon and use available options to synchronize your vault's content with your site.

**Done! Your notes are now ready to be shared with the world! 💐**

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
